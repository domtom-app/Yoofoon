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
  if (area.governorateId !== null) {
    const g = places.governorates.find((x) => x.id === area.governorateId)?.name;
    const c = places.centers.find((x) => x.id === area.centerId)?.name;
    const d = places.districts.find((x) => x.id === area.districtId)?.name;
    return [g, c, d].filter(Boolean).join(" - ");
  }
  return "مصر";
}

export function governorateLabel(area: Area, places: Places) {
  if (area.governorateId === null) return "مصر";
  return places.governorates.find((x) => x.id === area.governorateId)?.name ?? "";
}
