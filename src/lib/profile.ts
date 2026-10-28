import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; phone: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const raw = typeof claims.phone === "string" ? claims.phone : "";
  return { id: claims.sub, phone: raw ? `0${raw.replace(/^\+?20/, "")}` : "" };
}

export async function getProfile(userId: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("district_id, district_changed_at, avatar_path, phone_public")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
