import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export const PRODUCT_IMAGES_BUCKET = "product-images";

export function getProductImageUrl(
  supabase: SupabaseClient<Database>,
  path?: string | null,
) {
  if (!path) {
    return null;
  }

  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export function getPrimaryProductImagePath(product: {
  main_image_path?: string | null;
  product_images?: { storage_path: string; sort_order?: number | null }[] | null;
}) {
  if (product.main_image_path) {
    return product.main_image_path;
  }

  return [...(product.product_images ?? [])].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
  )[0]?.storage_path;
}

export function getSafeProductImagePath({
  productSlug,
  kind,
  extension = "webp",
  timestamp = Date.now(),
  index,
}: {
  productSlug: string;
  kind: "main" | "gallery";
  extension?: string;
  timestamp?: number;
  index?: number;
}) {
  const safeSlug = productSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const indexSuffix = kind === "gallery" && index !== undefined ? `-${index}` : "";

  return `products/${safeSlug || "product"}/${kind}-${timestamp}${indexSuffix}.${extension}`;
}
