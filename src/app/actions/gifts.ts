"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoBaseUrl } from "@/lib/voting-data";
import { notify } from "@/lib/notifications";
import type { AdminState } from "@/app/actions/admin";

export type GiftStatus = "pending" | "accepted" | "declined";

export type Nominator = {
  userId: string;
  avatarUrl: string | null;
  phone: string;
  at: string;
  gift: GiftStatus | null;
  cooling: boolean;
};

export type NominatorsResult = {
  error?: string;
  free: boolean;
  qty: number | null;
  given: number;
  items: Nominator[];
};

const idSchema = z.string().uuid();
const MAX_NOMINATORS = 200;
const COOLDOWN_DAYS = 14;

const EMPTY: NominatorsResult = { free: false, qty: null, given: 0, items: [] };

async function ownedTip(tipId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await createAdminClient()
    .from("tips")
    .select("id, user_id, title, offer, offer_qty, approved")
    .eq("id", tipId)
    .maybeSingle();
  return data && data.user_id === user.id ? data : null;
}

// A declined gift returns to the pool, so only pending and accepted ones count as given.
async function givenCount(tipId: string) {
  const { count } = await createAdminClient()
    .from("tip_gifts")
    .select("id", { count: "exact", head: true })
    .eq("tip_id", tipId)
    .neq("status", "declined");
  return count ?? 0;
}

const maskPhone = (p: string) => (p.length >= 8 ? `${p.slice(0, 3)}•••••${p.slice(-3)}` : "•••••");

export async function listNominators(tipId: string): Promise<NominatorsResult> {
  const id = idSchema.safeParse(tipId);
  if (!id.success) return { ...EMPTY, error: "غير صالح" };
  const tip = await ownedTip(id.data);
  if (!tip) return { ...EMPTY, error: "غير مصرّح" };

  try {
    const admin = createAdminClient();
    const [{ data: noms }, { data: gifts }] = await Promise.all([
      admin
        .from("tip_nominations")
        .select("user_id, created_at")
        .eq("tip_id", tip.id)
        .order("created_at", { ascending: false })
        .limit(MAX_NOMINATORS),
      admin.from("tip_gifts").select("winner_id, status").eq("tip_id", tip.id).order("created_at", { ascending: true }),
    ]);
    const rows = noms ?? [];
    const ids = rows.map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("user_id, avatar_path, phone_public").in("user_id", ids)
      : { data: [] };
    const profileOf = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const since = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString();
    const { data: recent } = ids.length
      ? await admin
          .from("tip_gifts")
          .select("winner_id")
          .in("winner_id", ids)
          .eq("owner_id", tip.user_id)
          .gte("created_at", since)
      : { data: [] };
    const cooling = new Set((recent ?? []).map((r) => r.winner_id));
    const giftOf = new Map((gifts ?? []).map((g) => [g.winner_id, g.status as GiftStatus]));

    // The number is shown in full only to the advertiser when its owner made it public.
    const items = await Promise.all(
      rows.map<Promise<Nominator>>(async (r) => {
        const profile = profileOf.get(r.user_id);
        const auth = await admin.auth.admin.getUserById(r.user_id);
        const raw = auth.data.user?.phone ?? "";
        const phone = raw ? `0${raw.replace(/^\+?20/, "")}` : "";
        return {
          userId: r.user_id,
          avatarUrl: profile?.avatar_path ? `${photoBaseUrl()}/${profile.avatar_path}` : null,
          phone: profile?.phone_public ? phone : maskPhone(phone),
          at: r.created_at,
          gift: giftOf.get(r.user_id) ?? null,
          cooling: cooling.has(r.user_id),
        };
      }),
    );
    return { free: tip.offer === "free", qty: tip.offer_qty, given: await givenCount(tip.id), items };
  } catch {
    return { ...EMPTY, error: "تعذّر التحميل" };
  }
}

export async function awardGift(tipId: string, winnerId: string): Promise<AdminState> {
  const tid = idSchema.safeParse(tipId);
  const wid = idSchema.safeParse(winnerId);
  if (!tid.success || !wid.success) return { error: "غير صالح" };
  const tip = await ownedTip(tid.data);
  if (!tip) return { error: "غير مصرّح" };
  if (tip.offer !== "free" || !tip.approved) return { error: "لا يدعم الهدايا" };

  try {
    const admin = createAdminClient();
    const { data: nomination } = await admin
      .from("tip_nominations")
      .select("id")
      .eq("tip_id", tip.id)
      .eq("user_id", wid.data)
      .maybeSingle();
    if (!nomination) return { error: "ليس من المهتمين" };
    if (tip.offer_qty !== null && (await givenCount(tip.id)) >= tip.offer_qty) {
      return { error: "نفدت الهدايا" };
    }
    const { data: held } = await admin
      .from("tip_gifts")
      .select("id")
      .eq("tip_id", tip.id)
      .eq("winner_id", wid.data)
      .neq("status", "declined")
      .limit(1);
    if (held?.length) return { error: "مُنحت له من قبل" };
    const since = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString();
    const { data: recent } = await admin
      .from("tip_gifts")
      .select("id")
      .eq("winner_id", wid.data)
      .eq("owner_id", tip.user_id)
      .gte("created_at", since)
      .limit(1);
    if (recent?.length) return { error: `لا يمكن منحه هدية قبل مرور ${COOLDOWN_DAYS} يومًا` };
    const { error } = await admin.from("tip_gifts").insert({ tip_id: tip.id, winner_id: wid.data });
    if (error) {
      return { error: error.message.includes("quota") ? "نفدت الهدايا" : "تعذّر المنح" };
    }
    await notify(wid.data, `فزت بهدية من إعلان «${tip.title}»`, "/profile");
  } catch {
    return { error: "تعذّر المنح" };
  }
  revalidatePath("/profile");
  return { ok: true };
}

export async function respondGift(giftId: string, accept: boolean): Promise<AdminState> {
  const id = idSchema.safeParse(giftId);
  if (!id.success) return { error: "غير صالح" };
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  try {
    const { data, error } = await createAdminClient()
      .from("tip_gifts")
      .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", id.data)
      .eq("winner_id", user.id)
      .eq("status", "pending")
      .select("id, owner_id, title");
    if (error) throw error;
    if (!data?.length) return { error: "تم الرد من قبل" };
    await notify(
      data[0].owner_id,
      `${accept ? "قبل" : "رد"} الفائز الهدية في إعلانك «${data[0].title ?? ""}»`,
      "/profile",
    );
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  revalidatePath("/profile");
  return { ok: true };
}
