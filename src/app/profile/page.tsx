import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PageShell } from "@/components/page-shell";
import { ProfileView } from "@/components/profile-view";
import { getProfile, getSessionUser } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysUntilChange, toCenters, toDistricts } from "@/lib/voting";
import { getMyVotes, photoBaseUrl } from "@/lib/voting-data";
import { fetchDistricts } from "@/lib/districts-query";
import { getMyGifts } from "@/lib/gifts-data";
import { getOwnerTips } from "@/lib/tips-data";
import { cleanLinks } from "@/lib/social";
import { verifyLevel } from "@/components/verified-badge";

export const metadata = { title: "Ù…Ù„ÙÙŠ" };

async function Profile() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [profile, gov, centers, districts, votes, myTips, gifts] = await Promise.all([
    getProfile(user.id),
    admin.from("governorates").select("id, name").order("id"),
    admin.from("centers").select("id, governorate_id, name").order("name"),
    fetchDistricts(admin),
    getMyVotes(),
    getOwnerTips(user.id, true),
    getMyGifts(user.id),
  ]);
  if (gov.error || centers.error || districts.error) {
    return <p className="py-20 text-center text-muted-foreground">ØªØ¹Ø°Ù‘Ø± Ø§Ù„ØªØ­Ù…ÙŠÙ„</p>;
  }

  return (
    <ProfileView
      phone={user.phone}
      phonePublic={profile?.phone_public ?? false}
      username={profile?.username ?? ""}
      nameWithPhone={profile?.name_with_phone ?? false}
      socialPublic={profile?.social_public ?? false}
      social={cleanLinks(profile?.social_links)}
      avatarUrl={profile?.avatar_path ? `${photoBaseUrl()}/${profile.avatar_path}` : null}
      districtId={profile?.district_id ?? null}
      daysLeft={profile?.district_id ? daysUntilChange(profile.district_changed_at, new Date()) : 0}
      governorates={gov.data ?? []}
      centers={toCenters(centers.data ?? [])}
      districts={toDistricts(districts.data ?? [])}
      votes={votes}
      tips={myTips.tips}
      places={myTips.places}
      gifts={gifts}
      level={verifyLevel(profile)}
    />
  );
}

export default function ProfilePage() {
  return (
    <PageShell back={<BackButton fallback="/" />}>
      <Profile />
    </PageShell>
  );
}
