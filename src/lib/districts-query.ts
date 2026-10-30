import type { createAdminClient } from "@/lib/supabase/admin";

const PAGE = 1000;

// PostgREST caps a response at 1000 rows, so the full district list is read in pages.
export async function fetchDistricts(admin: ReturnType<typeof createAdminClient>) {
  const data: { id: string; governorate_id: number; center_id: string; name: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error } = await admin
      .from("districts")
      .select("id, governorate_id, center_id, name")
      .order("name")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return { data: [], error };
    data.push(...rows);
    if (rows.length < PAGE) return { data, error: null };
  }
}
