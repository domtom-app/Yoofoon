import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type MyNotification = { id: string; message: string; href: string | null; createdAt: string };

// A failed notification must never break the action that triggered it.
export async function notify(userId: string | null | undefined, message: string, href?: string) {
  if (!userId) return;
  try {
    await createAdminClient().from("notifications").insert({ user_id: userId, message, href: href ?? null });
  } catch {}
}

export async function getMyNotifications(userId: string): Promise<MyNotification[]> {
  try {
    const { data } = await createAdminClient()
      .from("notifications")
      .select("id, message, href, created_at")
      .eq("user_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    return (data ?? []).map((n) => ({ id: n.id, message: n.message, href: n.href, createdAt: n.created_at }));
  } catch {
    return [];
  }
}
