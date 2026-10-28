import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { removePhoto } from "@/lib/admin-storage";
import { createAdminClient } from "@/lib/supabase/admin";

// Deletes expired tips together with their photos and nominations. Called daily by Vercel Cron.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const sent = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    sent.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tip_results")
    .select("id, photo_path")
    .lte("expires_at", new Date().toISOString());
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });

  const expired = data ?? [];
  if (expired.length > 0) {
    const { error: deleteError } = await admin
      .from("tips")
      .delete()
      .in("id", expired.map((t) => t.id));
    if (deleteError) return NextResponse.json({ error: "failed" }, { status: 500 });
    await Promise.all(expired.map((t) => removePhoto(t.photo_path)));
    revalidatePath("/");
    revalidatePath("/parliament");
    revalidatePath("/tips");
    revalidatePath("/admin");
  }
  return NextResponse.json({ deleted: expired.length });
}
