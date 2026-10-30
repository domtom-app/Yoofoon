"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { adminClearContenderReports, adminDeleteContender } from "@/app/actions/contests";
import { Button } from "@/components/ui/button";
import type { AdminContender } from "@/lib/contests-data";

function Row({ c }: { c: AdminContender }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.error ?? null);
      setConfirm(false);
    });

  const status = !c.active ? "خارج المنافسة" : c.waiting ? "بانتظار المنافسين" : "جارٍ";
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-secondary p-3">
      <div className="flex items-center gap-3">
        <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl bg-background">
          {c.photoUrl ? (
            <Image src={c.photoUrl} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <Trophy className="absolute inset-0 m-auto size-5 text-primary/40" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-bold">{c.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[c.categoryLabel, c.specialty, c.areaText].filter(Boolean).join(" · ")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {status} · {c.votes} صوت · {c.owner}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {c.reports > 0 && (
          <>
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
              {c.reports} بلاغ
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => adminClearContenderReports(c.id))}
              className="h-8 rounded-xl px-3 text-xs font-bold"
            >
              تجاهل البلاغات
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          autoFocus={confirm}
          onBlur={() => setConfirm(false)}
          onClick={() => (confirm ? run(() => adminDeleteContender(c.id)) : setConfirm(true))}
          className="ms-auto h-8 rounded-xl px-3 text-xs font-bold text-destructive"
        >
          {confirm ? "تأكيد الحذف" : "حذف"}
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ContestsTab({ contests }: { contests: AdminContender[] }) {
  const [onlyReported, setOnlyReported] = useState(false);
  const list = onlyReported ? contests.filter((c) => c.reports > 0) : contests;
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant={onlyReported ? "default" : "outline"}
        onClick={() => setOnlyReported((v) => !v)}
        className="h-10 rounded-2xl text-sm font-bold"
      >
        المُبلَّغ عنها فقط
      </Button>
      {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">لا توجد ترشيحات</p>}
      {list.map((c) => (
        <Row key={c.id} c={c} />
      ))}
    </div>
  );
}
