"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/profile";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminState } from "@/app/actions/admin";

const schema = z.object({
  tipId: z.string().uuid(),
  reason: z.enum(["misleading", "inappropriate", "spam", "other"]),
});

export async function reportTip(tipId: string, reason: string): Promise<AdminState> {
  const parsed = schema.safeParse({ tipId, reason });
  if (!parsed.success) return { error: "غير صالح" };
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  if (!(await checkRateLimit(`report:${user.id}`))) return { error: "حاول لاحقًا" };
  try {
    const admin = createAdminClient();
    const { data: tip } = await admin.from("tips").select("user_id").eq("id", parsed.data.tipId).maybeSingle();
    if (!tip) return { error: "الإعلان غير موجود" };
    if (tip.user_id === user.id) return { error: "غير مسموح" };
    const { error } = await admin
      .from("tip_reports")
      .insert({ tip_id: parsed.data.tipId, user_id: user.id, reason: parsed.data.reason });
    if (error) return { error: error.code === "23505" ? "سبق إبلاغك" : "تعذّر الإرسال" };
  } catch {
    return { error: "تعذّر الإرسال" };
  }
  return { ok: true };
}
