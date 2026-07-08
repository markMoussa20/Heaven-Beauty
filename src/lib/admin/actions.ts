"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { uploadProductImage } from "@/lib/admin/product-images";
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

  if (!status) {
    return;
  }

  const supabase = adminDb();
  await supabase.from("orders").update({ status }).eq("id", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function deleteRow(table: string, id: string, path: string) {
  await requireAdmin();
  const supabase = adminDb();
  await supabase.from(table).delete().eq("id", id);
  revalidatePath(path);
}

export async function deactivateProduct(id: string) {
  await requireAdmin();
  const supabase = adminDb();
  await supabase.from("products").update({ is_active: false }).eq("id", id);
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
}) {
  await requireAdmin();
  const supabase = adminDb();

  if (id) {
    await supabase.from(table).update(payload).eq("id", id);
  } else {
    await supabase.from(table).insert(payload);
  }

  revalidatePath(path);
  redirect(path);
}

export async function saveCountry(id: string | null, formData: FormData) {
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
  await upsertRecord({ table: "countries", id, payload, path: "/admin/countries" });
}

export async function saveCategory(id: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const payload = {
    ...payloadFrom(formData, [
      "name",
      "slug",
      "parent_id",
      "image_url",
      "image_path",
      "sort_order",
      "is_active",
    ]),
    slug: text(formData, "slug") ?? slugify(name),
  };

  await upsertRecord({ table: "categories", id, payload, path: "/admin/categories" });
}

export async function saveShippingZone(id: string | null, formData: FormData) {
  const payload = payloadFrom(formData, [
    "country_id",
    "name",
    "code",
    "fee",
    "is_active",
    "sort_order",
  ]);
  await upsertRecord({ table: "shipping_zones", id, payload, path: "/admin/shipping" });
}

export async function saveCountryItem(id: string | null, formData: FormData) {
  const schema = z.object({
    country_id: z.string().min(1),
    product_id: z.string().min(1),
    price: z.number().min(0),
    sale_price: numberOptional.refine((value) => value === null || value >= 0),
    stock_quantity: numberOptional.refine((value) => value === null || value >= 0),
  });
  const payload = payloadFrom(formData, [
    "country_id",
    "product_id",
    "country_sku",
    "price",
    "sale_price",
    "stock_quantity",
    "is_visible",
    "is_featured",
    "sort_order",
  ]);
  schema.parse(payload);
  await upsertRecord({
    table: "country_items",
    id,
    payload,
    path: "/admin/country-items",
  });
}

export async function saveExchangeRate(id: string | null, formData: FormData) {
  const payload = payloadFrom(formData, [
    "base_currency_code",
    "target_currency_code",
    "rate",
    "source",
    "rate_date",
  ]);
  await upsertRecord({
    table: "exchange_rates",
    id,
    payload,
    path: "/admin/exchange-rates",
  });
}

export async function saveSiteContent(id: string | null, formData: FormData) {
  const payload = payloadFrom(formData, [
    "key",
    "title",
    "subtitle",
    "body",
    "cta_label",
    "cta_href",
    "image_url",
    "image_alt",
    "secondary_image_url",
    "secondary_image_alt",
    "marquee_text",
    "sort_order",
    "is_active",
  ]);

  await requireAdmin();
  const supabase = adminDb();

  if (id) {
    await supabase.from("site_content").update(payload).eq("id", id);
  } else {
    await supabase.from("site_content").insert(payload);
  }

  revalidatePath("/");
  revalidatePath("/admin/site-content");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function saveFooterSettings(id: string | null, formData: FormData) {
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
    await supabase.from("site_content").update(payload).eq("id", id);
  } else {
    await supabase.from("site_content").insert(payload);
  }

  revalidatePath("/");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function saveFooterLink(id: string | null, formData: FormData) {
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
    await supabase.from("footer_links").update(payload).eq("id", id);
  } else {
    await supabase.from("footer_links").insert(payload);
  }

  revalidatePath("/");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deleteFooterLink(id: string) {
  await requireAdmin();
  const supabase = adminDb();
  await supabase.from("footer_links").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/footer");
  revalidatePath("/admin/content");
}

export async function savePublicPageFaqItem(id: string | null, formData: FormData) {
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
    await supabase.from("public_page_faq_items").update(payload).eq("id", id);
  } else {
    await supabase.from("public_page_faq_items").insert(payload);
  }

  revalidatePath("/faq");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function deletePublicPageFaqItem(id: string) {
  await requireAdmin();
  const supabase = adminDb();
  await supabase.from("public_page_faq_items").delete().eq("id", id);
  revalidatePath("/faq");
  revalidatePath("/admin/content");
}

export async function savePublicPage(id: string | null, formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const payload = {
    ...payloadFrom(formData, [
      "slug",
      "title",
      "subtitle",
      "body",
      "cta_label",
      "cta_href",
      "image_url",
      "image_alt",
      "secondary_image_url",
      "secondary_image_alt",
      "sort_order",
      "is_active",
    ]),
    slug: text(formData, "slug") ?? slugify(title),
  };

  await requireAdmin();
  const supabase = adminDb();

  if (id) {
    await supabase.from("public_pages").update(payload).eq("id", id);
  } else {
    await supabase.from("public_pages").insert(payload);
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/${payload.slug}`);
  revalidatePath("/admin/pages");
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function saveProduct(id: string | null, formData: FormData) {
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
      "main_image_url",
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
    await supabase.from("products").update(payload).eq("id", productId);
  } else {
    const { data } = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    const createdProductId = (data as { id?: string } | null)?.id;

    if (!createdProductId) {
      throw new Error("Product was created but Supabase did not return an id.");
    }

    productId = createdProductId;
  }

  if (productId) {
    await supabase.from("product_categories").delete().eq("product_id", productId);
    if (selectedCategories.length) {
      await supabase.from("product_categories").insert(
        selectedCategories.map((categoryId) => ({
          product_id: productId,
          category_id: categoryId,
        })),
      );
    }

    for (const [index, file] of gallery.entries()) {
      if (file instanceof File && file.size > 0) {
        const storagePath = await uploadProductImage({
          file,
          productSlug: slug,
          kind: "gallery",
          index,
        });
        await supabase.from("product_images").insert({
          product_id: productId,
          storage_path: storagePath,
          sort_order: index,
          is_primary: false,
        });
      }
    }
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProductImage(id: string, storagePath: string, productId: string) {
  await requireAdmin();
  const supabase = adminDb();
  await supabase.storage.from("product-images").remove([storagePath]);
  await supabase.from("product_images").delete().eq("id", id);
  revalidatePath(`/admin/products/${productId}`);
}
