"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { parsePhoto, removePhoto, uploadPhoto } from "@/lib/admin-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { HEADING_MAX } from "@/lib/voting";
import type { AdminState } from "@/app/actions/admin";

const idSchema = z.string().uuid();
const nameSchema = z.string().trim().min(2).max(60);
const govSchema = z.coerce.number().int().min(1).max(1000);

function done(): AdminState {
  revalidatePath("/");
  revalidatePath("/parliament");
  revalidatePath("/admin");
  return { ok: true };
}

export async function saveMember(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };

  const name = nameSchema.safeParse(formData.get("name"));
  const gov = govSchema.safeParse(formData.get("governorateId"));
  const district = idSchema.safeParse(formData.get("districtId"));
  if (!name.success) return { error: "الاسم غير صالح" };
  if (!gov.success) return { error: "اختر المحافظة" };
  if (!district.success) return { error: "اختر الدائرة" };

  const photo = parsePhoto(formData.get("photo"));
  if (photo === "invalid") return { error: "صورة غير صالحة (حتى 4MB)" };

  const rawId = formData.get("id");
  const id = rawId ? idSchema.safeParse(rawId) : null;
  if (id && !id.success) return { error: "طلب غير صالح" };

  const admin = createAdminClient();
  let newPath: string | null = null;
  try {
    const { data: okDistrict } = await admin
      .from("districts")
      .select("id")
      .eq("id", district.data)
      .eq("governorate_id", gov.data)
      .maybeSingle();
    if (!okDistrict) return { error: "الدائرة لا تتبع المحافظة" };

    const fields = {
      name: name.data,
      governorate_id: gov.data,
      district_id: district.data,
    };

    if (!id) {
      newPath = photo ? await uploadPhoto(photo) : null;
      const { error } = await admin
        .from("members")
        .insert({ ...fields, photo_path: newPath });
      if (error) throw error;
      return done();
    }

    const { data: current } = await admin
      .from("members")
      .select("photo_path")
      .eq("id", id.data)
      .maybeSingle();
    if (!current) return { error: "غير موجود" };

    if (photo) newPath = await uploadPhoto(photo);
    const { error } = await admin
      .from("members")
      .update(newPath ? { ...fields, photo_path: newPath } : fields)
      .eq("id", id.data);
    if (error) throw error;
    if (newPath) await removePhoto(current.photo_path);
    return done();
  } catch {
    await removePhoto(newPath);
    return { error: "تعذّر الحفظ" };
  }
}

export async function deleteMember(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "طلب غير صالح" };

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("members")
      .select("photo_path")
      .eq("id", id.data)
      .maybeSingle();
    const { error } = await admin.from("members").delete().eq("id", id.data);
    if (error) return { error: "تعذّر الحذف" };
    await removePhoto(data?.photo_path);
    return done();
  } catch {
    return { error: "تعذّر الحذف" };
  }
}

export async function resetMemberVotes(memberIds?: string[]): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const ids = z.array(idSchema).max(5000).optional().safeParse(memberIds);
  if (!ids.success) return { error: "بيانات غير صالحة" };
  try {
    const query = createAdminClient().from("member_votes").delete();
    const { error } = ids.data
      ? ids.data.length === 0
        ? { error: null }
        : await query.in("member_id", ids.data)
      : await query.gte("created_at", "1970-01-01");
    if (error) return { error: "تعذّر التصفير" };
    return done();
  } catch {
    return { error: "تعذّر التصفير" };
  }
}

export type VotingKind = "president" | "parliament";

export async function addCenter(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const gov = govSchema.safeParse(formData.get("governorateId"));
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("name"));
  if (!gov.success) return { error: "اختر المحافظة" };
  if (!name.success) return { error: "الاسم غير صالح" };

  try {
    const { error } = await createAdminClient()
      .from("centers")
      .insert({ governorate_id: gov.data, name: name.data });
    if (error) {
      return { error: error.code === "23505" ? "المركز موجود" : "تعذّر الحفظ" };
    }
    return done();
  } catch {
    return { error: "تعذّر الحفظ" };
  }
}

export async function deleteCenter(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "طلب غير صالح" };

  try {
    const { error } = await createAdminClient().from("centers").delete().eq("id", id.data);
    if (error) {
      return { error: error.code === "23503" ? "فيه دوائر بأعضاء، احذفها أو انقلهم أولًا" : "تعذّر الحذف" };
    }
    return done();
  } catch {
    return { error: "تعذّر الحذف" };
  }
}

export async function addDistrict(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const center = idSchema.safeParse(formData.get("centerId"));
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("name"));
  if (!center.success) return { error: "اختر المركز" };
  if (!name.success) return { error: "الاسم غير صالح" };

  try {
    const admin = createAdminClient();
    const { data: parent } = await admin
      .from("centers")
      .select("governorate_id")
      .eq("id", center.data)
      .maybeSingle();
    if (!parent) return { error: "المركز غير موجود" };

    const { error } = await admin
      .from("districts")
      .insert({ governorate_id: parent.governorate_id, center_id: center.data, name: name.data });
    if (error) {
      return { error: error.code === "23505" ? "الدائرة موجودة" : "تعذّر الحفظ" };
    }
    return done();
  } catch {
    return { error: "تعذّر الحفظ" };
  }
}

export async function deleteDistrict(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "طلب غير صالح" };

  try {
    const { error } = await createAdminClient().from("districts").delete().eq("id", id.data);
    if (error) {
      return { error: error.code === "23503" ? "فيها أعضاء، انقلهم أو احذفهم أولًا" : "تعذّر الحذف" };
    }
    return done();
  } catch {
    return { error: "تعذّر الحذف" };
  }
}

// Dates are ISO strings produced by the admin's browser, or empty to clear.
export async function saveVotingWindow(
  kind: VotingKind,
  startsAt: string,
  endsAt: string,
  heading: string,
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };

  const title = z.string().trim().max(HEADING_MAX).safeParse(heading);
  if (!title.success) return { error: "العنوان طويل" };
  const text = title.data || null;

  const parse = (v: string) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const start = parse(startsAt);
  const end = parse(endsAt);
  if (start === undefined || end === undefined) return { error: "تاريخ غير صالح" };
  if (start && end && start >= end) return { error: "النهاية قبل البداية" };

  const update =
    kind === "president"
      ? {
          voting_starts_at: start?.toISOString() ?? null,
          voting_ends_at: end?.toISOString() ?? null,
          voting_heading: text,
        }
      : {
          parliament_starts_at: start?.toISOString() ?? null,
          parliament_ends_at: end?.toISOString() ?? null,
          parliament_heading: text,
        };

  try {
    const { error } = await createAdminClient().from("site_settings").update(update).eq("id", 1);
    if (error) return { error: "تعذّر الحفظ" };
    return done();
  } catch {
    return { error: "تعذّر الحفظ" };
  }
}

export async function setPublished(kind: VotingKind, published: boolean): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const update =
    kind === "president" ? { voting_published: published } : { parliament_published: published };
  try {
    const { error } = await createAdminClient().from("site_settings").update(update).eq("id", 1);
    if (error) return { error: "تعذّر الحفظ" };
    return done();
  } catch {
    return { error: "تعذّر الحفظ" };
  }
}

