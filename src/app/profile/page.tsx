import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PageShell } from "@/components/page-shell";
import { ProfileView } from "@/components/profile-view";
import { getProfile, getSessionUser } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysUntilChange, toCenters, toDistricts } from "@/lib/voting";
import { getMyVotes, photoBaseUrl } from "@/lib/voting-data";
import { getMyGifts } from "@/lib/gifts-data";
import { getMyNotifications } from "@/lib/notifications";
import { getOwnerTips } from "@/lib/tips-data";

export const metadata = { title: "ملفي" };

async function Profile() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [profile, gov, centers, districts, votes, myTips, gifts, notifications] = await Promise.all([
    getProfile(user.id),
    admin.from("governorates").select("id, name").order("id"),
    admin.from("centers").select("id, governorate_id, name").order("name"),
    admin.from("districts").select("id, governorate_id, center_id, name").order("name"),
    getMyVotes(),
    getOwnerTips(user.id, true),
    getMyGifts(user.id),
    getMyNotifications(user.id),
  ]);
  if (gov.error || centers.error || districts.error) {
    return <p className="py-20 text-center text-muted-foreground">تعذّر التحميل</p>;
  }

  return (
    <ProfileView
      phone={user.phone}
      phonePublic={profile?.phone_public ?? false}
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
      notifications={notifications}
    />
  );
}

export default function ProfilePage() {
  return (
    <PageShell>
      <Profile />
    </PageShell>
  );
}
