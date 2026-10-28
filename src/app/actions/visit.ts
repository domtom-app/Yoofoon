"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEVICE_COOKIE } from "@/lib/voting-data";

const idSchema = z.string().uuid();

export async function trackVisit(): Promise<number | null> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  const valid = idSchema.safeParse(existing).success;
  const deviceId = valid ? existing! : randomUUID();

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("visitors")
      .upsert({ device_id: deviceId }, { onConflict: "device_id", ignoreDuplicates: true });
    if (error) return null;

    if (!valid) {
      jar.set(DEVICE_COOKIE, deviceId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365 * 10,
      });
    }

    const { count, error: countError } = await admin
      .from("visitors")
      .select("device_id", { count: "exact" })
      .limit(1);
    return countError ? null : count;
  } catch {
    return null;
  }
}
