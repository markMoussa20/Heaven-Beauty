import "server-only";

import { prepareImageForUpload } from "@/lib/admin/image-processing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRODUCT_IMAGES_BUCKET,
  getProductImageUrl,
} from "@/lib/storage/product-images";

export async function uploadPromoBannerImage(file: File) {
  const image = await prepareImageForUpload(file);
  const supabase = createAdminClient();
  const path = `banners/banner-${Date.now()}.${image.extension}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, image.body, {
      cacheControl: "31536000",
      contentType: image.contentType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return { path, url: getProductImageUrl(supabase, path) };
}

export async function removePromoBannerImage(path: string | null | undefined) {
  if (!path?.startsWith("banners/")) return;

  const { error } = await createAdminClient().storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) {
    console.error("Failed to remove promo banner image", { path, message: error.message });
  }
}
