import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { removePhoto } from "@/lib/admin-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";

const DAY = 24 * 60 * 60 * 1000;

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
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  // Warn owners a day before expiry and remind winners whose gift is still waiting after 3 days.
  const [{ data: soon }, { data: waiting }] = await Promise.all([
    admin
      .from("tip_results")
      .select("title, user_id")
      .eq("approved", true)
      .not("user_id", "is", null)
      .gt("expires_at", iso(now))
      .lte("expires_at", iso(now + DAY)),
    admin
      .from("tip_gifts")
      .select("winner_id, title")
      .eq("status", "pending")
      .gt("created_at", iso(now - 4 * DAY))
      .lte("created_at", iso(now - 3 * DAY)),
  ]);
  await Promise.all([
    ...(soon ?? []).map((t) => notify(t.user_id, `ينتهي إعلانك «${t.title}» خلال يوم`, "/profile")),
    ...(waiting ?? []).map((g) => notify(g.winner_id, `هديتك من «${g.title}» بانتظار ردك`, "/profile")),
  ]);

  const { data, error } = await admin
    .from("tip_results")
    .select("id, photo_path, title, user_id")
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
    await Promise.all(expired.map((t) => notify(t.user_id, `انتهى إعلانك «${t.title}» وتم حذفه`)));
    revalidatePath("/");
    revalidatePath("/parliament");
    revalidatePath("/tips");
    revalidatePath("/admin");
  }
  return NextResponse.json({ deleted: expired.length });
}
