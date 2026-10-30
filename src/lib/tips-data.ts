import "server-only";
import { cacheLife } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDistricts } from "@/lib/districts-query";
import { getProfile, getSessionUser } from "@/lib/profile";
import { areaLabel, governorateLabel, type Area, type Places } from "@/lib/area";
import { toCenters, toDistricts, type Candidate } from "@/lib/voting";
import { photoBaseUrl } from "@/lib/voting-data";
import { cleanLinks, type SocialLinks } from "@/lib/social";
import { verifyLevel, type VerifyLevel } from "@/components/verified-badge";
import { activeSuspension, untilText, type Suspension } from "@/lib/suspension";

function governorateOf(places: Places, districtId: string | null | undefined): string {
  const d = places.districts.find((x) => x.id === districtId);
  return places.governorates.find((g) => g.id === d?.governorateId)?.name ?? "";
}

export type AdminAdvertiser = {
  id: string;
  label: string;
  phone: string;
  level: VerifyLevel;
  tips: number;
  avatarUrl: string | null;
  tipId: string | null;
  governorate: string;
  suspension: Suspension | null;
};

export async function getAdminAdvertisers(): Promise<AdminAdvertiser[]> {
  try {
    const admin = createAdminClient();
    const [tips, marked] = await Promise.all([
      admin.from("tips").select("id, user_id, approved").not("user_id", "is", null),
      admin.from("profiles").select("user_id").or("verified.eq.true,suspend_kind.not.is.null"),
    ]);
    const counts = new Map<string, number>();
    const publicTip = new Map<string, string>();
    for (const t of tips.data ?? []) {
      counts.set(t.user_id, (counts.get(t.user_id) ?? 0) + 1);
      if (t.approved) publicTip.set(t.user_id, t.id);
    }
    const ids = [...new Set([...counts.keys(), ...(marked.data ?? []).map((m) => m.user_id)])].slice(0, 200);
    return await describeAccounts(ids, counts, publicTip);
  } catch {
    return [];
  }
}

export async function getAdminUsers(): Promise<AdminAdvertiser[]> {
  try {
    const admin = createAdminClient();
    const [tips, marked] = await Promise.all([
      admin.from("tips").select("user_id").not("user_id", "is", null),
      admin.from("profiles").select("user_id").or("verified.eq.true,suspend_kind.not.is.null"),
    ]);
    const skip = new Set([...(tips.data ?? []).map((t) => t.user_id), ...(marked.data ?? []).map((m) => m.user_id)]);
    const { data } = await admin.from("profiles").select("user_id").limit(300);
    const ids = (data ?? []).map((p) => p.user_id).filter((id) => !skip.has(id)).slice(0, 100);
    return await describeAccounts(ids, new Map(), new Map());
  } catch {
    return [];
  }
}

async function describeAccounts(
  ids: string[],
  counts: Map<string, number>,
  publicTip: Map<string, string>,
): Promise<AdminAdvertiser[]> {
  const admin = createAdminClient();
  const [profiles, users, places] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, username, verified, terms_accepted_at, avatar_path, district_id, suspend_kind, suspend_reason, suspend_until")
      .in("user_id", ids),
    Promise.all(ids.map((id) => admin.auth.admin.getUserById(id))),
    getPlaces(),
  ]);
  const byId = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
  return ids.map((id, i) => {
    const p = byId.get(id);
    const raw = users[i].data.user?.phone ?? "";
    return {
      id,
      label: p?.username ?? "",
      phone: raw ? `0${raw.replace(/^\+?20/, "")}` : "",
      level: verifyLevel(p),
      tips: counts.get(id) ?? 0,
      avatarUrl: p?.avatar_path ? `${photoBaseUrl()}/${p.avatar_path}` : null,
      tipId: publicTip.get(id) ?? null,
      governorate: governorateOf(places, p?.district_id),
      suspension: activeSuspension(p),
    };
  });
}

export type AdvertiserManage = {
  advertiser: AdminAdvertiser;
  tips: AdminTip[];
  places: Places;
};

export async function getAdvertiserManage(userId: string): Promise<AdvertiserManage | null> {
  try {
    const admin = createAdminClient();
    const [{ data: p }, user, tips, places, { data: own }] = await Promise.all([
      admin
        .from("profiles")
        .select("username, verified, terms_accepted_at, avatar_path, district_id, suspend_kind, suspend_reason, suspend_until")
        .eq("user_id", userId)
        .maybeSingle(),
      admin.auth.admin.getUserById(userId),
      getAdminTips(userId),
      getPlaces(),
      admin.from("tips").select("id").eq("user_id", userId).eq("approved", true).limit(1),
    ]);
    if (!user.data.user) return null;
    const raw = user.data.user.phone ?? "";
    return {
      advertiser: {
        id: userId,
        label: p?.username ?? "",
        phone: raw ? `0${raw.replace(/^\+?20/, "")}` : "",
        level: verifyLevel(p),
        tips: tips.length,
        avatarUrl: p?.avatar_path ? `${photoBaseUrl()}/${p.avatar_path}` : null,
        tipId: own?.[0]?.id ?? null,
        governorate: governorateOf(places, p?.district_id),
        suspension: activeSuspension(p),
      },
      tips,
      places,
    };
  } catch {
    return null;
  }
}

export type TipOffer = "none" | "discount" | "free";

export type TipItem = Candidate & {
  area: Area;
  link: string | null;
  offer: TipOffer;
  offerQty: number | null;
  offerPercent: number | null;
  priceNow: number | null;
  priceBefore: number | null;
  canNominate: boolean;
  isOwn: boolean;
  body: string;
  areaText: string;
  areaFull: string;
  approved: boolean;
  hasOwner: boolean;
  ownerAvatarUrl: string | null;
  nominatorAvatars: (string | null)[];
};

export type TipsData = { tips: TipItem[]; mine: string[]; account: boolean; places: Places; blocked: string | null };

export type AdminTip = {
  id: string;
  title: string;
  body: string;
  photoUrl: string | null;
  approved: boolean;
  votes: number;
  area: Area;
  link: string | null;
  offer: TipOffer;
  offerQty: number | null;
  offerPercent: number | null;
  priceNow: number | null;
  priceBefore: number | null;
  reports: number;
};

type TipRow = {
  id: string;
  title: string;
  body: string;
  photo_path: string | null;
  approved: boolean;
  votes: number;
  governorate_id: number | null;
  center_id: string | null;
  district_id: string | null;
  link: string | null;
  offer: TipOffer;
  created_at: string;
  user_id: string | null;
  offer_qty: number | null;
  offer_percent: number | null;
  price_now: number | null;
  price_before: number | null;
};

const COLUMNS =
  "id, title, body, photo_path, approved, votes, governorate_id, center_id, district_id, link, offer, created_at, user_id, offer_qty, offer_percent, price_now, price_before";

const DAY = 24 * 60 * 60 * 1000;
const PIN_COUNT = 3;
const PIN_DAYS = 7;

const areaOf = (r: TipRow): Area => ({
  governorateId: r.governorate_id,
  centerId: r.center_id,
  districtId: r.district_id,
});

const EMPTY_PLACES: Places = { governorates: [], centers: [], districts: [] };

export async function getPlaces(): Promise<Places> {
  "use cache";
  cacheLife("days");
  const admin = createAdminClient();
  const [gov, centers, districts] = await Promise.all([
    admin.from("governorates").select("id, name").order("id"),
    admin.from("centers").select("id, governorate_id, name").order("name"),
    fetchDistricts(admin),
  ]);
  return {
    governorates: gov.data ?? [],
    centers: toCenters(centers.data ?? []),
    districts: toDistricts(districts.data ?? []),
  };
}

export async function getTips(limit?: number): Promise<TipsData> {
  return loadTips({ limit });
}

export async function getTipOwner(tipId: string): Promise<string | null> {
  try {
    const { data } = await createAdminClient()
      .from("tips")
      .select("user_id")
      .eq("id", tipId)
      .eq("approved", true)
      .maybeSingle();
    return data?.user_id ?? null;
  } catch {
    return null;
  }
}

export type Advertiser = {
  avatarUrl: string | null;
  phone: string;
  name: string;
  place: string;
  links: SocialLinks;
  level: VerifyLevel;
};

export async function getAdvertiser(ownerId: string): Promise<Advertiser> {
  const admin = createAdminClient();
  try {
    const [profile, auth, places] = await Promise.all([
      getProfile(ownerId),
      admin.auth.admin.getUserById(ownerId),
      getPlaces(),
    ]);
    const raw = auth.data.user?.phone ?? "";
    const district = places.districts.find((d) => d.id === profile?.district_id);
    return {
      avatarUrl: profile?.avatar_path ? `${photoBaseUrl()}/${profile.avatar_path}` : null,
      phone: raw && profile?.phone_public ? `0${raw.replace(/^\+?20/, "")}` : "",
            name: !profile?.phone_public || profile.name_with_phone ? (profile?.username ?? "") : "",
      links: profile?.social_public ? cleanLinks(profile.social_links) : {},
      level: verifyLevel(profile),
      place: district
        ? areaLabel(
            { governorateId: district.governorateId, centerId: district.centerId, districtId: district.id },
            places,
          )
        : "",
    };
  } catch {
    return { avatarUrl: null, phone: "", name: "", place: "", links: {}, level: null };
  }
}

export async function getOwnerTips(ownerId: string, includePending = false): Promise<TipsData> {
  return loadTips({ ownerId, includePending });
}

async function loadTips({
  limit,
  ownerId,
  includePending = false,
}: {
  limit?: number;
  ownerId?: string;
  includePending?: boolean;
}): Promise<TipsData> {
  const user = await getSessionUser();
  try {
    const admin = createAdminClient();
    let query = admin
      .from("tip_results")
      .select(COLUMNS)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (!includePending) query = query.eq("approved", true);
    if (ownerId) query = query.eq("user_id", ownerId);
    const [{ data }, places, profile, { data: held }] = await Promise.all([
      query,
      getPlaces(),
      user ? getProfile(user.id) : null,
      admin
        .from("profiles")
        .select("user_id")
        .in("suspend_kind", ["hide", "full"])
        .or(`suspend_until.is.null,suspend_until.gt.${new Date().toISOString()}`),
    ]);
    const myGovernorate =
      places.districts.find((d) => d.id === profile?.district_id)?.governorateId ?? null;
    // Ads of a temporarily suspended advertiser stay hidden from everyone but their owner.
    const suspended = new Set(includePending ? [] : (held ?? []).map((h) => h.user_id));
    const all: TipRow[] = (data ?? []).filter((r: TipRow) => !r.user_id || !suspended.has(r.user_id));

    // The top nominated ads of my governorate are pinned first, for their first week only.
    const pinned = new Map<string, number>();
    if (myGovernorate !== null) {
      all
        .filter(
          (r) =>
            r.governorate_id === myGovernorate &&
            r.votes > 0 &&
            Date.now() - new Date(r.created_at).getTime() <= PIN_DAYS * DAY,
        )
        .sort((a, b) => b.votes - a.votes)
        .slice(0, PIN_COUNT)
        .forEach((r, i) => pinned.set(r.id, i));
    }
    // Array.sort is stable, so the date order is kept within each rank.
    const rank = (r: TipRow) =>
      pinned.has(r.id)
        ? pinned.get(r.id)! - PIN_COUNT
        : myGovernorate === null
          ? 0
          : r.governorate_id === myGovernorate
            ? 0
            : r.governorate_id === null
              ? 1
              : 2;
    const rows = [...all].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
    const ownerIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => id !== null))];
    const { data: ownerProfiles } = ownerIds.length
      ? await admin.from("profiles").select("user_id, avatar_path").in("user_id", ownerIds)
      : { data: [] };
    const ownerAvatar = new Map(
      (ownerProfiles ?? []).map((p) => [p.user_id, p.avatar_path ? `${photoBaseUrl()}/${p.avatar_path}` : null]),
    );
    // The three latest nominators of each shown ad, for the avatar stack.
    const recent = new Map<string, string[]>();
    if (rows.length > 0) {
      const { data: noms } = await admin
        .from("tip_nominations")
        .select("tip_id, user_id")
        .in("tip_id", rows.map((r) => r.id))
        .order("created_at", { ascending: false })
        .limit(1000);
      for (const n of noms ?? []) {
        const list = recent.get(n.tip_id) ?? [];
        if (list.length < 3) recent.set(n.tip_id, [...list, n.user_id]);
      }
    }
    const nomIds = [...new Set([...recent.values()].flat())];
    const { data: nomProfiles } = nomIds.length
      ? await admin.from("profiles").select("user_id, avatar_path").in("user_id", nomIds)
      : { data: [] };
    const nomAvatar = new Map(
      (nomProfiles ?? []).map((p) => [p.user_id, p.avatar_path ? `${photoBaseUrl()}/${p.avatar_path}` : null]),
    );
    // Each governorate (and "all Egypt") has its own total, so percentages are relative to its own ads.
    const shareRows: Pick<TipRow, "governorate_id" | "votes">[] = ownerId
      ? ((
          await admin
            .from("tip_results")
            .select("governorate_id, votes")
            .eq("approved", true)
            .gt("expires_at", new Date().toISOString())
        ).data ?? [])
      : all;
    const totals = new Map<number | null, number>();
    for (const r of shareRows) totals.set(r.governorate_id, (totals.get(r.governorate_id) ?? 0) + r.votes);
    const tips = rows.map<TipItem>((r) => {
      const area = areaOf(r);
      const areaFull = areaLabel(area, places);
      const areaText = governorateLabel(area, places);
      return {
        id: r.id,
        name: r.title,
        photoUrl: r.photo_path ? `${photoBaseUrl()}/${r.photo_path}` : null,
        votes: r.votes,
        percent: totals.get(r.governorate_id) ? Math.round((r.votes / totals.get(r.governorate_id)!) * 100) : 0,
        details: [r.body, areaText].filter(Boolean),
        body: r.body,
        areaText,
        areaFull,
        approved: r.approved,
        hasOwner: r.user_id !== null,
        ownerAvatarUrl: r.user_id ? (ownerAvatar.get(r.user_id) ?? null) : null,
        nominatorAvatars: (recent.get(r.id) ?? []).map((id) => nomAvatar.get(id) ?? null),
        area,
        link: r.link,
        offer: r.offer,
        offerQty: r.offer_qty,
        offerPercent: r.offer_percent,
        priceNow: r.price_now === null ? null : Number(r.price_now),
        priceBefore: r.price_before === null ? null : Number(r.price_before),
        isOwn: Boolean(user) && r.user_id === user?.id,
        canNominate: !user || r.governorate_id === null || r.governorate_id === myGovernorate,
      };
    });

    let mine: string[] = [];
    if (user && rows.length > 0) {
      const { data: n } = await admin
        .from("tip_nominations")
        .select("tip_id")
        .eq("user_id", user.id)
        .in("tip_id", rows.map((r) => r.id));
      mine = (n ?? []).map((x) => x.tip_id);
    }
    const hold = activeSuspension(profile);
    const blocked = hold && hold.kind !== "hide" ? `أنت موقوف عن النشر ${untilText(hold.until)}` : null;
    return { tips, mine, account: Boolean(user), places, blocked };
  } catch {
    return { tips: [], mine: [], account: Boolean(user), places: EMPTY_PLACES, blocked: null };
  }
}

export async function getAdminTips(ownerId?: string): Promise<AdminTip[]> {
  try {
    const admin = createAdminClient();
    let query = admin
      .from("tip_results")
      .select(COLUMNS)
      .order("approved", { ascending: true })
      .order("created_at", { ascending: false });
    if (ownerId) query = query.eq("user_id", ownerId);
    const [{ data }, { data: reports }] = await Promise.all([query, admin.from("tip_reports").select("tip_id")]);
    const reportCount = new Map<string, number>();
    for (const r of reports ?? []) reportCount.set(r.tip_id, (reportCount.get(r.tip_id) ?? 0) + 1);
    return (data ?? []).map((r: TipRow) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      photoUrl: r.photo_path ? `${photoBaseUrl()}/${r.photo_path}` : null,
      approved: r.approved,
      votes: r.votes,
      area: areaOf(r),
      link: r.link,
      offer: r.offer,
      offerQty: r.offer_qty,
      offerPercent: r.offer_percent,
      priceNow: r.price_now === null ? null : Number(r.price_now),
      priceBefore: r.price_before === null ? null : Number(r.price_before),
      reports: reportCount.get(r.id) ?? 0,
    }));
  } catch {
    return [];
  }
}
