"use client";

import { useState } from "react";

export function ImageUploader({
  name = "image",
  multiple,
}: {
  name?: string;
  multiple?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <input
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        multiple={multiple}
        name={name}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          const tooLarge = files.find((file) => file.size > 5 * 1024 * 1024);
          setError(tooLarge ? "Images must be 5MB or smaller." : null);
          if (tooLarge) {
            event.target.value = "";
          }
        }}
        type="file"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
