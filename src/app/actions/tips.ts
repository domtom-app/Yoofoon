"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { parsePhoto, removePhoto, uploadPhoto } from "@/lib/admin-storage";
import { getProfile, getSessionUser } from "@/lib/profile";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminState } from "@/app/actions/admin";
import type { Area } from "@/lib/area";
import { notify } from "@/lib/notifications";

export type TipState = { error?: string; done?: boolean; pending?: boolean };

const idSchema = z.string().uuid();
const linkSchema = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
    } catch {
      return false;
    }
  })
  .transform((v) => v || null);

const tipSchema = z.object({
  title: z.string().trim().min(1).max(18),
  body: z.string().trim().max(2000),
  link: linkSchema,
  offer: z.enum(["none", "discount", "free"]),
  offerQty: z
    .string()
    .trim()
    .regex(/^\d{0,5}$/)
    .transform((v) => (Number(v) > 0 ? Number(v) : null)),
  offerPercent: z
    .string()
    .trim()
    .regex(/^\d{0,3}$/)
    .transform((v) => (Number(v) >= 1 && Number(v) <= 100 ? Number(v) : null)),
});

// The count applies to any offer and the percentage only to discounts.
function tipValues({ offerQty, offerPercent, ...rest }: z.infer<typeof tipSchema>) {
  return {
    ...rest,
    offer_qty: rest.offer === "none" ? null : offerQty,
    offer_percent: rest.offer === "discount" ? offerPercent : null,
  };
}

const DAILY_NOMINATIONS = 10;

// The narrowest chosen level decides the area; its parents are read from the database.
async function parseArea(formData: FormData): Promise<Area | null> {
  const admin = createAdminClient();
  const district = idSchema.safeParse(formData.get("districtId"));
  if (district.success) {
    const { data } = await admin
      .from("districts")
      .select("id, center_id, governorate_id")
      .eq("id", district.data)
      .maybeSingle();
    return data
      ? { governorateId: data.governorate_id, centerId: data.center_id, districtId: data.id }
      : null;
  }
  const center = idSchema.safeParse(formData.get("centerId"));
  if (center.success) {
    const { data } = await admin
      .from("centers")
      .select("id, governorate_id")
      .eq("id", center.data)
      .maybeSingle();
    return data ? { governorateId: data.governorate_id, centerId: data.id, districtId: null } : null;
  }
  const gov = z.coerce.number().int().positive().safeParse(formData.get("governorateId"));
  if (gov.success) {
    const { data } = await admin.from("governorates").select("id").eq("id", gov.data).maybeSingle();
    return data ? { governorateId: data.id, centerId: null, districtId: null } : null;
  }
  return { governorateId: null, centerId: null, districtId: null };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/parliament");
  revalidatePath("/tips");
  revalidatePath("/admin");
  revalidatePath("/profile");
}

export async function submitTip(_prev: TipState, formData: FormData): Promise<TipState> {
  const admin = await isAdmin();
  const user = await getSessionUser();
  if (!admin && !user) return { error: "سجّل الدخول أولًا" };

  const parsed = tipSchema.safeParse({
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    link: formData.get("link") ?? "",
    offer: formData.get("offer") ?? "none",
    offerQty: formData.get("offerQty") ?? "",
    offerPercent: formData.get("offerPercent") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.some((i) => i.path[0] === "link") ? "رابط غير صالح" : "أدخل العنوان" };
  }

  const photo = parsePhoto(formData.get("photo"));
  if (photo === "invalid") return { error: "صورة غير صالحة (حتى 4MB)" };

  if (user && !admin && !(await checkRateLimit(`tip:${user.id}`))) {
    return { error: "محاولات كثيرة، انتظر قليلًا" };
  }

  let path: string | null = null;
  try {
    const area = await parseArea(formData);
    if (!area) return { error: "نطاق غير صالح" };
    if (photo) path = await uploadPhoto(photo);
    const { error } = await createAdminClient()
      .from("tips")
      .insert({
        ...tipValues(parsed.data),
        photo_path: path,
        user_id: user?.id ?? null,
        approved: admin,
        governorate_id: area.governorateId,
        center_id: area.centerId,
        district_id: area.districtId,
      });
    if (error) throw error;
  } catch {
    await removePhoto(path);
    return { error: "تعذّر الإرسال" };
  }
  refresh();
  return { done: true, pending: !admin };
}

export async function nominateTip(_prev: TipState, formData: FormData): Promise<TipState> {
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  const id = idSchema.safeParse(formData.get("tipId"));
  if (!id.success) return { error: "اختيار غير صالح" };
  if (!(await checkRateLimit(`nominate:${user.id}`))) {
    return { error: "محاولات كثيرة، انتظر قليلًا" };
  }

  try {
    const admin = createAdminClient();
    const { data: tip } = await admin
      .from("tip_results")
      .select("id, governorate_id")
      .eq("id", id.data)
      .eq("approved", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!tip) return { error: "غير موجود" };

    const profile = await getProfile(user.id);
    const { data: home } = profile?.district_id
      ? await admin.from("districts").select("governorate_id").eq("id", profile.district_id).maybeSingle()
      : { data: null };
    if (tip.governorate_id !== null && tip.governorate_id !== home?.governorate_id) {
      return { error: "الاهتمام لإعلانات محافظتك فقط" };
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("tip_nominations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_NOMINATIONS) {
      return { error: `وصلت للحد اليومي (${DAILY_NOMINATIONS})` };
    }

    const { error } = await admin
      .from("tip_nominations")
      .insert({ tip_id: tip.id, user_id: user.id });
    if (error) return { error: error.code === "23505" ? "سبق اهتمامك" : "تعذّر الحفظ" };
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return { done: true };
}

export async function setTipApproved(formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "غير صالح" };
  try {
    const approved = formData.get("approved") === "true";
    const { data, error } = await createAdminClient()
      .from("tips")
      .update({ approved })
      .eq("id", id.data)
      .select("user_id, title");
    if (error) throw error;
    if (data?.[0]) {
      await notify(
        data[0].user_id,
        approved ? `تمت الموافقة على إعلانك «${data[0].title}»` : `تم إيقاف نشر إعلانك «${data[0].title}»`,
        "/profile",
      );
    }
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return {};
}

// Admins manage any tip; a regular user manages only the tips they own.
async function canManage(id: string): Promise<{ ok: boolean; admin: boolean }> {
  if (await isAdmin()) return { ok: true, admin: true };
  const user = await getSessionUser();
  if (!user) return { ok: false, admin: false };
  const { data } = await createAdminClient().from("tips").select("user_id").eq("id", id).maybeSingle();
  return { ok: data?.user_id === user.id, admin: false };
}

export async function updateTip(formData: FormData): Promise<AdminState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "غير صالح" };
  const access = await canManage(id.data);
  if (!access.ok) return { error: "غير مصرّح" };
  const parsed = tipSchema.safeParse({
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    link: formData.get("link") ?? "",
    offer: formData.get("offer") ?? "none",
    offerQty: formData.get("offerQty") ?? "",
    offerPercent: formData.get("offerPercent") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.some((i) => i.path[0] === "link") ? "رابط غير صالح" : "أدخل العنوان" };
  }
  const photo = parsePhoto(formData.get("photo"));
  if (photo === "invalid") return { error: "صورة غير صالحة (حتى 4MB)" };
  const removeCurrent = formData.get("removePhoto") === "on";

  const admin = createAdminClient();
  let newPath: string | null = null;
  try {
    const { data: current } = await admin
      .from("tips")
      .select("photo_path")
      .eq("id", id.data)
      .maybeSingle();
    if (!current) return { error: "غير موجود" };
    const area = await parseArea(formData);
    if (!area) return { error: "نطاق غير صالح" };
    const oldPath = current.photo_path;
    if (photo) newPath = await uploadPhoto(photo);
    const photoPath = newPath ?? (removeCurrent ? null : oldPath);
    const { error } = await admin
      .from("tips")
      .update({
        ...tipValues(parsed.data),
        photo_path: photoPath,
        governorate_id: area.governorateId,
        center_id: area.centerId,
        district_id: area.districtId,
        // A user's edit goes back to review.
        ...(access.admin ? {} : { approved: false }),
      })
      .eq("id", id.data);
    if (error) throw error;
    if (photoPath !== oldPath) await removePhoto(oldPath);
  } catch {
    await removePhoto(newPath);
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return {};
}

export async function deleteTip(formData: FormData): Promise<AdminState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "غير صالح" };
  if (!(await canManage(id.data)).ok) return { error: "غير مصرّح" };
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tips")
      .delete()
      .eq("id", id.data)
      .select("photo_path")
      .maybeSingle();
    await removePhoto(data?.photo_path);
  } catch {
    return { error: "تعذّر الحذف" };
  }
  refresh();
  return {};
}
