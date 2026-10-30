"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportContender, reportTip } from "@/app/actions/reports";

const REASONS = [
  { value: "misleading", label: "معلومات مضللة" },
  { value: "inappropriate", label: "محتوى غير لائق" },
  { value: "spam", label: "إعلان مزعج" },
  { value: "other", label: "سبب آخر" },
];

export function ReportButton({ tipId, contenderId }: { tipId?: string; contenderId?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) return <p className="text-center text-xs text-muted-foreground">تم استلام بلاغك</p>;

  const send = (reason: string) =>
    start(async () => {
      const res = contenderId ? await reportContender(contenderId, reason) : await reportTip(tipId ?? "", reason);
      if (res.error) setError(res.error);
      else setDone(true);
    });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-1 text-xs text-muted-foreground"
      >
        <Flag className="size-3" />
        إبلاغ
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {REASONS.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={pending}
            onClick={() => send(r.value)}
            className="h-9 rounded-xl bg-secondary text-xs font-bold disabled:opacity-60"
          >
            {r.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
        تراجع
      </button>
      {error && <p role="alert" className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
