"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

const MAX_SIDE = 1600;
const SKIP_BELOW = 1024 * 1024;

// Phone camera photos are often several MB, so large images are downscaled before upload.
async function shrink(file: File): Promise<File> {
  if (file.size <= SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PhotoField() {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);

  return (
    <label className="flex h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
      <ImagePlus className="size-5 text-primary" />
      <span className="truncate">{name ?? "الصورة"}</span>
      <input
        ref={input}
        type="file"
        name="photo"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return setName(null);
          const small = await shrink(file);
          if (small !== file && input.current) {
            const transfer = new DataTransfer();
            transfer.items.add(small);
            input.current.files = transfer.files;
          }
          setName(small.name);
        }}
      />
    </label>
  );
}
