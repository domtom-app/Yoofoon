"use client";

import { useState } from "react";
import { NativeSelect } from "@/components/native-select";
import { NO_AREA, type Area, type Places } from "@/lib/area";

export function AreaSelect({
  places,
  value,
  onChange,
  allLabel = "الكل",
}: {
  places: Places;
  value: Area;
  onChange: (area: Area) => void;
  allLabel?: string;
}) {
  const centers = places.centers.filter((c) => c.governorateId === value.governorateId);
  const districts = places.districts.filter((d) => d.centerId === value.centerId);

  return (
    <div className="flex flex-col gap-3">
      <NativeSelect
        aria-label="محافظة"
        value={value.governorateId === null ? "" : String(value.governorateId)}
        onChange={(e) =>
          onChange({
            governorateId: e.target.value ? Number(e.target.value) : null,
            centerId: null,
            districtId: null,
          })
        }
        className="text-sm font-bold"
      >
        <option value="">{allLabel}</option>
        {places.governorates.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </NativeSelect>
      {value.governorateId !== null && (
        <NativeSelect
          aria-label="مركز"
          value={value.centerId ?? ""}
          onChange={(e) =>
            onChange({ ...value, centerId: e.target.value || null, districtId: null })
          }
          className="text-sm font-bold"
        >
          <option value="">كل المراكز</option>
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      )}
      {value.centerId && (
        <NativeSelect
          aria-label="دائرة"
          value={value.districtId ?? ""}
          onChange={(e) => onChange({ ...value, districtId: e.target.value || null })}
          className="text-sm font-bold"
        >
          <option value="">كل الدوائر</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </div>
  );
}

export function AreaFields({
  places,
  initial = NO_AREA,
  allLabel,
}: {
  places: Places;
  initial?: Area;
  allLabel?: string;
}) {
  const [area, setArea] = useState<Area>(initial);
  return (
    <>
      <input type="hidden" name="governorateId" value={area.governorateId ?? ""} />
      <input type="hidden" name="centerId" value={area.centerId ?? ""} />
      <input type="hidden" name="districtId" value={area.districtId ?? ""} />
      <AreaSelect places={places} value={area} onChange={setArea} allLabel={allLabel} />
    </>
  );
}
