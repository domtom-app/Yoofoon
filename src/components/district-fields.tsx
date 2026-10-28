"use client";

import { useState } from "react";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import type { Center, District, Governorate } from "@/lib/voting";

export function DistrictFields({
  governorates,
  centers,
  districts,
  initialId,
  submitLabel,
  pending = false,
  error,
  onSubmit,
  onChange,
}: {
  governorates: Governorate[];
  centers: Center[];
  districts: District[];
  initialId: string | null;
  submitLabel?: string;
  pending?: boolean;
  error?: string | null;
  onSubmit?: (districtId: string) => void;
  onChange?: (districtId: string) => void;
}) {
  const initial = districts.find((d) => d.id === initialId);
  const [gov, setGov] = useState(initial ? String(initial.governorateId) : "");
  const [center, setCenter] = useState(initial?.centerId ?? "");
  const [district, setDistrict] = useState(initial?.id ?? "");
  const centerOptions = centers.filter(
    (c) => String(c.governorateId) === gov && districts.some((d) => d.centerId === c.id),
  );
  const districtOptions = districts.filter((d) => d.centerId === center);
  const available = governorates.filter((g) => districts.some((d) => d.governorateId === g.id));

  return (
    <div className="flex flex-col gap-3">
      <NativeSelect
        aria-label="محافظة"
        value={gov}
        onChange={(e) => {
          setGov(e.target.value);
          setCenter("");
          setDistrict("");
          onChange?.("");
        }}
        className="text-sm font-bold"
      >
        <option value="">محافظة</option>
        {available.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="مركز"
        value={center}
        disabled={!gov}
        onChange={(e) => {
          setCenter(e.target.value);
          setDistrict("");
          onChange?.("");
        }}
        className="text-sm font-bold"
      >
        <option value="">مركز</option>
        {centerOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="دائرة"
        value={district}
        disabled={!center}
        onChange={(e) => {
          setDistrict(e.target.value);
          onChange?.(e.target.value);
        }}
        className="text-sm font-bold"
      >
        <option value="">دائرة</option>
        {districtOptions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </NativeSelect>
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
      {onSubmit && (
        <Button
          disabled={!district || pending}
          onClick={() => onSubmit(district)}
          className="h-12 rounded-2xl text-base font-bold"
        >
          {pending ? "..." : submitLabel}
        </Button>
      )}
    </div>
  );
}
