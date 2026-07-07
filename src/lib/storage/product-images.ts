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

export function getSafeProductImagePath({
  productSlug,
  kind,
  extension = "webp",
  timestamp = Date.now(),
}: {
  productSlug: string;
  kind: "main" | "gallery";
  extension?: string;
  timestamp?: number;
}) {
  const safeSlug = productSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `products/${safeSlug || "product"}/${kind}-${timestamp}.${extension}`;
}
