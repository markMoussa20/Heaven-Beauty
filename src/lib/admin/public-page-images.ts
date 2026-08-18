import "server-only";

import { prepareImageForUpload } from "@/lib/admin/image-processing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRODUCT_IMAGES_BUCKET,
  getProductImageUrl,
} from "@/lib/storage/product-images";

export async function uploadPublicPageImage({
  file,
  kind,
  slug,
  index,
}: {
  file: File;
  kind: "primary" | "secondary" | "gallery";
  slug: string;
  index?: number;
}) {
  const image = await prepareImageForUpload(file);
  const supabase = createAdminClient();
  const path = getSafePublicPageImagePath({
    extension: image.extension,
    kind,
    slug,
    index,
  });

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

  return getProductImageUrl(supabase, path);
}

function getSafePublicPageImagePath({
  extension,
  kind,
  slug,
  index,
}: {
  extension: string;
  kind: "primary" | "secondary" | "gallery";
  slug: string;
  index?: number;
}) {
  const safeSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const indexSuffix = kind === "gallery" && index !== undefined ? `-${index}` : "";

  return `pages/${safeSlug || "page"}/${kind}-${Date.now()}${indexSuffix}.${extension}`;
}
