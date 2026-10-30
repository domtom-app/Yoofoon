import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoBaseUrl } from "@/lib/voting-data";

export type PublicPerson = { userId: string; name: string; avatarUrl: string | null; governorate: string };

// Name, avatar and governorate only: never a phone number. Keeps the order of `ids`.
export async function publicPeople(ids: string[]): Promise<PublicPerson[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, avatar_path, username, district_id")
    .in("user_id", ids);
  const districtIds = (profiles ?? []).map((p) => p.district_id).filter((d): d is string => Boolean(d));
  const [{ data: districts }, { data: govs }] = await Promise.all([
    districtIds.length
      ? admin.from("districts").select("id, governorate_id").in("id", districtIds)
      : Promise.resolve({ data: [] }),
    admin.from("governorates").select("id, name"),
  ]);
  const govName = new Map((govs ?? []).map((g) => [g.id, g.name]));
  const govOfDistrict = new Map((districts ?? []).map((d) => [d.id, govName.get(d.governorate_id) ?? ""]));
  const profileOf = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return ids.map((uid) => {
    const p = profileOf.get(uid);
    return {
      userId: uid,
      name: p?.username ?? "مستخدم",
      avatarUrl: p?.avatar_path ? `${photoBaseUrl()}/${p.avatar_path}` : null,
      governorate: p?.district_id ? (govOfDistrict.get(p.district_id) ?? "") : "",
    };
  });
}
