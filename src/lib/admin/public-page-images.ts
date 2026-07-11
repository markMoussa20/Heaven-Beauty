import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRODUCT_IMAGES_BUCKET,
  getProductImageUrl,
} from "@/lib/storage/product-images";

export async function uploadPublicPageImage({
  file,
  kind,
  slug,
}: {
  file: File;
  kind: "primary" | "secondary";
  slug: string;
}) {
  validateImage(file);
  const supabase = createAdminClient();
  const extension = getImageExtension(file);
  const path = getSafePublicPageImagePath({ extension, kind, slug });

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || `image/${extension}`,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return getProductImageUrl(supabase, path);
}

function validateImage(file: File) {
  const allowed = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) throw new Error("Only AVIF, JPEG, PNG, and WebP images are allowed.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");
}

function getSafePublicPageImagePath({
  extension,
  kind,
  slug,
}: {
  extension: string;
  kind: "primary" | "secondary";
  slug: string;
}) {
  const safeSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `pages/${safeSlug || "page"}/${kind}-${Date.now()}.${extension}`;
}

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["avif", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return "webp";
}
