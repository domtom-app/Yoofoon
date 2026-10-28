import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function isAdmin(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const meta = data?.claims?.app_metadata as { role?: string } | undefined;
  return meta?.role === "admin";
}
