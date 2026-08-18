import "server-only";

import { prepareImageForUpload } from "@/lib/admin/image-processing";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_IMAGES_BUCKET, getSafeProductImagePath } from "@/lib/storage/product-images";

export async function uploadProductImage({
  file,
  productSlug,
  kind,
  index,
}: {
  file: File;
  productSlug: string;
  kind: "main" | "gallery";
  index?: number;
}) {
  const image = await prepareImageForUpload(file);
  const supabase = createAdminClient();
  const path = getSafeProductImagePath({
    productSlug,
    kind,
    extension: image.extension,
    index,
  });

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, image.body, {
      cacheControl: "31536000",
      contentType: image.contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return path;
}
