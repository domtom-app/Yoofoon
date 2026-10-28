"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { resetVotes } from "@/app/actions/admin";
import { resetMemberVotes, saveVotingWindow, setPublished, type VotingKind } from "@/app/actions/admin-parliament";
import { NativeSelect } from "@/components/native-select";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminData } from "@/lib/admin-data";
import { HEADING_MAX, type Candidate } from "@/lib/voting";
import { cn } from "@/lib/utils";

// Only rendered after a click, so reading the browser timezone is hydration-safe.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

function WindowForm({
  kind,
  startsAt,
  endsAt,
  heading,
  published,
}: {
  kind: VotingKind;
  startsAt: string | null;
  endsAt: string | null;
  heading: string;
  published: boolean;
}) {
  const [start, setStart] = useState(() => toLocalInput(startsAt));
  const [end, setEnd] = useState(() => toLocalInput(endsAt));
  const [title, setTitle] = useState(heading);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [next, setNext] = useState<boolean | null>(null);

  const save = (s: string, e: string) =>
    startTransition(async () => setMsg(await saveVotingWindow(kind, toIso(s), toIso(e), title)));

  const confirmPublish = () =>
    startTransition(async () => {
      const res = await setPublished(kind, next!);
      setMsg(res);
      if (!res.error) setNext(null);
    });

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-base font-bold">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setNext(e.target.checked)}
          className="size-5 accent-primary"
        />
        منشور للعامة
      </label>
      <Dialog open={next !== null} onOpenChange={(o) => !o && setNext(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{next ? "نشر التصويت؟" : "إخفاء التصويت؟"}</DialogTitle>
            <DialogDescription>
              {next ? "سيظهر للعامة حسب الموعد المحدد." : "سيختفي فورًا ويظهر الإعلان مكانه."}
            </DialogDescription>
          </DialogHeader>
          {msg?.error && <p role="alert" className="text-sm text-destructive">{msg.error}</p>}
          <DialogFooter>
            <Button onClick={confirmPublish} disabled={pending} className="h-12 w-full rounded-xl font-bold">
              {pending ? "..." : "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${kind}-heading`}>العنوان</Label>
        <Input
          id={`${kind}-heading`}
          value={title}
          maxLength={HEADING_MAX}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 rounded-xl text-base font-bold"
        />
        <p dir="ltr" className="text-end text-xs tabular-nums text-muted-foreground">
          {title.length}/{HEADING_MAX}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${kind}-start`}>البداية</Label>
        <Input id={`${kind}-start`} type="datetime-local" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} className="h-12 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${kind}-end`}>النهاية</Label>
        <Input id={`${kind}-end`} type="datetime-local" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} className="h-12 rounded-xl" />
      </div>
      {msg?.error && <p role="alert" className="text-sm text-destructive">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-primary">تم الحفظ</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => save(start, end)} disabled={pending} className="h-12 rounded-xl font-bold">
          {pending ? "..." : "حفظ"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setStart("");
            setEnd("");
            save("", "");
          }}
          disabled={pending || (!startsAt && !endsAt)}
          className="h-12 rounded-xl font-bold"
        >
          بدون موعد
        </Button>
      </div>
    </div>
  );
}

function ResetButton({
  disabled,
  action,
  label = "تصفير النسب",
  title = "تصفير كل الأصوات؟",
  compact = false,
}: {
  disabled: boolean;
  action: () => Promise<{ error?: string }>;
  label?: string;
  title?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = () =>
    start(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else {
        setError(null);
        setOpen(false);
      }
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {compact ? (
        <DialogTrigger
          render={<Button variant="ghost" size="icon" disabled={disabled} aria-label={label} className="size-8 shrink-0 text-destructive" />}
        >
          <RotateCcw className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="destructive" disabled={disabled} className="h-14 gap-2 rounded-2xl text-base font-bold" />}>
          <RotateCcw className="size-5" />
          {label}
        </DialogTrigger>
      )}
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>يمكن للجميع التصويت من جديد.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="destructive" onClick={run} disabled={pending} className="h-12 w-full rounded-xl font-bold">
            {pending ? "..." : "تصفير"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stats({ list, total }: { list: Candidate[]; total: number }) {
  return (
    <>
      <div className="rounded-2xl bg-secondary p-5 text-center">
        <p className="text-sm text-muted-foreground">الأصوات</p>
        <p className="text-4xl font-extrabold tabular-nums text-primary">{total}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {list.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <span className="truncate font-semibold">{c.name}</span>
            <span dir="ltr" className="shrink-0 ps-3 tabular-nums text-muted-foreground">
              {c.votes} · {c.percent}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ParliamentStats({ data }: { data: AdminData }) {
  const [gov, setGov] = useState("");
  const [center, setCenter] = useState("");
  const [district, setDistrict] = useState("");

  const votes = new Map(data.memberStats.map((m) => [m.id, m.votes]));
  const centerOptions = data.centers.filter((c) => String(c.governorateId) === gov);
  const districtOptions = data.districts.filter((d) => d.centerId === center);
  const govName = new Map(data.governorates.map((g) => [g.id, g.name]));
  const centerName = new Map(data.centers.map((c) => [c.id, c.name]));

  const groups = data.districts
    .filter(
      (d) =>
        (!gov || String(d.governorateId) === gov) &&
        (!center || d.centerId === center) &&
        (!district || d.id === district),
    )
    .map((d) => {
      const members = data.members
        .filter((m) => m.districtId === d.id)
        .map((m) => ({ id: m.id, name: m.name, votes: votes.get(m.id) ?? 0 }))
        .sort((a, b) => b.votes - a.votes);
      const total = members.reduce((s, m) => s + m.votes, 0);
      return { ...d, members, total };
    })
    .filter((g) => g.members.length > 0);

  const ids = groups.flatMap((g) => g.members.map((m) => m.id));
  const total = groups.reduce((s, g) => s + g.total, 0);
  const filtered = Boolean(gov || center || district);

  return (
    <>
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
          {data.governorates.map((g) => (
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
      <div className="rounded-2xl bg-secondary p-5 text-center">
        <p className="text-sm text-muted-foreground">الأصوات</p>
        <p className="text-4xl font-extrabold tabular-nums text-primary">{total}</p>
      </div>
      {groups.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">لا يوجد أعضاء</p>}
      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h3 className="min-w-0 truncate text-sm font-bold leading-[1.5]">
              {[govName.get(g.governorateId), centerName.get(g.centerId), g.name].filter(Boolean).join(" - ")}
            </h3>
            <span className="flex shrink-0 items-center gap-1">
              <span dir="ltr" className="text-sm font-bold tabular-nums text-primary">
                {g.total}
              </span>
              <ResetButton
                compact
                disabled={g.total === 0}
                action={() => resetMemberVotes(g.members.map((m) => m.id))}
                label="تصفير الدائرة"
                title="تصفير أصوات هذه الدائرة؟"
              />
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {g.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
                <span className="min-w-0 truncate font-semibold">{m.name}</span>
                <span dir="ltr" className="shrink-0 ps-3 tabular-nums text-muted-foreground">
                  {m.votes} · {g.total ? Math.round((m.votes / g.total) * 1000) / 10 : 0}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <ResetButton
        key={`reset-p-${gov}-${center}-${district}`}
        disabled={total === 0}
        action={() => resetMemberVotes(filtered ? ids : undefined)}
        label={filtered ? "تصفير المحدد" : "تصفير النسب"}
        title={filtered ? "تصفير أصوات المحدد؟" : "تصفير كل الأصوات؟"}
      />
    </>
  );
}

export function VotingAdmin({ data }: { data: AdminData }) {
  const [kind, setKind] = useState<VotingKind>("president");
  const options: { id: VotingKind; label: string }[] = [
    { id: "president", label: "الرئاسة" },
    { id: "parliament", label: "البرلمان" },
  ];
  const isPresident = kind === "president";
  const win = data.windows[kind];
  const total = data.candidates.reduce((s, c) => s + c.votes, 0);

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
        {options.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={kind === o.id}
            onClick={() => setKind(o.id)}
            className={cn(
              "h-10 rounded-xl text-sm font-bold transition-colors",
              kind === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <WindowForm key={kind} kind={kind} startsAt={win.startsAt} endsAt={win.endsAt} heading={win.heading} published={win.published} />
      {isPresident ? (
        <>
          <Stats list={data.candidates} total={total} />
          <ResetButton key="reset-president" disabled={total === 0} action={resetVotes} />
        </>
      ) : (
        <ParliamentStats data={data} />
      )}
    </div>
  );
}
