"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parsePhoto, removePhoto, uploadPhoto } from "@/lib/admin-storage";
import { getSessionUser } from "@/lib/profile";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseArea } from "@/lib/parse-area";
import { categoryOf, CONTEST_DAYS, CONTEST_START_COUNT, type ContestLevel } from "@/lib/contests";
import type { TipState } from "@/app/actions/tips";

const MAX_PER_USER = 5;
const DAY = 24 * 60 * 60 * 1000;

const idSchema = z.string().uuid();

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  category: z.string().refine((v) => categoryOf(v) !== undefined),
  specialty: z.string().trim().max(30),
});

const refresh = () => revalidatePath("/contests");

type Group = { category: string; level: string; governorate_id: number | null; center_id: string | null; district_id: string | null };

type Filterable = {
  eq: (c: string, v: string | number) => Filterable;
  is: (c: string, v: null) => Filterable;
};

function inGroup<T>(query: T, g: Group): T {
  let q = (query as unknown as Filterable).eq("category", g.category).eq("level", g.level);
  q = g.governorate_id === null ? q.is("governorate_id", null) : q.eq("governorate_id", g.governorate_id);
  q = g.center_id === null ? q.is("center_id", null) : q.eq("center_id", g.center_id);
  return (g.district_id === null ? q.is("district_id", null) : q.eq("district_id", g.district_id)) as unknown as T;
}

// A new group starts its 30 days at once. A running group is joined with its end date.
// A group whose top 3 are waiting stays without an end date until it reaches 10 contenders.
async function joinGroup(group: Group): Promise<string | null> {
  const admin = createAdminClient();
  await admin.rpc("settle_contests");
  const { data } = await inGroup(admin.from("contenders").select("expires_at").eq("status", "active"), group)
    .order("expires_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (data) return data.expires_at as string | null;
  const { count } = await admin
    .from("contenders")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("category", group.category)
    .is("expires_at", null);
  return count ? null : new Date(Date.now() + CONTEST_DAYS * DAY).toISOString();
}

// The new round begins fresh: every vote is cleared and all contenders share the same 30 days.
async function startIfFull(group: Group) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("contenders")
    .select("id")
    .eq("status", "active")
    .eq("category", group.category)
    .is("expires_at", null);
  const ids = (data ?? []).map((c) => c.id as string);
  if (ids.length < CONTEST_START_COUNT) return;
  await admin.from("contender_votes").delete().in("contender_id", ids);
  await admin
    .from("contenders")
    .update({ expires_at: new Date(Date.now() + CONTEST_DAYS * DAY).toISOString() })
    .in("id", ids);
}

export async function createContender(_prev: TipState, formData: FormData): Promise<TipState> {
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    specialty: formData.get("specialty") ?? "",
  });
  if (!parsed.success) return { error: "أكمل الاسم والمجال" };
  const { name, category } = parsed.data;
  const cat = categoryOf(category)!;
  const specialty = parsed.data.specialty || null;
  if (specialty && cat.id !== "other" && !cat.specialties.includes(specialty)) return { error: "تخصص غير صالح" };
  if (cat.id === "other" && !specialty) return { error: "اكتب المجال" };

  const photo = parsePhoto(formData.get("photo"));
  if (photo === "invalid") return { error: "صورة غير صالحة (حتى 4MB)" };
  if (!(await checkRateLimit(`contender:${user.id}`))) return { error: "محاولات كثيرة، انتظر قليلًا" };

  let path: string | null = null;
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("contenders").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= MAX_PER_USER) return { error: `الحد الأقصى ${MAX_PER_USER} ترشيحات` };
    const area = await parseArea(formData);
    if (!area) return { error: "نطاق غير صالح" };
    const level: ContestLevel = area.districtId
      ? "village"
      : area.centerId
        ? "center"
        : area.governorateId !== null
          ? "governorate"
          : "egypt";
    if (photo) path = await uploadPhoto(photo);
    const group: Group = {
      category,
      level,
      governorate_id: area.governorateId,
      center_id: area.centerId,
      district_id: area.districtId,
    };
    const expiresAt = await joinGroup(group);
    const { error } = await admin.from("contenders").insert({
      user_id: user.id,
      name,
      photo_path: path,
      category,
      specialty: cat.id === "other" || cat.specialties.includes(specialty ?? "") ? specialty : null,
      level,
      governorate_id: area.governorateId,
      center_id: area.centerId,
      district_id: area.districtId,
      duration_days: CONTEST_DAYS,
      expires_at: expiresAt,
    });
    if (error) throw error;
    if (expiresAt === null) await startIfFull(group);
  } catch {
    await removePhoto(path);
    return { error: "تعذّر الإرسال" };
  }
  refresh();
  return { done: true };
}

export async function voteContender(_prev: TipState, formData: FormData): Promise<TipState> {
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  const id = idSchema.safeParse(formData.get("contenderId"));
  if (!id.success) return { error: "اختيار غير صالح" };
  if (!(await checkRateLimit(`contest-vote:${user.id}`))) return { error: "محاولات كثيرة، انتظر قليلًا" };

  try {
    const admin = createAdminClient();
    const { data: c } = await admin
      .from("contenders")
      .select("id, user_id, category, level, governorate_id, center_id, district_id")
      .eq("id", id.data)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!c) return { error: "الاستفتاء منتهٍ" };
    if (c.user_id === user.id) return { error: "لا يمكنك التصويت لنفسك" };

    if (c.level !== "egypt") {
      const { data: profile } = await admin.from("profiles").select("district_id").eq("user_id", user.id).maybeSingle();
      const { data: home } = profile?.district_id
        ? await admin.from("districts").select("id, center_id, governorate_id").eq("id", profile.district_id).maybeSingle()
        : { data: null };
      const eligible =
        (c.level === "governorate" && home?.governorate_id === c.governorate_id) ||
        (c.level === "center" && home?.center_id === c.center_id) ||
        (c.level === "village" && home?.id === c.district_id);
      if (!eligible) return { error: "التصويت لسكان هذا النطاق فقط" };
    }

    const { error } = await admin
      .from("contender_votes")
      .insert({ contender_id: c.id, user_id: user.id, category: c.category, level: c.level });
    if (error) return { error: error.code === "23505" ? "سبق تصويتك في هذا المجال" : "تعذّر الحفظ" };
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return { done: true };
}

export async function rerunContender(_prev: TipState, formData: FormData): Promise<TipState> {
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "غير صالح" };
  try {
    const admin = createAdminClient();
    const { data: c } = await admin
      .from("contenders")
      .select("id, category, level, governorate_id, center_id, district_id")
      .eq("id", id.data)
      .eq("user_id", user.id)
      .eq("status", "out")
      .maybeSingle();
    if (!c) return { error: "غير موجود" };
    const expiresAt = await joinGroup(c);
    await admin.from("contender_votes").delete().eq("contender_id", c.id);
    const { error } = await admin
      .from("contenders")
      .update({ status: "active", duration_days: CONTEST_DAYS, expires_at: expiresAt, created_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) throw error;
    if (expiresAt === null) await startIfFull(c);
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return { done: true };
}

export async function deleteContender(id: string): Promise<TipState> {
  const user = await getSessionUser();
  if (!user || !idSchema.safeParse(id).success) return { error: "غير مصرّح" };
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("contenders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("photo_path")
      .maybeSingle();
    if (!data) return { error: "غير موجود" };
    await removePhoto(data.photo_path);
  } catch {
    return { error: "تعذّر الحذف" };
  }
  refresh();
  return { done: true };
}
