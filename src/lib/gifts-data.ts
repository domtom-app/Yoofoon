import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoBaseUrl } from "@/lib/voting-data";

export type MyGift = {
  id: string;
  status: "pending" | "accepted";
  createdAt: string;
  tipId: string | null;
  title: string;
  body: string;
  photoUrl: string | null;
  offerQty: number | null;
  hasOwner: boolean;
};

export async function getMyGifts(userId: string): Promise<MyGift[]> {
  try {
    const admin = createAdminClient();
    const { data: gifts } = await admin
      .from("tip_gifts")
      .select("id, tip_id, status, created_at, title, body, photo_path, offer_qty, owner_id")
      .eq("winner_id", userId)
      .neq("status", "declined")
      .order("created_at", { ascending: false });
    return (gifts ?? []).map<MyGift>((g) => ({
      id: g.id,
      status: g.status as MyGift["status"],
      createdAt: g.created_at,
      tipId: g.tip_id,
      title: g.title ?? "",
      body: g.body ?? "",
      photoUrl: g.photo_path ? `${photoBaseUrl()}/${g.photo_path}` : null,
      offerQty: g.offer_qty,
      hasOwner: g.owner_id !== null,
    }));
  } catch {
    return [];
  }
}

// Only the advertiser who owns the tip may open one of its nominators.
export async function getNominatorAt(ownerId: string, tipId: string, userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: tip } = await admin.from("tips").select("user_id").eq("id", tipId).maybeSingle();
    if (!tip || tip.user_id !== ownerId) return null;
    const { data } = await admin
      .from("tip_nominations")
      .select("created_at")
      .eq("tip_id", tipId)
      .eq("user_id", userId)
      .maybeSingle();
    return data?.created_at ?? null;
  } catch {
    return null;
  }
}
