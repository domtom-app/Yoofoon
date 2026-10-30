import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Area } from "@/lib/area";

const idSchema = z.string().uuid();

// The narrowest chosen level decides the area; its parents are read from the database.
export async function parseArea(formData: FormData): Promise<Area | null> {
  const admin = createAdminClient();
  const district = idSchema.safeParse(formData.get("districtId"));
  if (district.success) {
    const { data } = await admin
      .from("districts")
      .select("id, center_id, governorate_id")
      .eq("id", district.data)
      .maybeSingle();
    return data
      ? { governorateId: data.governorate_id, centerId: data.center_id, districtId: data.id }
      : null;
  }
  const center = idSchema.safeParse(formData.get("centerId"));
  if (center.success) {
    const { data } = await admin
      .from("centers")
      .select("id, governorate_id")
      .eq("id", center.data)
      .maybeSingle();
    return data ? { governorateId: data.governorate_id, centerId: data.id, districtId: null } : null;
  }
  const gov = z.coerce.number().int().positive().safeParse(formData.get("governorateId"));
  if (gov.success) {
    const { data } = await admin.from("governorates").select("id").eq("id", gov.data).maybeSingle();
    return data ? { governorateId: data.id, centerId: null, districtId: null } : null;
  }
  return { governorateId: null, centerId: null, districtId: null };
}
