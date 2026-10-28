"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export async function dismissNotifications(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  try {
    await createAdminClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  } catch {
    return;
  }
  revalidatePath("/profile");
}
