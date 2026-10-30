import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSessionUser } from "@/lib/profile";
import { areaLabel, type Area, type Places } from "@/lib/area";
import { getPlaces } from "@/lib/tips-data";
import { photoBaseUrl } from "@/lib/voting-data";
import { CONTEST_CATEGORIES, categoryOf, type ContestLevel } from "@/lib/contests";
import type { Candidate } from "@/lib/voting";

const DAY = 24 * 60 * 60 * 1000;

export type ContestItem = Candidate & {
  categoryId: string;
  categoryLabel: string;
  specialty: string | null;
  level: ContestLevel;
  areaText: string;
  daysLeft: number | null;
  groupSize: number;
  rank: number;
  isOwn: boolean;
  canVote: boolean;
  voted: boolean;
  groupVoted: boolean;
};

export type OutContender = {
  id: string;
  name: string;
  categoryLabel: string;
  areaText: string;
  photoUrl: string | null;
};

export type ContestsData = {
  items: ContestItem[];
  out: OutContender[];
  account: boolean;
  places: Places;
};

type Row = {
  id: string;
  user_id: string;
  name: string;
  photo_path: string | null;
  category: string;
  specialty: string | null;
  level: ContestLevel;
  governorate_id: number | null;
  center_id: string | null;
  district_id: string | null;
  status: "active" | "out";
  expires_at: string | null;
  created_at: string;
  votes: number;
};

export const settleContests = async () => {
  await createAdminClient().rpc("settle_contests");
};

export async function getContests(): Promise<ContestsData> {
  const user = await getSessionUser();
  try {
    const admin = createAdminClient();
    await settleContests().catch(() => undefined);
    const [{ data }, places, profile, { data: myVotes }] = await Promise.all([
      admin.from("contender_results").select("*").order("created_at", { ascending: false }).limit(500),
      getPlaces(),
      user ? getProfile(user.id) : null,
      user
        ? admin.from("contender_votes").select("contender_id, category, level").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    const rows = (data ?? []) as Row[];
    const home = places.districts.find((d) => d.id === profile?.district_id);
    const areaOf = (r: Row): Area => ({ governorateId: r.governorate_id, centerId: r.center_id, districtId: r.district_id });
    const groupKey = (r: Row) => `${r.category}|${r.level}|${r.governorate_id}|${r.center_id}|${r.district_id}`;

    const active = rows.filter((r) => r.status === "active");
    const groups = new Map<string, Row[]>();
    for (const r of active) groups.set(groupKey(r), [...(groups.get(groupKey(r)) ?? []), r]);
    for (const list of groups.values()) list.sort((a, b) => b.votes - a.votes);

    const waitingByCategory = new Map<string, number>();
    for (const r of active) {
      if (!r.expires_at) waitingByCategory.set(r.category, (waitingByCategory.get(r.category) ?? 0) + 1);
    }

    const votedIds = new Set((myVotes ?? []).map((v) => v.contender_id));
    const votedGroups = new Set((myVotes ?? []).map((v) => `${v.category}|${v.level}`));
    const order = (id: string) => CONTEST_CATEGORIES.findIndex((c) => c.id === id);

    const canVote = (r: Row) =>
      r.level === "egypt" ||
      (r.level === "governorate" && home?.governorateId === r.governorate_id) ||
      (r.level === "center" && home?.centerId === r.center_id) ||
      (r.level === "village" && home?.id === r.district_id);

    const items = active
      .map<ContestItem>((r) => {
        const list = groups.get(groupKey(r))!;
        const total = list.reduce((s, x) => s + x.votes, 0);
        const cat = categoryOf(r.category);
        return {
          id: r.id,
          name: r.name,
          photoUrl: r.photo_path ? `${photoBaseUrl()}/${r.photo_path}` : null,
          votes: r.votes,
          percent: total ? Math.round((r.votes / total) * 100) : 0,
          categoryId: r.category,
          categoryLabel: cat?.label ?? "",
          specialty: r.specialty,
          level: r.level,
          areaText: areaLabel(areaOf(r), places),
          daysLeft: r.expires_at
            ? Math.max(1, Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / DAY))
            : null,
          groupSize: r.expires_at ? list.length : waitingByCategory.get(r.category) ?? 0,
          rank: list.indexOf(r) + 1,
          isOwn: r.user_id === user?.id,
          canVote: r.expires_at !== null && canVote(r),
          voted: votedIds.has(r.id),
          groupVoted: votedGroups.has(`${r.category}|${r.level}`),
        };
      })
      .sort(
        (a, b) =>
          order(a.categoryId) - order(b.categoryId) ||
          a.level.localeCompare(b.level) ||
          a.areaText.localeCompare(b.areaText) ||
          a.rank - b.rank,
      );

    const out = rows
      .filter((r) => r.status === "out" && r.user_id === user?.id)
      .map<OutContender>((r) => ({
        id: r.id,
        name: r.name,
        categoryLabel: categoryOf(r.category)?.label ?? "",
        areaText: areaLabel(areaOf(r), places),
        photoUrl: r.photo_path ? `${photoBaseUrl()}/${r.photo_path}` : null,
      }));
    return { items, out, account: Boolean(user), places };
  } catch {
    return { items: [], out: [], account: Boolean(user), places: { governorates: [], centers: [], districts: [] } };
  }
}
