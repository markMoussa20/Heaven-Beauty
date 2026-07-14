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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .or(`user_id.eq.${user?.id ?? ""},email.eq.${user?.email ?? ""}`)
    .maybeSingle();

  if (!adminUser) {
    await supabase.auth.signOut();
    return { error: "Not authorized." };
  }

  redirect("/admin/dashboard");
}

export async function logoutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
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
}: {
  table: string;
  id?: string | null;
  payload: Record<string, unknown>;
  path: string;
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
  redirect(path);
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
    "sort_order",
  ]);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false as const, message: "Check the country, product, price, and stock values.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  return upsertRecord({
    table: "country_items",
    id,
    payload,
    path: "/admin/country-items",
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
      "gmail_user",
      "gmail_app_password",
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
