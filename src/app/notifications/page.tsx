import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { NotificationList } from "@/components/notification-list";
import { PageShell } from "@/components/page-shell";
import { getMyNotifications } from "@/lib/notifications";
import { getSessionUser } from "@/lib/profile";

export const metadata = { title: "Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª" };

async function Notifications() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <NotificationList items={await getMyNotifications(user.id)} />;
}

export default function NotificationsPage() {
  return (
    <PageShell back={<BackButton fallback="/" />}>
      <Notifications />
    </PageShell>
  );
}
