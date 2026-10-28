import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET = "candidates";
const MAX_PHOTO = 4 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function parsePhoto(value: FormDataEntryValue | null): File | null | "invalid" {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!EXT[value.type] || value.size > MAX_PHOTO) return "invalid";
  return value;
}

export async function uploadPhoto(file: File, prefix = "") {
  const admin = createAdminClient();
  const path = `${prefix}${randomUUID()}.${EXT[file.type]}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string | null | undefined) {
  if (path) await createAdminClient().storage.from(BUCKET).remove([path]);
}
