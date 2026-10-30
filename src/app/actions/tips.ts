"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { parsePhoto, removePhoto, uploadPhoto } from "@/lib/admin-storage";
import { getProfile, getSessionUser } from "@/lib/profile";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminState } from "@/app/actions/admin";
import { parseArea } from "@/lib/parse-area";
import { notify, notifyAdmins, notifyGrouped } from "@/lib/notifications";
import { HEADING_MAX } from "@/lib/voting";
import { activeSuspension, SUSPEND_LABELS, untilText, type SuspendKind } from "@/lib/suspension";

export async function setVerified(userId: string, verified: boolean): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  if (!z.string().uuid().safeParse(userId).success) return { error: "بيانات غير صالحة" };
  try {
    const { error } = await createAdminClient()
      .from("profiles")
      .upsert({ user_id: userId, verified }, { onConflict: "user_id" });
    if (error) return { error: "تعذّر الحفظ" };
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function suspendAdvertiser(
  userId: string,
  input: { kind: SuspendKind; reason: string; days: number | null; date: string },
): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const parsed = z
    .object({
      userId: z.string().uuid(),
      kind: z.enum(["post", "hide", "full"]),
      reason: z.string().trim().min(1).max(80),
      days: z.number().int().min(1).max(365).nullable(),
      date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
    })
    .safeParse({ userId, ...input });
  if (!parsed.success) return { error: "أدخل السبب والمدة" };
  const { kind, reason, days, date } = parsed.data;

  let until: Date | null = null;
  if (date) {
    until = new Date(`${date}T23:59:59+02:00`);
    if (Number.isNaN(until.getTime()) || until <= new Date()) return { error: "تاريخ غير صالح" };
  } else if (days) {
    until = new Date(Date.now() + days * 86_400_000);
  }
  const untilIso = until?.toISOString() ?? null;

  try {
    const { error } = await createAdminClient()
      .from("profiles")
      .upsert(
        { user_id: userId, suspend_kind: kind, suspend_reason: reason, suspend_until: untilIso },
        { onConflict: "user_id" },
      );
    if (error) return { error: "تعذّر الحفظ" };
    await notify(
      userId,
      `تم تطبيق «${SUSPEND_LABELS[kind]}» على حسابك ${untilText(untilIso)} — السبب: ${reason}`,
      "/profile",
    );
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return {};
}

export async function liftSuspension(userId: string): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  if (!z.string().uuid().safeParse(userId).success) return { error: "بيانات غير صالحة" };
  try {
    const { error } = await createAdminClient()
      .from("profiles")
      .update({ suspend_kind: null, suspend_reason: null, suspend_until: null })
      .eq("user_id", userId);
    if (error) return { error: "تعذّر الحفظ" };
    await notify(userId, "تم رفع الإيقاف عن حسابك", "/profile");
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return {};
}

// Removes every ad of the advertiser and resets the advertiser-facing profile data; the account itself stays.
export async function deleteAdvertiser(userId: string): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  if (!z.string().uuid().safeParse(userId).success) return { error: "بيانات غير صالحة" };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("tips").delete().eq("user_id", userId).select("photo_path");
    if (error) throw error;
    await Promise.all((data ?? []).map((t) => removePhoto(t.photo_path)));
    await admin
      .from("profiles")
      .update({ verified: false, terms_accepted_at: null, username: null, social_links: {}, social_public: false })
      .eq("user_id", userId);
  } catch {
    return { error: "تعذّر الحذف" };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function saveTipsHeading(heading: string): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const title = z.string().trim().max(HEADING_MAX).safeParse(heading);
  if (!title.success) return { error: "العنوان طويل" };
  try {
    const { error } = await createAdminClient()
      .from("site_settings")
      .update({ tips_heading: title.data || null })
      .eq("id", 1);
    if (error) return { error: "تعذّر الحفظ" };
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

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

const priceField = z
  .string()
  .trim()
  .regex(/^(\d{1,7}([.,]\d{1,2})?)?$/)
  .transform((v) => (Number(v.replace(",", ".")) > 0 ? Number(v.replace(",", ".")) : null));

const tipSchema = z.object({
  title: z.string().trim().min(1).max(18),
  body: z.string().trim().max(2000),
  link: linkSchema,
  offer: z.enum(["none", "discount", "free"]),
  priceNow: priceField,
  priceBefore: priceField,
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

// The count applies to any offer and the percentage only to discounts; prices never apply to gifts.
// A discount without a typed percentage takes it from the two prices.
function tipValues({ offerQty, offerPercent, priceNow, priceBefore, ...rest }: z.infer<typeof tipSchema>) {
  const priced = rest.offer !== "free" && priceNow !== null;
  const before = rest.offer === "discount" && priced && priceBefore !== null && priceBefore > priceNow! ? priceBefore : null;
  const derived = before ? Math.round((1 - priceNow! / before) * 100) : null;
  return {
    ...rest,
    offer_qty: rest.offer === "none" ? null : offerQty,
    offer_percent: rest.offer === "discount" ? (offerPercent ?? (derived && derived >= 1 ? derived : null)) : null,
    price_now: priced ? priceNow : null,
    price_before: before,
  };
}

const DAILY_NOMINATIONS = 10;

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
    priceNow: formData.get("priceNow") ?? "",
    priceBefore: formData.get("priceBefore") ?? "",
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

  if (user && !admin) {
    const hold = activeSuspension(await getProfile(user.id));
    if (hold && hold.kind !== "hide") {
      return { error: `حسابك موقوف عن النشر ${untilText(hold.until)}${hold.reason ? ` — ${hold.reason}` : ""}` };
    }
  }

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
        approved_at: admin ? new Date().toISOString() : null,
        governorate_id: area.governorateId,
        center_id: area.centerId,
        district_id: area.districtId,
      });
    if (error) throw error;
    if (!admin) {
      await notifyAdmins("pending-tips", (n) => (n === 1 ? "إعلان جديد بانتظار المراجعة" : `${n} إعلانات بانتظار المراجعة`), "/admin");
    }
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
    const { data: own } = await admin.from("tips").select("user_id").eq("id", tip.id).maybeSingle();
    if (own?.user_id === user.id) return { error: "لا يمكنك الاهتمام بإعلانك" };
    if (own?.user_id) {
      const { data: blocked } = await admin
        .from("tip_blocks")
        .select("user_id")
        .eq("owner_id", own.user_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (blocked) return { error: "غير متاح لك الاهتمام بهذا الإعلان" };
    }

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
    const { data: owner } = await admin.from("tips").select("user_id, title").eq("id", tip.id).maybeSingle();
    await notifyGrouped(
      owner?.user_id,
      `nom:${tip.id}`,
      (n) => (n === 1 ? `مهتم جديد بإعلانك «${owner?.title}»` : `${n} مهتمين جدد بإعلانك «${owner?.title}»`),
      "/profile",
    );
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  refresh();
  return { done: true };
}

const REASONS: Record<string, string> = {
  misleading: "محتوى مضلل أو غير دقيق",
  inappropriate: "محتوى غير لائق",
  incomplete: "بيانات الإعلان غير مكتملة",
  duplicate: "إعلان مكرر",
};

// "none" skips the owner's notification; a known key appends its preset reason.
function reasonOf(formData: FormData): { skip: boolean; text: string } {
  const key = String(formData.get("reason") ?? "");
  if (key === "custom") {
    const note = String(formData.get("reason_text") ?? "").trim().slice(0, 80);
    return { skip: false, text: note ? ` — السبب: ${note}` : "" };
  }
  return { skip: key === "none", text: REASONS[key] ? ` — السبب: ${REASONS[key]}` : "" };
}

export async function setTipApproved(formData: FormData): Promise<AdminState> {
  if (!(await isAdmin())) return { error: "غير مصرّح" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "غير صالح" };
  try {
    const approved = formData.get("approved") === "true";
    const { data, error } = await createAdminClient()
      .from("tips")
      .update(approved ? { approved, approved_at: new Date().toISOString() } : { approved })
      .eq("id", id.data)
      .select("user_id, title");
    if (error) throw error;
    const reason = reasonOf(formData);
    if (data?.[0] && (approved || !reason.skip)) {
      await notify(
        data[0].user_id,
        approved ? `تمت الموافقة على إعلانك «${data[0].title}»` : `تم إيقاف نشر إعلانك «${data[0].title}»${reason.text}`,
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
    priceNow: formData.get("priceNow") ?? "",
    priceBefore: formData.get("priceBefore") ?? "",
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
  const access = await canManage(id.data);
  if (!access.ok) return { error: "غير مصرّح" };
  const reason = reasonOf(formData);
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tips")
      .delete()
      .eq("id", id.data)
      .select("photo_path, user_id, title")
      .maybeSingle();
    await removePhoto(data?.photo_path);
    if (access.admin && !reason.skip) {
      await notify(data?.user_id, `تم حذف إعلانك «${data?.title}»${reason.text}`, "/profile");
    }
  } catch {
    return { error: "تعذّر الحذف" };
  }
  refresh();
  return {};
}
