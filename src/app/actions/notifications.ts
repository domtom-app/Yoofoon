"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/profile";
import { markTipsSeen } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markNotificationRead(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  try {
    if (id === "new-tips") await markTipsSeen(user.id);
    else {
      await createAdminClient()
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .is("read_at", null);
    }
  } catch {
    return;
  }
  revalidatePath("/", "layout");
}

export async function dismissNotifications(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  try {
    await markTipsSeen(user.id);
    await createAdminClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  } catch {
    return;
  }
  revalidatePath("/", "layout");
}
