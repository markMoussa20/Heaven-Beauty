import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_IMAGES_BUCKET, getSafeProductImagePath } from "@/lib/storage/product-images";

export async function uploadProductImage({
  file,
  productSlug,
  kind,
}: {
  file: File;
  productSlug: string;
  kind: "main" | "gallery";
}) {
  const supabase = createAdminClient();
  const extension = getImageExtension(file);
  const path = getSafeProductImagePath({
    productSlug,
    kind,
    extension,
  });

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || `image/${extension}`,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return path;
}

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["avif", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return "webp";
}
