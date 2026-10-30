import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type MyNotification = {
  id: string;
  message: string;
  href: string | null;
  createdAt: string;
  unread: boolean;
};

// A failed notification must never break the action that triggered it.
export async function notify(userId: string | null | undefined, message: string, href?: string) {
  if (!userId) return;
  try {
    await createAdminClient().from("notifications").insert({ user_id: userId, message, href: href ?? null });
  } catch {}
}

// Repeated events of the same kind fold into one unread notification with a running count.
export async function notifyGrouped(
  userId: string | null | undefined,
  groupKey: string,
  message: (count: number) => string,
  href?: string,
) {
  if (!userId) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("notifications")
      .select("id, count")
      .eq("user_id", userId)
      .eq("group_key", groupKey)
      .is("read_at", null)
      .maybeSingle();
    if (data) {
      const count = data.count + 1;
      await admin
        .from("notifications")
        .update({ count, message: message(count), created_at: new Date().toISOString() })
        .eq("id", data.id);
      return;
    }
    await admin
      .from("notifications")
      .insert({ user_id: userId, message: message(1), href: href ?? null, group_key: groupKey, count: 1 });
  } catch {}
}

export async function adminIds(): Promise<string[]> {
  const ids: string[] = [];
  try {
    const admin = createAdminClient();
    for (let page = 1; page <= 5; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = data?.users ?? [];
      for (const u of users) {
        if ((u.app_metadata as { role?: string } | undefined)?.role === "admin") ids.push(u.id);
      }
      if (users.length < 200) break;
    }
  } catch {}
  return ids;
}

export async function notifyAdmins(groupKey: string, message: (count: number) => string, href: string) {
  await Promise.all((await adminIds()).map((id) => notifyGrouped(id, groupKey, message, href)));
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count } = await createAdminClient()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    return (count ?? 0) + ((await newTipsCount(userId)) > 0 ? 1 : 0);
  } catch {
    return 0;
  }
}

const NEW_TIPS_FALLBACK_MS = 3 * 86_400_000;

// Ads approved since the user last looked, counted on read so no per-user rows are written.
async function newTipsCount(userId: string): Promise<number> {
  return (await newTips(userId)).count;
}

async function newTips(userId: string): Promise<{ count: number; href: string }> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("tips_seen_at")
      .eq("user_id", userId)
      .maybeSingle();
    const since = profile?.tips_seen_at ?? new Date(Date.now() - NEW_TIPS_FALLBACK_MS).toISOString();
    const { data, count } = await admin
      .from("tips")
      .select("id, user_id", { count: "exact" })
      .eq("approved", true)
      .gt("approved_at", since)
      .or(`user_id.is.null,user_id.neq.${userId}`)
      .order("approved_at", { ascending: false })
      .limit(1);
    const latest = data?.[0];
    return { count: count ?? 0, href: latest?.user_id ? `/advertiser/${latest.id}` : "/tips" };
  } catch {
    return { count: 0, href: "/tips" };
  }
}

export async function getMyNotifications(userId: string): Promise<MyNotification[]> {
  const { count: fresh, href: freshHref } = await newTips(userId);
  try {
    const { data } = await createAdminClient()
      .from("notifications")
      .select("id, message, href, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    const items = (data ?? []).map((n) => ({
      id: n.id,
      message: n.message,
      href: n.href,
      createdAt: n.created_at,
      unread: n.read_at === null,
    }));
    if (fresh > 0) {
      items.unshift({
        id: "new-tips",
        message: fresh === 1 ? "إعلان جديد في فيد واستفيد" : `${fresh} إعلانات جديدة في فيد واستفيد`,
        href: freshHref,
        createdAt: new Date().toISOString(),
        unread: true,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function markTipsSeen(userId: string) {
  try {
    await createAdminClient()
      .from("profiles")
      .upsert({ user_id: userId, tips_seen_at: new Date().toISOString() });
  } catch {}
}
