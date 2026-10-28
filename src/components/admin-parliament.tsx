"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, User, X } from "lucide-react";
import {
  addCenter,
  addDistrict,
  deleteCenter,
  deleteDistrict,
  deleteMember,
  saveMember,
} from "@/app/actions/admin-parliament";
import { useAction } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminData, AdminMember } from "@/lib/admin-data";

type Gov = AdminData["governorates"][number];

export function FileField({ fileName, onChange }: { fileName: string | null; onChange: (n: string | null) => void }) {
  return (
    <label className="flex h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
      <ImagePlus className="size-5 text-primary" />
      <span className="truncate">{fileName ?? "الصورة"}</span>
      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}

function MemberForm({
  member,
  governorates,
  centers,
  districts,
}: {
  member?: AdminMember;
  governorates: Gov[];
  centers: AdminData["centers"];
  districts: AdminData["districts"];
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [gov, setGov] = useState(String(member?.governorateId ?? ""));
  const initialCenter = districts.find((d) => d.id === member?.districtId)?.centerId ?? "";
  const [center, setCenter] = useState(initialCenter);
  const key = member?.id ?? "new";
  const { pending, error, run, clear } = useAction(
    (fd) => saveMember({}, fd),
    () => {
      setOpen(false);
      setFileName(null);
    },
  );
  const centerOptions = centers.filter((c) => String(c.governorateId) === gov);
  const districtOptions = districts.filter((d) => d.centerId === center);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        clear();
        setFileName(null);
        setGov(String(member?.governorateId ?? ""));
        setCenter(initialCenter);
      }}
    >
      <DialogTrigger
        render={
          member ? (
            <Button variant="secondary" size="icon" aria-label="تعديل"             className="size-8 rounded-full" />
          ) : (
            <Button className="h-12 gap-2 rounded-2xl px-5 font-bold" />
          )
        }
      >
        {member ? (
                      <Pencil className="size-4" />
        ) : (
          <>
            <Plus className="size-5" />
            عضو
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{member ? "تعديل" : "عضو جديد"}</DialogTitle>
          <DialogDescription className="sr-only">بيانات العضو</DialogDescription>
        </DialogHeader>
        <form action={run} className="flex flex-col gap-4">
          {member && <input type="hidden" name="id" value={member.id} />}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`m-name-${key}`}>الاسم</Label>
            <Input id={`m-name-${key}`} name="name" required minLength={2} maxLength={60} defaultValue={member?.name} className="h-12 rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`m-gov-${key}`}>محافظة</Label>
            <NativeSelect
              id={`m-gov-${key}`}
              name="governorateId"
              required
              value={gov}
              onChange={(e) => {
                setGov(e.target.value);
                setCenter("");
              }}
            >
              <option value="" disabled>
                —
              </option>
              {governorates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`m-center-${key}`}>مركز</Label>
            <NativeSelect
              id={`m-center-${key}`}
              required
              value={center}
              onChange={(e) => setCenter(e.target.value)}
            >
              <option value="" disabled>
                {gov && centerOptions.length === 0 ? "أضف مركزًا من «المراكز»" : "—"}
              </option>
              {centerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`m-district-${key}`}>دائرة</Label>
            <NativeSelect
              id={`m-district-${key}`}
              name="districtId"
              required
              key={`d-${center}`}
              defaultValue={member?.districtId && center === initialCenter ? member.districtId : ""}
            >
              <option value="" disabled>
                {center && districtOptions.length === 0 ? "أضف دائرة من «الدوائر»" : "—"}
              </option>
              {districtOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <FileField fileName={fileName} onChange={setFileName} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl font-bold">
              {pending ? "..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMember({ member }: { member: AdminMember }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction((fd) => deleteMember({}, fd), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="secondary" size="icon" aria-label="حذف" className="size-8 rounded-full text-destructive" />}
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>حذف {member.name}؟</DialogTitle>
          <DialogDescription>تُحذف أصواته أيضًا.</DialogDescription>
        </DialogHeader>
        <form action={run}>
          <input type="hidden" name="id" value={member.id} />
          {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending} className="h-12 w-full rounded-xl font-bold">
              {pending ? "..." : "حذف"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PlaceAction = (prev: { error?: string; ok?: boolean }, fd: FormData) => Promise<{ error?: string; ok?: boolean }>;

function PlacesDialog({
  title,
  placeholder,
  empty,
  governorates,
  centers,
  items,
  addAction,
  deleteAction,
}: {
  title: string;
  placeholder: string;
  empty: string;
  governorates: Gov[];
  centers?: AdminData["centers"];
  items: { id: string; governorateId: number; centerId?: string; name: string }[];
  addAction: PlaceAction;
  deleteAction: PlaceAction;
}) {
  const [gov, setGov] = useState("");
  const [center, setCenter] = useState("");
  const [formKey, setFormKey] = useState(0);
  const add = useAction((fd) => addAction({}, fd), () => setFormKey((k) => k + 1));
  const remove = useAction((fd) => deleteAction({}, fd), () => {});
  const parentReady = centers ? Boolean(center) : Boolean(gov);
  const list = items.filter((c) => (centers ? c.centerId === center : String(c.governorateId) === gov));

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" className="h-12 rounded-2xl px-5 font-bold" />}>
        {title}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">إدارة {title}</DialogDescription>
        </DialogHeader>
        <NativeSelect
          aria-label="محافظة"
          value={gov}
          onChange={(e) => {
            setGov(e.target.value);
            setCenter("");
          }}
        >
          <option value="">محافظة</option>
          {governorates.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </NativeSelect>
        {centers && (
          <NativeSelect aria-label="مركز" value={center} disabled={!gov} onChange={(e) => setCenter(e.target.value)}>
            <option value="">مركز</option>
            {centers
              .filter((c) => String(c.governorateId) === gov)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </NativeSelect>
        )}
        {parentReady && (
          <>
            <form key={formKey} action={add.run} className="flex gap-2">
              <input type="hidden" name={centers ? "centerId" : "governorateId"} value={centers ? center : gov} />
              <Input name="name" required maxLength={80} placeholder={placeholder} className="h-12 rounded-xl" />
              <Button type="submit" disabled={add.pending} size="icon" aria-label="إضافة" className="size-12 shrink-0 rounded-xl">
                <Plus className="size-5" />
              </Button>
            </form>
            {(add.error || remove.error) && (
              <p role="alert" className="text-sm text-destructive">{add.error ?? remove.error}</p>
            )}
            <ul className="flex flex-col gap-2">
              {list.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">{empty}</li>}
              {list.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-secondary px-4 py-2">
                  <span className="font-semibold">{c.name}</span>
                  <form action={remove.run}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label="حذف" disabled={remove.pending} className="size-9 rounded-full text-destructive">
                      <X className="size-4" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MembersTab({ data }: { data: AdminData }) {
  const { governorates, centers, districts } = data;
  const [gov, setGov] = useState("");
  const [center, setCenter] = useState("");
  const [district, setDistrict] = useState("");
  const govName = new Map(governorates.map((g) => [g.id, g.name]));
  const centerName = new Map(centers.map((c) => [c.id, c.name]));
  const districtById = new Map(districts.map((d) => [d.id, d]));
  const members = data.members
    .filter((m) => !gov || String(m.governorateId) === gov)
    .filter((m) => !center || (m.districtId && districtById.get(m.districtId)?.centerId === center))
    .filter((m) => !district || m.districtId === district);
  const centerOptions = centers.filter((c) => String(c.governorateId) === gov);
  const districtOptions = districts.filter((d) => d.centerId === center);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-start gap-2">
        <MemberForm governorates={governorates} centers={centers} districts={districts} />
        <PlacesDialog
          title="مراكز"
          placeholder="مركز جديد"
          empty="لا توجد مراكز"
          governorates={governorates}
          items={centers}
          addAction={addCenter}
          deleteAction={deleteCenter}
        />
        <PlacesDialog
          title="دوائر"
          placeholder="دائرة جديدة"
          empty="لا توجد دوائر"
          governorates={governorates}
          centers={centers}
          items={districts}
          addAction={addDistrict}
          deleteAction={deleteDistrict}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NativeSelect
          aria-label="محافظة"
          value={gov}
          onChange={(e) => {
            setGov(e.target.value);
            setCenter("");
            setDistrict("");
          }}
          className="h-11 text-xs font-bold"
        >
          <option value="">كل المحافظات</option>
          {governorates.map((g) => (
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
          }}
          className="h-11 text-xs font-bold"
        >
          <option value="">كل المراكز</option>
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
          onChange={(e) => setDistrict(e.target.value)}
          className="h-11 text-xs font-bold"
        >
          <option value="">كل الدوائر</option>
          {districtOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      {members.length === 0 && <p className="py-16 text-center text-muted-foreground">لا يوجد أعضاء</p>}
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
            {m.photoUrl ? (
              <Image src={m.photoUrl} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <User className="absolute inset-0 m-auto size-7 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{m.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[
                govName.get(m.governorateId),
                centerName.get(districtById.get(m.districtId ?? "")?.centerId ?? ""),
                districtById.get(m.districtId ?? "")?.name,
              ]
                .filter(Boolean)
                .join(" - ")}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <MemberForm member={m} governorates={governorates} centers={centers} districts={districts} />
            <DeleteMember member={m} />
          </div>
        </div>
      ))}
    </div>
  );
}
