import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSessionUser } from "@/lib/profile";
import { toCandidates, toCenters, toDistricts, toMembers, type Candidate, type Center, type District, type Governorate } from "@/lib/voting";

export const DEVICE_COOKIE = "yf_device";

export const DISTRICT_COOKIE = "yf_district";

export function photoBaseUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/candidates`;
}

export type VotingData =
  | { ok: true; candidates: Candidate[]; votedId: string | null }
  | { ok: false };

export type ParliamentData =
  | {
      ok: true;
      governorates: Governorate[];
      centers: Center[];
      districts: District[];
      districtId: string | null;
      account: boolean;
      members: (Candidate & { districtId: string })[];
      votedId: string | null;
    }
  | { ok: false };

const uuid = z.string().uuid();

// The voter's own vote: by account when signed in, otherwise by device among anonymous votes.
async function myVotedId(table: "votes" | "member_votes"): Promise<string | null> {
  const column = table === "votes" ? "candidate_id" : "member_id";
  const user = await getSessionUser();
  const device = uuid.safeParse((await cookies()).get(DEVICE_COOKIE)?.value);
  if (!user && !device.success) return null;

  const query = createAdminClient().from(table).select(column);
  const { data, error } = await (user
    ? query.eq("user_id", user.id)
    : query.eq("device_id", device.data!).is("user_id", null)
  ).maybeSingle();
  if (error) throw error;
  return (data as unknown as Record<string, string> | null)?.[column] ?? null;
}

// A signed-in voter's district comes from their profile; otherwise from the device cookie.
export async function homeDistrictId(): Promise<string | null> {
  const user = await getSessionUser();
  if (user) {
    const profile = await getProfile(user.id);
    if (profile?.district_id) return profile.district_id;
  }
  const chosen = uuid.safeParse((await cookies()).get(DISTRICT_COOKIE)?.value);
  return chosen.success ? chosen.data : null;
}

// The voter's constituency is the one they chose, or the one of the member they already voted for.
export async function getParliamentData(): Promise<ParliamentData> {
  try {
    const admin = createAdminClient();
    const jar = await cookies();
    const chosen = uuid.safeParse(jar.get(DISTRICT_COOKIE)?.value);

    const [gov, centers, districts, votedMember, user] = await Promise.all([
      admin.from("governorates").select("id, name").order("id"),
      admin.from("centers").select("id, governorate_id, name").order("name"),
      admin.from("districts").select("id, governorate_id, center_id, name").order("name"),
      myVotedId("member_votes"),
      getSessionUser(),
    ]);
    if (gov.error || centers.error || districts.error) return { ok: false };

    const profile = user ? await getProfile(user.id) : null;
    const votedId = votedMember;
    let districtId = profile?.district_id ?? (chosen.success ? chosen.data : null);

    if (votedId) {
      const { data } = await admin
        .from("members")
        .select("district_id")
        .eq("id", votedId)
        .maybeSingle();
      districtId = data?.district_id ?? districtId;
    }
    if (districtId && !(districts.data ?? []).some((d) => d.id === districtId)) districtId = null;

    const { data: rows, error } = await admin
      .from("member_results")
      .select("id, name, photo_path, district, center, district_id, governorate, votes")
      .order("name");
    if (error) return { ok: false };

    // Percentages are computed inside each district.
    const byDistrict = new Map<string, NonNullable<typeof rows>>();
    for (const r of rows ?? []) {
      if (!r.district_id) continue;
      byDistrict.set(r.district_id, [...(byDistrict.get(r.district_id) ?? []), r]);
    }
    const members = [...byDistrict].flatMap(([id, list]) =>
      toMembers(list, photoBaseUrl()).map((m) => ({ ...m, districtId: id })),
    );

    return {
      ok: true,
      governorates: gov.data ?? [],
      centers: toCenters(centers.data ?? []),
      districts: toDistricts(districts.data ?? []),
      districtId,
      account: Boolean(user),
      members,
      votedId,
    };
  } catch {
    return { ok: false };
  }
}

export type MyVotes = { president: Candidate | null; member: Candidate | null };

// The voter's own choices, with percentages computed the same way as on the voting pages.
export async function getMyVotes(): Promise<MyVotes> {
  const empty: MyVotes = { president: null, member: null };

  try {
    const admin = createAdminClient();
    const [candidateId, memberId] = await Promise.all([myVotedId("votes"), myVotedId("member_votes")]);

    let president: Candidate | null = null;
    if (candidateId) {
      const { data } = await admin.from("candidate_results").select("id, name, photo_path, votes");
      president = toCandidates(data ?? [], photoBaseUrl()).find((c) => c.id === candidateId) ?? null;
    }

    let member: Candidate | null = null;
    if (memberId) {
      const { data: own } = await admin
        .from("members")
        .select("district_id")
        .eq("id", memberId)
        .maybeSingle();
      if (own?.district_id) {
        const { data } = await admin
          .from("member_results")
          .select("id, name, photo_path, district, center, district_id, governorate, votes")
          .eq("district_id", own.district_id);
        member = toMembers(data ?? [], photoBaseUrl()).find((c) => c.id === memberId) ?? null;
      }
    }
    return { president, member };
  } catch {
    return empty;
  }
}

export async function getMemberData(): Promise<VotingData> {
  try {
    const admin = createAdminClient();
    const [results, votedId] = await Promise.all([
      admin
        .from("member_results")
        .select("id, name, photo_path, district, center, district_id, governorate, votes")
        .order("name"),
      myVotedId("member_votes"),
    ]);

    if (results.error) return { ok: false };

    return {
      ok: true,
      candidates: toMembers(results.data ?? [], photoBaseUrl()),
      votedId,
    };
  } catch {
    return { ok: false };
  }
}

export async function getVotingData(): Promise<VotingData> {
  try {
    const admin = createAdminClient();

    const [results, votedId] = await Promise.all([
      admin
        .from("candidate_results")
        .select("id, name, photo_path, votes")
        .order("position")
        .order("name"),
      myVotedId("votes"),
    ]);

    if (results.error) return { ok: false };

    const photoBase = photoBaseUrl();
    return {
      ok: true,
      candidates: toCandidates(results.data ?? [], photoBase),
      votedId,
    };
  } catch {
    return { ok: false };
  }
}
