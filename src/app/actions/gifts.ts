"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoBaseUrl } from "@/lib/voting-data";
import { publicPeople, type PublicPerson } from "@/lib/public-people";
import { notify } from "@/lib/notifications";
import type { AdminState } from "@/app/actions/admin";

export type GiftStatus = "pending" | "accepted" | "declined";

export type Nominator = {
  userId: string;
  avatarUrl: string | null;
  name: string;
  phone: string;
  governorate: string;
  interests: number;
  giftsGiven: number;
  at: string;
  gift: GiftStatus | null;
  cooling: boolean;
  coolingUntil: string | null;
};

export type BlockedUser = { userId: string; name: string; avatarUrl: string | null };

export type NominatorsResult = {
  error?: string;
  free: boolean;
  qty: number | null;
  given: number;
  items: Nominator[];
  blocked: BlockedUser[];
};

const idSchema = z.string().uuid();
const MAX_NOMINATORS = 50;
const COOLDOWN_DAYS = 14;

const EMPTY: NominatorsResult = { free: false, qty: null, given: 0, items: [], blocked: [] };

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

export type PublicNominator = PublicPerson;

// No phone numbers, and only for signed-in users.
export async function listTipNominators(tipId: string): Promise<{ error?: string; items: PublicNominator[] }> {
  const id = idSchema.safeParse(tipId);
  if (!id.success) return { error: "غير صالح", items: [] };
  if (!(await getSessionUser())) return { error: "سجّل الدخول لعرض المهتمين", items: [] };
  try {
    const admin = createAdminClient();
    const { data: tip } = await admin.from("tips").select("id").eq("id", id.data).eq("approved", true).maybeSingle();
    if (!tip) return { error: "غير متاح", items: [] };
    const { data: noms } = await admin
      .from("tip_nominations")
      .select("user_id")
      .eq("tip_id", tip.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = (noms ?? []).map((n) => n.user_id);
    if (ids.length === 0) return { items: [] };
    return { items: await publicPeople(ids) };
  } catch {
    return { error: "تعذّر التحميل", items: [] };
  }
}

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
    const [{ data: profiles }, { data: blocks }, { data: mineTips }] = await Promise.all([
      ids.length
        ? admin.from("profiles").select("user_id, avatar_path, phone_public, username, district_id").in("user_id", ids)
        : Promise.resolve({ data: [] }),
      admin.from("tip_blocks").select("user_id").eq("owner_id", tip.user_id),
      admin.from("tips").select("id").eq("user_id", tip.user_id),
    ]);
    const profileOf = new Map((profiles ?? []).map((p) =>     [p.user_id, p]));
    const blockedIds = (blocks ?? []).map((b) => b.user_id);
    const ownTipIds = (mineTips ?? []).map((t) => t.id);
    const [{ data: allNoms }, { data: districts }, { data: blockedProfiles }] = await Promise.all([
      ids.length && ownTipIds.length
        ? admin.from("tip_nominations").select("user_id").in("user_id", ids).in("tip_id", ownTipIds)
        : Promise.resolve({ data: [] }),
      admin.from("districts").select("id, governorate_id").in("id", (profiles ?? []).map((p) => p.district_id).filter((d): d is string => Boolean(d))),
      blockedIds.length
        ? admin.from("profiles").select("user_id, avatar_path, username").in("user_id", blockedIds)
        : Promise.resolve({ data: [] }),
    ]);
    const { data: govs } = await admin.from("governorates").select("id, name");
    const govName = new Map((govs ?? []).map((g) => [g.id, g.name]));
    const govOfDistrict = new Map((districts ?? []).map((d) => [d.id, govName.get(d.governorate_id) ?? ""]));
    const interests = new Map<string, number>();
    for (const n of allNoms ?? []) interests.set(n.user_id, (interests.get(n.user_id) ?? 0) + 1);

    const { data: ownerGifts } = ids.length
      ? await admin
          .from("tip_gifts")
          .select("winner_id, status, created_at")
          .in("winner_id", ids)
          .eq("owner_id", tip.user_id)
      : { data: [] };
    const giftsGiven = new Map<string, number>();
    const lastGift = new Map<string, string>();
    for (const g of ownerGifts ?? []) {
      if (g.status !== "declined") giftsGiven.set(g.winner_id, (giftsGiven.get(g.winner_id) ?? 0) + 1);
      if (!lastGift.has(g.winner_id) || g.created_at > lastGift.get(g.winner_id)!) lastGift.set(g.winner_id, g.created_at);
    }
    const coolingUntil = (id: string) => {
      const last = lastGift.get(id);
      if (!last) return null;
      const until = new Date(new Date(last).getTime() + COOLDOWN_DAYS * 86_400_000);
      return until.getTime() > Date.now() ? until.toISOString() : null;
    };
    const giftOf = new Map((gifts ?? []).map((g) => [g.winner_id, g.status as GiftStatus]));

    // The number is shown in full only to the advertiser when its owner made it public.
    const items = (
      await Promise.all(
        rows
          .filter((r) => !blockedIds.includes(r.user_id))
          .map<Promise<Nominator>>(async (r) => {
            const profile = profileOf.get(r.user_id);
            const auth = await admin.auth.admin.getUserById(r.user_id);
            const raw = auth.data.user?.phone ?? "";
            const phone = raw ? `0${raw.replace(/^\+?20/, "")}` : "";
            const until = coolingUntil(r.user_id);
            return {
              userId: r.user_id,
              avatarUrl: profile?.avatar_path ? `${photoBaseUrl()}/${profile.avatar_path}` : null,
              name: profile?.username ?? "",
              phone: profile?.phone_public ? phone : maskPhone(phone),
              governorate: profile?.district_id ? (govOfDistrict.get(profile.district_id) ?? "") : "",
              interests: interests.get(r.user_id) ?? 1,
              giftsGiven: giftsGiven.get(r.user_id) ?? 0,
              at: r.created_at,
              gift: giftOf.get(r.user_id) ?? null,
              cooling: until !== null,
              coolingUntil: until,
            };
          }),
      )
    );
    const blocked = (blockedProfiles ?? []).map<BlockedUser>((p) => ({
      userId: p.user_id,
      name: p.username ?? "مستخدم",
      avatarUrl: p.avatar_path ? `${photoBaseUrl()}/${p.avatar_path}` : null,
    }));
    return { free: tip.offer === "free", qty: tip.offer_qty, given: await givenCount(tip.id), items, blocked };
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

export async function blockUser(userId: string, block: boolean): Promise<AdminState> {
  const uid = idSchema.safeParse(userId);
  if (!uid.success) return { error: "غير صالح" };
  const me = await getSessionUser();
  if (!me) return { error: "سجّل الدخول أولًا" };
  if (uid.data === me.id) return { error: "غير صالح" };
  try {
    const admin = createAdminClient();
    if (block) {
      const { error } = await admin.from("tip_blocks").upsert({ owner_id: me.id, user_id: uid.data });
      if (error) throw error;
      const { data: own } = await admin.from("tips").select("id").eq("user_id", me.id);
      const tipIds = (own ?? []).map((t) => t.id);
      if (tipIds.length) await admin.from("tip_nominations").delete().eq("user_id", uid.data).in("tip_id", tipIds);
    } else {
      const { error } = await admin.from("tip_blocks").delete().eq("owner_id", me.id).eq("user_id", uid.data);
      if (error) throw error;
    }
  } catch {
    return { error: "تعذّر الحفظ" };
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
