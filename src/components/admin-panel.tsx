"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, User } from "lucide-react";
import { deleteCandidate, saveCandidate } from "@/app/actions/admin";
import { MembersTab } from "@/components/admin-parliament";
import { TipsTab } from "@/components/admin-tips";
import { VotingAdmin } from "@/components/admin-voting";
import { useAction } from "@/components/admin-ui";
import type { AdminData } from "@/lib/admin-data";
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
import type { Candidate } from "@/lib/voting";
import { cn } from "@/lib/utils";

type Tab = "candidates" | "voting" | "members" | "tips";

function CandidateForm({ candidate }: { candidate?: Candidate }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { pending, error, run, clear } = useAction(
    (fd) => saveCandidate({}, fd),
    () => {
      setOpen(false);
      setFileName(null);
    },
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        clear();
        setFileName(null);
      }}
    >
      <DialogTrigger
        render={
          candidate ? (
            <Button variant="secondary" size="icon" aria-label="تعديل" className="size-8 rounded-full" />
          ) : (
            <Button className="h-12 gap-2 rounded-2xl px-5 font-bold" />
          )
        }
      >
        {candidate ? (
          <Pencil className="size-4" />
        ) : (
          <>
            <Plus className="size-5" />
            مرشح
          </>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{candidate ? "تعديل" : "مرشح جديد"}</DialogTitle>
          <DialogDescription className="sr-only">بيانات المرشح</DialogDescription>
        </DialogHeader>
        <form action={run} className="flex flex-col gap-4">
          {candidate && <input type="hidden" name="id" value={candidate.id} />}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`name-${candidate?.id ?? "new"}`}>الاسم</Label>
            <Input
              id={`name-${candidate?.id ?? "new"}`}
              name="name"
              required
              minLength={2}
              maxLength={60}
              defaultValue={candidate?.name}
              className="h-12 rounded-xl"
            />
          </div>
          <label className="flex h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
            <ImagePlus className="size-5 text-primary" />
            <span className="truncate">{fileName ?? "الصورة"}</span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
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

function DeleteButton({ candidate }: { candidate: Candidate }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction(
    (fd) => deleteCandidate({}, fd),
    () => setOpen(false),
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="icon" aria-label="حذف" className="size-8 rounded-full text-destructive" />
        }
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>حذف {candidate.name}؟</DialogTitle>
          <DialogDescription>تُحذف أصواته أيضًا.</DialogDescription>
        </DialogHeader>
        <form action={run}>
          <input type="hidden" name="id" value={candidate.id} />
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

function CandidatesTab({ candidates }: { candidates: Candidate[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <CandidateForm />
      </div>
      {candidates.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">لا يوجد مرشحون</p>
      )}
      {candidates.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
            {c.photoUrl ? (
              <Image src={c.photoUrl} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <User className="absolute inset-0 m-auto size-7 text-muted-foreground" />
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-base font-bold">{c.name}</p>
          <div className="flex flex-col gap-1.5">
            <CandidateForm candidate={c} />
            <DeleteButton candidate={c} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminPanel({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<Tab>("candidates");
  const tabs: { id: Tab; label: string }[] = [
    { id: "candidates", label: "المرشحون" },
    { id: "voting", label: "إدارة التصويت" },
    { id: "members", label: "البرلمان" },
    { id: "tips", label: "فيد واستفيد" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-11 rounded-xl text-sm font-bold transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "candidates" && <CandidatesTab candidates={data.candidates} />}
      {tab === "voting" && <VotingAdmin data={data} />}
      {tab === "members" && <MembersTab data={data} />}
      {tab === "tips" && <TipsTab tips={data.tips} places={data} />}
    </div>
  );
}
