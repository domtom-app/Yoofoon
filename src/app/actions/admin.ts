"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { BUCKET, parsePhoto, uploadPhoto } from "@/lib/admin-storage";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminState = { error?: string; ok?: boolean };

const nameSchema = z.string().trim().min(2).max(60);
const idSchema = z.string().uuid();

function done(): AdminState {
  revalidatePath("/");
  revalidatePath("/parliament");
  revalidatePath("/admin");
  return { ok: true };
}

export async function saveCandidate(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };

  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: "الاسم غير صالح" };

  const photo = parsePhoto(formData.get("photo"));
  if (photo === "invalid") return { error: "صورة غير صالحة (حتى 4MB)" };

  const rawId = formData.get("id");
  const id = rawId ? idSchema.safeParse(rawId) : null;
  if (id && !id.success) return { error: "طلب غير صالح" };

  try {
    const admin = createAdminClient();

    if (!id) {
      const photoPath = photo ? await uploadPhoto(photo) : null;
      const { error } = await admin
        .from("candidates")
        .insert({ name: name.data, photo_path: photoPath });
      if (error) {
        if (photoPath) await admin.storage.from(BUCKET).remove([photoPath]);
        return { error: "تعذّر الحفظ" };
      }
      return done();
    }

    const { data: current } = await admin
      .from("candidates")
      .select("photo_path")
      .eq("id", id.data)
      .maybeSingle();
    if (!current) return { error: "غير موجود" };

    const update: { name: string; photo_path?: string } = { name: name.data };
    if (photo) update.photo_path = await uploadPhoto(photo);

    const { error } = await admin.from("candidates").update(update).eq("id", id.data);
    if (error) {
      if (update.photo_path) await admin.storage.from(BUCKET).remove([update.photo_path]);
      return { error: "تعذّر الحفظ" };
    }
    if (update.photo_path && current.photo_path) {
      await admin.storage.from(BUCKET).remove([current.photo_path]);
    }
    return done();
  } catch {
    return { error: "تعذّر الحفظ" };
  }
}

export async function deleteCandidate(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "طلب غير صالح" };

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("candidates")
      .select("photo_path")
      .eq("id", id.data)
      .maybeSingle();
    const { error } = await admin.from("candidates").delete().eq("id", id.data);
    if (error) return { error: "تعذّر الحذف" };
    if (data?.photo_path) await admin.storage.from(BUCKET).remove([data.photo_path]);
    return done();
  } catch {
    return { error: "تعذّر الحذف" };
  }
}

export async function resetVotes(): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  try {
    const { error } = await createAdminClient()
      .from("votes")
      .delete()
      .gte("created_at", "1970-01-01");
    if (error) return { error: "تعذّر التصفير" };
    return done();
  } catch {
    return { error: "تعذّر التصفير" };
  }
}
