import "server-only";

import { prepareImageForUpload } from "@/lib/admin/image-processing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRODUCT_IMAGES_BUCKET,
  getProductImageUrl,
} from "@/lib/storage/product-images";

export async function uploadCategoryImage({
  file,
  slug,
}: {
  file: File;
  slug: string;
}) {
  const image = await prepareImageForUpload(file);
  const supabase = createAdminClient();
  const path = getSafeCategoryImagePath({ extension: image.extension, slug });

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

function getSafeCategoryImagePath({
  extension,
  slug,
}: {
  extension: string;
  slug: string;
}) {
  const safeSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `categories/${safeSlug || "category"}/main-${Date.now()}.${extension}`;
}
