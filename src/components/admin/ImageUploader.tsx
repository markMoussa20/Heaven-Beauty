"use client";

import { useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
// Matches the server-side resize, so shrinking here loses nothing that would
// have been kept — it only keeps the form under the server action body limit.
const MAX_EDGE_PIXELS = 1600;
const WEBP_QUALITY = 0.85;

async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE_PIXELS / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
    // Browsers without WebP encoding fall back to PNG, which can be larger.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export function ImageUploader({
  name = "image",
  multiple,
}: {
  name?: string;
  multiple?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  return (
    <div className="grid gap-2">
      <input
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        multiple={multiple}
        name={name}
        onChange={async (event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []);
          if (!files.length) {
            setError(null);
            return;
          }

          setPreparing(true);
          const shrunk = await Promise.all(files.map(shrinkImage));
          setPreparing(false);

          if (shrunk.some((file) => file.size > MAX_BYTES)) {
            setError("Images must be 5MB or smaller.");
            input.value = "";
            return;
          }

          const transfer = new DataTransfer();
          shrunk.forEach((file) => transfer.items.add(file));
          input.files = transfer.files;
          setError(null);
        }}
        type="file"
      />
      {preparing ? <p className="text-xs text-zinc-500">Preparing images…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
