import "server-only";

import sharp from "sharp";

/**
 * Uploads used to land in Storage at their original resolution — often 2560px
 * WordPress exports — and were then served to every visitor at that size. Each
 * upload is now downscaled and re-encoded to WebP once, on the way in, so the
 * stored object is the size the storefront actually renders.
 */
const ALLOWED_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_EDGE_PIXELS = 1600;
const WEBP_QUALITY = 82;

export type PreparedImage = {
  body: Buffer;
  contentType: string;
  extension: string;
};

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only AVIF, JPEG, PNG, and WebP images are allowed.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  const original = Buffer.from(await file.arrayBuffer());

  try {
    const body = await sharp(original)
      // Honour EXIF orientation so phone photos are not stored sideways.
      .rotate()
      .resize({
        width: MAX_EDGE_PIXELS,
        height: MAX_EDGE_PIXELS,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    return { body, contentType: "image/webp", extension: "webp" };
  } catch (error) {
    // A file sharp cannot decode should still reach Storage rather than block
    // an admin save; it simply misses the size reduction.
    console.error("Image optimization failed; storing the original file.", error);
    return {
      body: original,
      contentType: file.type,
      extension: originalExtension(file),
    };
  }
}

function originalExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["avif", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return "webp";
}
