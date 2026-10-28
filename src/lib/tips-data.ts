import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSessionUser } from "@/lib/profile";
import { areaLabel, type Area, type Places } from "@/lib/area";
import { toCenters, toDistricts, type Candidate } from "@/lib/voting";
import { photoBaseUrl } from "@/lib/voting-data";

export type TipOffer = "none" | "discount" | "free";

export type TipItem = Candidate & {
  area: Area;
  link: string | null;
  offer: TipOffer;
  offerQty: number | null;
  offerPercent: number | null;
  canNominate: boolean;
  body: string;
  areaText: string;
  approved: boolean;
  hasOwner: boolean;
};

export type TipsData = { tips: TipItem[]; mine: string[]; account: boolean; places: Places };

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
};

const COLUMNS =
  "id, title, body, photo_path, approved, votes, governorate_id, center_id, district_id, link, offer, created_at, user_id, offer_qty, offer_percent";

const DAY = 24 * 60 * 60 * 1000;
const PIN_COUNT = 3;
const PIN_DAYS = 7;

const areaOf = (r: TipRow): Area => ({
  governorateId: r.governorate_id,
  centerId: r.center_id,
  districtId: r.district_id,
});

const EMPTY_PLACES: Places = { governorates: [], centers: [], districts: [] };

async function getPlaces(): Promise<Places> {
  const admin = createAdminClient();
  const [gov, centers, districts] = await Promise.all([
    admin.from("governorates").select("id, name").order("id"),
    admin.from("centers").select("id, governorate_id, name").order("name"),
    admin.from("districts").select("id, governorate_id, center_id, name").order("name"),
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

export type Advertiser = { avatarUrl: string | null; phone: string; place: string };

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
      place: district
        ? [
            places.governorates.find((g) => g.id === district.governorateId)?.name,
            areaLabel(
              { governorateId: district.governorateId, centerId: district.centerId, districtId: district.id },
              places,
            ),
          ]
            .filter(Boolean)
            .join(" - ")
        : "",
    };
  } catch {
    return { avatarUrl: null, phone: "", place: "" };
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
    const [{ data }, places, profile] = await Promise.all([
      query,
      getPlaces(),
      user ? getProfile(user.id) : null,
    ]);
    const myGovernorate =
      places.districts.find((d) => d.id === profile?.district_id)?.governorateId ?? null;
    const all: TipRow[] = data ?? [];

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
      const areaText = areaLabel(area, places);
      return {
        id: r.id,
        name: r.title,
        photoUrl: r.photo_path ? `${photoBaseUrl()}/${r.photo_path}` : null,
        votes: r.votes,
        percent: totals.get(r.governorate_id) ? Math.round((r.votes / totals.get(r.governorate_id)!) * 100) : 0,
        details: [r.body, areaText].filter(Boolean),
        body: r.body,
        areaText,
        approved: r.approved,
        hasOwner: r.user_id !== null,
        area,
        link: r.link,
        offer: r.offer,
        offerQty: r.offer_qty,
        offerPercent: r.offer_percent,
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
    return { tips, mine, account: Boolean(user), places };
  } catch {
    return { tips: [], mine: [], account: Boolean(user), places: EMPTY_PLACES };
  }
}

export async function getAdminTips(): Promise<AdminTip[]> {
  try {
    const admin = createAdminClient();
    const [{ data }, { data: reports }] = await Promise.all([
      admin
        .from("tip_results")
        .select(COLUMNS)
        .order("approved", { ascending: true })
        .order("created_at", { ascending: false }),
      admin.from("tip_reports").select("tip_id"),
    ]);
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
      reports: reportCount.get(r.id) ?? 0,
    }));
  } catch {
    return [];
  }
}
