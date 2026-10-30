import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDistricts } from "@/lib/districts-query";
import { getSettings, getTipsHeading } from "@/lib/settings";
import { getAdminAdvertisers, getAdminTips, getAdminUsers, getPlaces, type AdminAdvertiser, type AdminTip } from "@/lib/tips-data";
import { getAdminContests, type AdminContender } from "@/lib/contests-data";
import { getMemberData, getVotingData, photoBaseUrl } from "@/lib/voting-data";
import { DEFAULT_HEADINGS, toCenters, toDistricts, type Candidate, type Center, type District, type Governorate } from "@/lib/voting";

export type AdminMember = {
  id: string;
  name: string;
  photoUrl: string | null;
  governorateId: number;
  districtId: string | null;
};

export type VotingWindows = {
  president: { startsAt: string | null; endsAt: string | null; heading: string; published: boolean };
  parliament: { startsAt: string | null; endsAt: string | null; heading: string; published: boolean };
};

export type AdminData = {
  candidates: Candidate[];
  memberStats: Candidate[];
  members: AdminMember[];
  governorates: Governorate[];
  centers: Center[];
  districts: District[];
  windows: VotingWindows;
  tips: AdminTip[];
  tipsHeading: string;
  advertisers: AdminAdvertiser[];
  users: AdminAdvertiser[];
  contests: AdminContender[];
};

export async function getAdminData(): Promise<AdminData | null> {
  const [voting, memberData] = await Promise.all([getVotingData(), getMemberData()]);
  if (!voting.ok || !memberData.ok) return null;

  try {
    const admin = createAdminClient();
    const [gov, centers, districts, members, settings, tips, tipsHeading, advertisers, users, places] = await Promise.all([
      admin.from("governorates").select("id, name").order("id"),
      admin.from("centers").select("id, governorate_id, name").order("name"),
      fetchDistricts(admin),
      admin
        .from("members")
        .select("id, name, photo_path, governorate_id, district_id")
        .order("created_at"),
      getSettings(),
      getAdminTips(),
      getTipsHeading(),
      getAdminAdvertisers(),
      getAdminUsers(),
      getPlaces(),
    ]);
    const contests = await getAdminContests(places).catch(() => []);
    if (gov.error || centers.error || districts.error || members.error) return null;

    const base = photoBaseUrl();
    const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
    return {
      candidates: voting.candidates,
      memberStats: memberData.candidates,
      members: (members.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        photoUrl: m.photo_path ? `${base}/${m.photo_path}` : null,
        governorateId: m.governorate_id,
        districtId: m.district_id,
      })),
      governorates: gov.data ?? [],
      centers: toCenters(centers.data ?? []),
      districts: toDistricts(districts.data ?? []),
      windows: {
        president: {
          startsAt: iso(settings?.votingStartsAt),
          endsAt: iso(settings?.votingEndsAt),
          heading: settings?.votingHeading ?? DEFAULT_HEADINGS.president,
          published: settings?.votingPublished ?? true,
        },
        parliament: {
          startsAt: iso(settings?.parliamentStartsAt),
          endsAt: iso(settings?.parliamentEndsAt),
          heading: settings?.parliamentHeading ?? DEFAULT_HEADINGS.parliament,
          published: settings?.parliamentPublished ?? true,
        },
      },
      tips,
      tipsHeading,
      advertisers,
      users,
      contests,
    };
  } catch {
    return null;
  }
}
