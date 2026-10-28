import type { Center, District, Governorate } from "@/lib/voting";

export type Area = { governorateId: number | null; centerId: string | null; districtId: string | null };

export type Places = { governorates: Governorate[]; centers: Center[]; districts: District[] };

export const NO_AREA: Area = { governorateId: null, centerId: null, districtId: null };

// Two areas overlap when, at every level both specify, they agree. An empty area covers everything.
export function areasOverlap(a: Area, b: Area) {
  return (
    (a.governorateId === null || b.governorateId === null || a.governorateId === b.governorateId) &&
    (a.centerId === null || b.centerId === null || a.centerId === b.centerId) &&
    (a.districtId === null || b.districtId === null || a.districtId === b.districtId)
  );
}

export function areaLabel(area: Area, places: Places) {
  if (area.districtId) {
    const d = places.districts.find((x) => x.id === area.districtId);
    const c = places.centers.find((x) => x.id === area.centerId);
    return [c?.name, d?.name].filter(Boolean).join(" - ");
  }
  if (area.centerId) return places.centers.find((x) => x.id === area.centerId)?.name ?? "";
  if (area.governorateId !== null) {
    return places.governorates.find((x) => x.id === area.governorateId)?.name ?? "";
  }
  return "";
}
