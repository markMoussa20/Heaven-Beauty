"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { uploadCategoryImage } from "@/lib/admin/category-images";
import { uploadProductImage } from "@/lib/admin/product-images";
import { uploadPublicPageImage } from "@/lib/admin/public-page-images";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { asBoolean, asNumber, slugify } from "@/lib/utils";
import { submitOrderToWakilni } from "@/lib/wakilni/orders";
import { getWakilniCountryConfig, getWakilniToken } from "@/lib/wakilni/client";

type LooseQuery = {
  delete: () => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  insert: (payload: unknown) => LooseQuery;
  select: (columns?: string) => LooseQuery;
  single: () => Promise<{ data: unknown; error: { message: string } | null }>;
  update: (payload: unknown) => LooseQuery;
  then: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>["then"];
};

type LooseSupabase = {
  from: (table: string) => LooseQuery;
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<unknown>;
    };
  };
};

function adminDb() {
  return createAdminClient() as unknown as LooseSupabase;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AdminActionState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;

const uuidSchema = z.string().uuid();
const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const deleteTables = new Set(["categories", "shipping_zones", "exchange_rates", "country_items"]);

function failed(message = "The change could not be saved. Please try again."): AdminActionState {
  return { ok: false, message };
}

async function runMutation(query: LooseQuery, context: string) {
  const { error } = await query;
  if (error) {
    console.error(`Admin mutation failed: ${context}`, { code: error.code, message: error.message });
    return false;
  }
  return true;
}

export async function loginAdmin(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { data: signInData, error } =
    await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  const user = signInData.user;
  if (!user) {
    await supabase.auth.signOut();
    return { error: "Login succeeded, but no user session was returned." };
  }

  const adminSupabase = createAdminClient();
  let { data: adminUser, error: adminLookupError } = await adminSupabase
    .from("admin_users")
    .select("id,is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  // Allow legacy admin rows during the short window before the additive
  // admin-user management migration is applied.
  if (adminLookupError?.code === "42703") {
    const legacyResult = await adminSupabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    adminUser = legacyResult.data as typeof adminUser;
    adminLookupError = legacyResult.error;
  }

  if (adminLookupError) {
    console.error("Admin authorization lookup failed", {
      code: adminLookupError.code,
      message: adminLookupError.message,
      userId: user.id,
    });
    await supabase.auth.signOut();
    return { error: "Admin authorization could not be checked. Please try again." };
  }

  if (!adminUser) {
    await supabase.auth.signOut();
    return { error: "Not authorized." };
  }

  if ((adminUser as { is_active?: boolean }).is_active === false) {
    await supabase.auth.signOut();
    return { error: "This admin account is inactive. Contact another administrator." };
  }

  redirect("/admin/dashboard");
}

export async function logoutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const adminUserSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the admin's name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128).optional(),
  isActive: z.boolean(),
});

function adminUserErrorMessage(error: { message: string } | null | undefined) {
  const message = error?.message ?? "";
  if (/already|registered|duplicate|unique/i.test(message)) {
    return "An account with this email address already exists.";
  }
  return message || "The admin account could not be saved. Please try again.";
}

export async function saveAdminUser(
  id: string | null,
  _: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const passwordValue = String(formData.get("password") ?? "");
  const parsed = adminUserSchema.safeParse({
    fullName: formData.get("full_name"),
    email: formData.get("email"),
    password: passwordValue || undefined,
    isActive: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the name, email, and password fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const session = await requireAdmin();
  const supabase = createAdminClient();
  const values = parsed.data;

  if (!id) {
    if (!values.password) {
      return failed("A password is required when creating an admin account.");
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: values.email,
      password: values.password,
      email_confirm: true,
      user_metadata: { full_name: values.fullName },
    });

    if (createError || !created.user) {
      return failed(adminUserErrorMessage(createError));
    }

    const { error: insertError } = await supabase.from("admin_users").insert({
      user_id: created.user.id,
      email: values.email,
      full_name: values.fullName,
      is_active: values.isActive,
    } as never);

    if (insertError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return failed(adminUserErrorMessage(insertError));
    }
  } else {
    if (!uuidSchema.safeParse(id).success) return failed("The admin account identifier is invalid.");

    const { data: existing, error: lookupError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    const existingAdmin = existing as { user_id: string | null } | null;
    if (lookupError || !existingAdmin?.user_id) {
      return failed("The admin account could not be found.");
    }

    if (existingAdmin.user_id === session.userId && !values.isActive) {
      return failed("You cannot deactivate the account you are currently using.");
    }

    const authChanges: {
      email: string;
      email_confirm: boolean;
      password?: string;
      user_metadata: { full_name: string };
    } = {
      email: values.email,
      email_confirm: true,
      user_metadata: { full_name: values.fullName },
    };
    if (values.password) authChanges.password = values.password;

    const { error: authError } = await supabase.auth.admin.updateUserById(existingAdmin.user_id, authChanges);
    if (authError) return failed(adminUserErrorMessage(authError));

    const { error: updateError } = await supabase
      .from("admin_users")
      .update({
        email: values.email,
        full_name: values.fullName,
        is_active: values.isActive,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", id);

    if (updateError) return failed(adminUserErrorMessage(updateError));
  }

  revalidatePath("/admin/admin-users");
  redirect("/admin/admin-users");
}

export async function setAdminUserActive(id: string, active: boolean) {
  const session = await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return;

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  const targetAdmin = target as { user_id: string | null } | null;
  if (!targetAdmin || (targetAdmin.user_id === session.userId && !active)) return;

  const { error } = await supabase
    .from("admin_users")
    .update({ is_active: active, updated_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) console.error("Updating admin status failed", { id, message: error.message });
  revalidatePath("/admin/admin-users");
}

export async function deleteAdminUser(id: string) {
  const session = await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return;

  const supabase = createAdminClient();
  const { data: target, error: lookupError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  const targetAdmin = target as { user_id: string | null } | null;
  if (lookupError || !targetAdmin || targetAdmin.user_id === session.userId) return;

  if (targetAdmin.user_id) {
    const { error } = await supabase.auth.admin.deleteUser(targetAdmin.user_id);
    if (error) console.error("Deleting admin auth user failed", { id, message: error.message });
  } else {
    const { error } = await supabase.from("admin_users").delete().eq("id", id);
    if (error) console.error("Deleting admin user failed", { id, message: error.message });
  }
  revalidatePath("/admin/admin-users");
}

export async function updateOrderStatus(orderId: string, formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status") ?? "");

  if (!uuidSchema.safeParse(orderId).success || !z.enum(orderStatuses).safeParse(status).success) return;

  const supabase = adminDb();
  if (!(await runMutation(supabase.from("orders").update({ status }).eq("id", orderId), "update order status"))) return;
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function retryWakilniOrder(orderId: string) {
  await requireAdmin();
  if (!uuidSchema.safeParse(orderId).success) return;
  try {
    await submitOrderToWakilni(orderId);
  } catch (error) {
    console.error("Manual Wakilni retry failed", { orderId, error });
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

const wakilniSettingsSchema = z.object({
  countryId: z.string().uuid(),
  enabled: z.boolean(),
  baseUrl: z.union([z.literal(""), z.string().url()]),
  pickupLocationId: z.number().int().nonnegative(),
  pickupLongitude: z.number(),
  pickupLatitude: z.number(),
  pickupFloor: z.number().int(),
  pickupArea: z.string().max(255),
  currencyId: z.number().int().nonnegative(),
  cashCollectionTypeId: z.number().int().positive(),
  packageTypeId: z.number().int().positive(),
  defaultReceiverGender: z.number().int().positive(),
  express: z.boolean(),
});

function requiredNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "");
  return raw === "" ? Number.NaN : Number(raw);
}

export async function saveWakilniSettings(formData: FormData) {
  await requireAdmin();
  const parsed = wakilniSettingsSchema.safeParse({
    countryId: formData.get("country_id"),
    enabled: formData.get("enabled") === "on",
    baseUrl: String(formData.get("base_url") ?? "").trim(),
    pickupLocationId: requiredNumber(formData, "pickup_location_id"),
    pickupLongitude: requiredNumber(formData, "pickup_longitude"),
    pickupLatitude: requiredNumber(formData, "pickup_latitude"),
    pickupFloor: requiredNumber(formData, "pickup_floor"),
    pickupArea: String(formData.get("pickup_area") ?? "").trim(),
    currencyId: requiredNumber(formData, "currency_id"),
    cashCollectionTypeId: requiredNumber(formData, "cash_collection_type_id"),
    packageTypeId: requiredNumber(formData, "package_type_id"),
    defaultReceiverGender: requiredNumber(formData, "default_receiver_gender"),
    express: formData.get("express") === "on",
  });
  if (!parsed.success) {
    console.error("Invalid Wakilni settings", z.flattenError(parsed.error));
    return;
  }

  const supabase = createAdminClient() as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
  const value = parsed.data;
  const { error } = await supabase.rpc("save_wakilni_country_settings", {
    p_country_id: value.countryId,
    p_enabled: value.enabled,
    p_base_url: value.baseUrl,
    p_pickup_location_id: value.pickupLocationId,
    p_pickup_longitude: value.pickupLongitude,
    p_pickup_latitude: value.pickupLatitude,
    p_pickup_floor: value.pickupFloor,
    p_pickup_area: value.pickupArea,
    p_currency_id: value.currencyId,
    p_cash_collection_type_id: value.cashCollectionTypeId,
    p_package_type_id: value.packageTypeId,
    p_default_receiver_gender: value.defaultReceiverGender,
    p_express: value.express,
    p_api_key: String(formData.get("api_key") ?? ""),
    p_api_secret: String(formData.get("api_secret") ?? ""),
    p_webhook_secret: String(formData.get("webhook_secret") ?? ""),
  });
  if (error) console.error("Saving Wakilni settings failed", error);
  revalidatePath("/admin/wakilni");
}

export async function testWakilniConnection(countryCode: string, settingsId: string) {
  await requireAdmin();
  if (!uuidSchema.safeParse(settingsId).success) return;
  let status = "failed";
  let message = "Connection failed.";
  try {
    const account = await getWakilniCountryConfig(countryCode);
    if (!account) throw new Error("This country is disabled.");
    await getWakilniToken(account);
    status = "success";
    message = "Authentication succeeded.";
  } catch (error) {
    message = error instanceof Error ? error.message.slice(0, 1000) : message;
  }
  const supabase = createAdminClient();
  await supabase
    .from("wakilni_country_settings")
    .update({
      last_test_status: status,
      last_test_message: message,
      last_tested_at: new Date().toISOString(),
    } as never)
    .eq("id", settingsId);
  revalidatePath("/admin/wakilni");
}

export async function deleteRow(table: string, id: string, path: string) {
  await requireAdmin();
  if (!deleteTables.has(table) || !uuidSchema.safeParse(id).success) return;
  const supabase = adminDb();
  if (!(await runMutation(supabase.from(table).delete().eq("id", id), `delete ${table}`))) return;
  revalidatePath(path);
}

export async function deactivateProduct(id: string) {
  await requireAdmin();
  const supabase = adminDb();
  if (!uuidSchema.safeParse(id).success) return;
  if (!(await runMutation(supabase.from("products").update({ is_active: false }).eq("id", id), "deactivate product"))) return;
  revalidatePath("/admin/products");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return;
  const supabase = adminDb();
  const { data: productData } = await supabase
    .from("products")
    .select("main_image_path, gallery_image_paths")
    .eq("id", id)
    .single();
  const { data: imageData } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);

  if (!(await runMutation(supabase.from("products").delete().eq("id", id), "delete product"))) return;

  const product = productData as { main_image_path?: string | null; gallery_image_paths?: string[] | null } | null;
  const images = (imageData ?? []) as Array<{ storage_path?: string | null }>;
  const paths = [
    product?.main_image_path,
    ...(product?.gallery_image_paths ?? []),
    ...images.map((image) => image.storage_path),
  ].filter((path): path is string => Boolean(path));
  if (paths.length) {
    await supabase.storage.from("product-images").remove([...new Set(paths)]);
  }
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

const numberOptional = z.union([z.number(), z.null()]);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null || value === "" ? null : String(value);
}

function payloadFrom(formData: FormData, fields: string[]) {
  return Object.fromEntries(
    fields.map((field) => {
      if (
        field.startsWith("is_") ||
        field.startsWith("show_") ||
        field.includes("enabled") ||
        field.includes("use_")
      ) {
        return [field, asBoolean(formData.get(field))];
      }

      if (
        field.includes("fee") ||
        field.includes("price") ||
        field.includes("rate") ||
        field.includes("quantity") ||
        field.includes("sort_order")
      ) {
        return [field, asNumber(formData.get(field))];
      }

      return [field, text(formData, field)];
    }),
  );
}

async function upsertRecord({
  table,
  id,
  payload,
  path,
  redirectPath,
}: {
  table: string;
  id?: string | null;
  payload: Record<string, unknown>;
  path: string;
  redirectPath?: string;
}): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = adminDb();

  if (id) {
    if (!uuidSchema.safeParse(id).success) return failed("The record identifier is invalid.");
    if (!(await runMutation(supabase.from(table).update(payload).eq("id", id), `update ${table}`))) return failed();
  } else {
    if (!(await runMutation(supabase.from(table).insert(payload), `insert ${table}`))) return failed();
  }

  revalidatePath(path);
  redirect(redirectPath ?? path);
}

export async function saveCountry(id: string | null, _: AdminActionState, formData: FormData) {
  const payload = payloadFrom(formData, [
    "name",
    "code",
    "currency_code",
    "currency_symbol",
    "phone",
    "whatsapp",
    "domain",
    "is_active",
    "use_shipping_zones",
    "global_delivery_fee",
    "delivery_label",
    "price_conversion_enabled",
    "price_conversion_base_currency",
  ]);
  return upsertRecord({ table: "countries", id, payload, path: "/admin/countries" });
}

export async function saveCategory(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const name = String(formData.get("name") ?? "");
  const slug = text(formData, "slug") ?? slugify(name);
  const payload: Record<string, unknown> = {
    ...payloadFrom(formData, ["name", "slug", "parent_id", "sort_order", "is_active"]),
    slug,
  };

  await requireAdmin();
  const image = formData.get("category_image");

  if (image instanceof File && image.size > 0) {
    const uploaded = await uploadCategoryImage({ file: image, slug });
    payload.image_path = uploaded.path;
    payload.image_url = uploaded.url;
  }

  return upsertRecord({ table: "categories", id, payload, path: "/admin/categories" });
}

export async function saveShippingZone(id: string | null, _: AdminActionState, formData: FormData) {
  const payload = payloadFrom(formData, [
    "country_id",
    "name",
    "code",
    "fee",
    "is_active",
    "sort_order",
  ]);
  return upsertRecord({ table: "shipping_zones", id, payload, path: "/admin/shipping" });
}

export async function saveCountryItem(id: string | null, _: AdminActionState, formData: FormData) {
  const schema = z.object({
    country_id: z.string().min(1),
    product_id: z.string().min(1),
    price: z.number().min(0),
    stock_quantity: numberOptional.refine((value) => value === null || value >= 0),
  });
  const payload = payloadFrom(formData, [
    "country_id",
    "product_id",
    "country_sku",
    "price",
    "stock_quantity",
    "is_visible",
    "is_featured",
    "show_in_home_shop_popup",
    "sort_order",
  ]);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false as const, message: "Check the country, product, price, and stock values.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const requestedReturnPath = String(formData.get("return_to") ?? "");
  const countryItemsPath = "/admin/country-items";
  const returnPath =
    requestedReturnPath === countryItemsPath ||
    requestedReturnPath.startsWith(`${countryItemsPath}?`)
      ? requestedReturnPath
      : countryItemsPath;

  return upsertRecord({
    table: "country_items",
    id,
    payload,
    path: "/admin/country-items",
    redirectPath: returnPath,
  });
}

export async function saveExchangeRate(id: string | null, _: AdminActionState, formData: FormData) {
  const payload = payloadFrom(formData, [
    "base_currency_code",
    "target_currency_code",
    "rate",
    "source",
    "rate_date",
  ]);
  return upsertRecord({
    table: "exchange_rates",
    id,
    payload,
    path: "/admin/exchange-rates",
  });
}

export async function saveSiteContent(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const key = text(formData, "key") ?? "content";
  const payload: Record<string, unknown> = payloadFrom(formData, [
    "key",
    "title",
    "subtitle",
    "body",
    "cta_label",
    "cta_href",
    "image_alt",
    "secondary_image_alt",
    "marquee_text",
    "sort_order",
    "is_active",
  ]);

  await requireAdmin();
  const supabase = adminDb();
  const primaryImage = formData.get("content_primary_image");
  const secondaryImage = formData.get("content_secondary_image");
  const galleryImages = formData.getAll("content_gallery_images");
  const existingGalleryUrls = formData
    .getAll("existing_gallery_image_url")
    .map(String)
    .filter(Boolean);

  if (primaryImage instanceof File && primaryImage.size > 0) {
    payload.image_url = await uploadPublicPageImage({
      file: primaryImage,
      kind: "primary",
      slug: key,
    });
  }

  if (secondaryImage instanceof File && secondaryImage.size > 0) {
    payload.secondary_image_url = await uploadPublicPageImage({
      file: secondaryImage,
      kind: "secondary",
      slug: key,
    });
  }

  const newGalleryUrls: string[] = [];
  for (const [index, file] of galleryImages.entries()) {
    if (file instanceof File && file.size > 0) {
      const uploadedUrl = await uploadPublicPageImage({
        file,
        kind: "gallery",
        slug: key,
        index,
      });
      if (uploadedUrl) {
        newGalleryUrls.push(uploadedUrl);
      }
    }
  }
  if (newGalleryUrls.length > 0 || formData.has("gallery_section_present")) {
    payload.gallery_image_urls = [...existingGalleryUrls, ...newGalleryUrls];
  }

  if (id) {
    if (!(await runMutation(supabase.from("site_content").update(payload).eq("id", id), "update site content"))) return failed();
  } else {
    if (!(await runMutation(supabase.from("site_content").insert(payload), "insert site content"))) return failed();
  }

  revalidatePath("/");
  revalidatePath("/admin/site-content");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function saveFooterSettings(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const payload = {
    ...payloadFrom(formData, [
      "title",
      "subtitle",
      "body",
      "cta_label",
      "cta_href",
      "marquee_text",
      "is_active",
    ]),
    key: "footer_settings",
  };

  await requireAdmin();
  const supabase = adminDb();

  if (id) {
    if (!(await runMutation(supabase.from("site_content").update(payload).eq("id", id), "update footer settings"))) return failed();
  } else {
    if (!(await runMutation(supabase.from("site_content").insert(payload), "insert footer settings"))) return failed();
  }

  revalidatePath("/");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function saveFooterLink(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const payload = payloadFrom(formData, [
    "group_key",
    "label",
    "href",
    "sort_order",
    "is_active",
    "is_external",
  ]);

  await requireAdmin();
  const supabase = adminDb();

  if (id) {
    if (!(await runMutation(supabase.from("footer_links").update(payload).eq("id", id), "update footer link"))) return failed();
  } else {
    if (!(await runMutation(supabase.from("footer_links").insert(payload), "insert footer link"))) return failed();
  }

  revalidatePath("/");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteFooterLink(id: string) {
  await requireAdmin();
  const supabase = adminDb();
  if (!(await runMutation(supabase.from("footer_links").delete().eq("id", id), "delete footer link"))) return;
  revalidatePath("/");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
}

export async function savePublicPageFaqItem(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const payload = payloadFrom(formData, [
    "page_slug",
    "group_title",
    "question",
    "answer",
    "sort_order",
    "is_active",
  ]);

  await requireAdmin();
  const supabase = adminDb();

  if (id) {
    if (!(await runMutation(supabase.from("public_page_faq_items").update(payload).eq("id", id), "update FAQ"))) return failed();
  } else {
    if (!(await runMutation(supabase.from("public_page_faq_items").insert(payload), "insert FAQ"))) return failed();
  }

  revalidatePath("/faq");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deletePublicPageFaqItem(id: string) {
  await requireAdmin();
  const supabase = adminDb();
  if (!(await runMutation(supabase.from("public_page_faq_items").delete().eq("id", id), "delete FAQ"))) return;
  revalidatePath("/faq");
  revalidatePath("/admin/content");
}

export async function saveOrderNotificationSettings(id: string | null, _: AdminActionState, formData: FormData) {
  const payload = {
    ...payloadFrom(formData, [
      "is_active",
      "customer_email_enabled",
      "internal_email_enabled",
      "sms_enabled",
      "sender_name",
      "sender_email",
      "reply_to_email",
      "smtp_username",
      "smtp_password",
      "smtp_host",
      "smtp_port",
      "smtp_secure",
      "callmebot_api_key",
      "callmebot_phone",
      "callmebot_endpoint_template",
    ]),
    key: "default",
  };

  return upsertRecord({
    table: "order_notification_settings",
    id,
    payload,
    path: "/admin/notifications",
  });
}

export async function saveOrderNotificationRecipient(
  id: string | null,
  _: AdminActionState,
  formData: FormData,
) {
  const payload = payloadFrom(formData, [
    "name",
    "email",
    "sort_order",
    "is_active",
    "receive_order_email",
  ]);

  return upsertRecord({
    table: "order_notification_recipients",
    id,
    payload,
    path: "/admin/notifications",
  });
}

export async function deleteOrderNotificationRecipient(id: string) {
  await requireAdmin();
  const supabase = adminDb();
  if (!(await runMutation(supabase.from("order_notification_recipients").delete().eq("id", id), "delete notification recipient"))) return;
  revalidatePath("/admin/notifications");
}

export async function saveOrderNotificationTemplate(
  id: string | null,
  _: AdminActionState,
  formData: FormData,
) {
  const payload = payloadFrom(formData, [
    "key",
    "subject",
    "body",
    "is_active",
  ]);

  return upsertRecord({
    table: "order_notification_templates",
    id,
    payload,
    path: "/admin/notifications",
  });
}

export async function savePublicPage(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const title = String(formData.get("title") ?? "");
  const slug = text(formData, "slug") ?? slugify(title);
  const payload: Record<string, unknown> = {
    ...payloadFrom(formData, [
      "slug",
      "title",
      "subtitle",
      "body",
      "cta_label",
      "cta_href",
      "image_alt",
      "secondary_image_alt",
      "sort_order",
      "is_active",
    ]),
    slug,
  };

  await requireAdmin();
  const supabase = adminDb();
  const primaryImage = formData.get("primary_image");
  const secondaryImage = formData.get("secondary_image");

  if (primaryImage instanceof File && primaryImage.size > 0) {
    payload.image_url = await uploadPublicPageImage({
      file: primaryImage,
      kind: "primary",
      slug,
    });
  }

  if (secondaryImage instanceof File && secondaryImage.size > 0) {
    payload.secondary_image_url = await uploadPublicPageImage({
      file: secondaryImage,
      kind: "secondary",
      slug,
    });
  }

  if (id) {
    if (!(await runMutation(supabase.from("public_pages").update(payload).eq("id", id), "update public page"))) return failed();
  } else {
    if (!(await runMutation(supabase.from("public_pages").insert(payload), "insert public page"))) return failed();
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/${payload.slug}`);
  revalidatePath("/admin/pages");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function saveProduct(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = adminDb();
  const name = String(formData.get("name") ?? "");
  const slug = text(formData, "slug") ?? slugify(name);
  const image = formData.get("image");
  const gallery = formData.getAll("gallery");
  const selectedCategories = formData
    .getAll("category_ids")
    .map(String)
    .filter(Boolean);
  const payload: Record<string, unknown> = {
    ...payloadFrom(formData, [
      "name",
      "slug",
      "short_description",
      "description",
      "ingredients",
      "brand",
      "base_sku",
      "is_active",
    ]),
    slug,
  };

  if (image instanceof File && image.size > 0) {
    payload.main_image_path = await uploadProductImage({
      file: image,
      productSlug: slug,
      kind: "main",
    });
  }

  let productId = id;
  if (productId) {
    if (!(await runMutation(supabase.from("products").update(payload).eq("id", productId), "update product"))) return failed();
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    const createdProductId = (data as { id?: string } | null)?.id;

    if (error || !createdProductId) { console.error("Product insert failed", error); return failed(); }

    productId = createdProductId;
  }

  if (productId) {
    if (!(await runMutation(supabase.from("product_categories").delete().eq("product_id", productId), "replace product categories"))) return failed();
    if (selectedCategories.length) {
      if (!(await runMutation(supabase.from("product_categories").insert(
        selectedCategories.map((categoryId) => ({
          product_id: productId,
          category_id: categoryId,
        })),
      ), "insert product categories"))) return failed();
    }

    for (const [index, file] of gallery.entries()) {
      if (file instanceof File && file.size > 0) {
        const storagePath = await uploadProductImage({
          file,
          productSlug: slug,
          kind: "gallery",
          index,
        });
        if (!(await runMutation(supabase.from("product_images").insert({
          product_id: productId,
          storage_path: storagePath,
          sort_order: index,
          is_primary: false,
        }), "insert product image"))) return failed();
      }
    }
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProductImage(id: string, storagePath: string, productId: string) {
  await requireAdmin();
  const supabase = adminDb();
  const storageResult = await supabase.storage.from("product-images").remove([storagePath]) as { error?: { message: string } | null };
  if (storageResult.error) { console.error("Product image storage deletion failed", storageResult.error); return; }
  if (!(await runMutation(supabase.from("product_images").delete().eq("id", id), "delete product image"))) return;
  revalidatePath(`/admin/products/${productId}`);
}
