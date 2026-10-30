"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, ExternalLink, Pause, Play } from "lucide-react";
import { deleteAdvertiser, liftSuspension, suspendAdvertiser, setVerified } from "@/app/actions/tips";
import { SUSPEND_LABELS, SUSPEND_REASONS, untilText, type SuspendKind } from "@/lib/suspension";
import { AdvertiserAvatar } from "@/components/admin-advertisers";
import { TipRow } from "@/components/admin-tips";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdvertiserManage } from "@/lib/tips-data";

const selectCls = "h-11 w-full rounded-xl border bg-background px-3 text-sm";

export function AdvertiserManager({ data }: { data: AdvertiserManage }) {
  const { advertiser: a, tips, places } = data;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [kind, setKind] = useState<SuspendKind>("full");
  const [duration, setDuration] = useState("7");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState<string>(SUSPEND_REASONS[0]);
  const [note, setNote] = useState("");
  const blue = a.level === "blue";

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      setError(res.error ?? null);
      if (!res.error) after?.();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 rounded-3xl border bg-card p-4">
        <AdvertiserAvatar url={a.avatarUrl} size={80} />
        <p className="flex items-center gap-1 text-lg font-extrabold">
          {a.label || "بدون اسم"}
          <VerifiedBadge level={a.level} />
        </p>
        {a.phone && (
          <p dir="ltr" className="text-sm tabular-nums text-muted-foreground">
            {a.phone}
          </p>
        )}
        {a.tipId && (
          <Button
            render={<Link href={`/advertiser/${a.tipId}`} />}
            nativeButton={false}
            variant="outline"
            className="h-10 rounded-xl text-sm font-bold"
          >
            <ExternalLink className="size-4" />
            صفحة المعلن
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-label={blue ? "إلغاء التوثيق الأزرق" : "توثيق أزرق"}
          title={blue ? "إلغاء التوثيق الأزرق" : "توثيق أزرق"}
          onClick={() => run(() => setVerified(a.id, !blue), () => router.refresh())}
          className="h-10 rounded-xl px-1.5"
        >
          <BadgeCheck className={blue ? "size-6 text-sky-500" : "size-6 text-slate-400"} />
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => (a.suspension ? run(() => liftSuspension(a.id), () => router.refresh()) : setSuspendOpen(true))}
          className="h-10 rounded-xl px-1.5 text-xs font-bold"
        >
          {a.suspension ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          {a.suspension ? "استئناف" : "إيقاف مؤقت"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setConfirm(true)}
          className="h-10 rounded-xl px-1.5 text-xs font-bold"
        >
          حذف المعلن بإعلاناته
        </Button>
      </div>
      {a.suspension && (
        <p className="text-center text-sm font-bold leading-[1.7] text-destructive">
          {SUSPEND_LABELS[a.suspension.kind]} {untilText(a.suspension.until)}
          {a.suspension.reason && ` — ${a.suspension.reason}`}
        </p>
      )}

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>إيقاف مؤقت للمعلن</DialogTitle>
            <DialogDescription className="sr-only">نوع الإيقاف ومدته وسببه</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <select value={kind} onChange={(e) => setKind(e.target.value as SuspendKind)} aria-label="نوع الإيقاف" className={selectCls}>
              <option value="post">{SUSPEND_LABELS.post} (إعلاناته الحالية تبقى ظاهرة)</option>
              <option value="hide">{SUSPEND_LABELS.hide} (يستطيع النشر لكن لا يظهر)</option>
              <option value="full">{SUSPEND_LABELS.full} (إخفاء ومنع نشر)</option>
            </select>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} aria-label="المدة" className={selectCls}>
              <option value="3">3 أيام</option>
              <option value="7">7 أيام</option>
              <option value="30">30 يومًا</option>
              <option value="none">حتى إشعار آخر</option>
              <option value="date">حتى تاريخ محدد</option>
            </select>
            {duration === "date" && (
              <input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                aria-label="تاريخ الانتهاء"
                className={selectCls}
              />
            )}
            <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="السبب" className={selectCls}>
              {SUSPEND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="custom">سبب آخر (كتابة)</option>
            </select>
            {reason === "custom" && (
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={80}
                placeholder="اكتب السبب"
                className={selectCls}
              />
            )}
            <p className="text-xs leading-[1.7] text-muted-foreground">يصل المعلن إشعار بالنوع والمدة والسبب.</p>
            <Button
              type="button"
              disabled={pending || (duration === "date" && !date) || (reason === "custom" && !note.trim())}
              onClick={() =>
                run(
                  () =>
                    suspendAdvertiser(a.id, {
                      kind,
                      reason: reason === "custom" ? note.trim() : reason,
                      days: duration === "date" || duration === "none" ? null : Number(duration),
                      date: duration === "date" ? date : "",
                    }),
                  () => {
                    setSuspendOpen(false);
                    router.refresh();
                  },
                )
              }
              className="h-11 rounded-xl text-sm font-bold"
            >
              تطبيق الإيقاف
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>حذف المعلن بإعلاناته؟</DialogTitle>
            <DialogDescription className="leading-[1.7]">
              سيُحذف كل إعلانات هذا المعلن نهائيًا وتُمسح بيانات التوثيق والاسم والروابط. الحساب نفسه يبقى. لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteAdvertiser(a.id), () => router.replace("/admin"))}
              className="h-11 rounded-xl text-sm font-bold"
            >
              تأكيد الحذف
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirm(false)} className="h-11 rounded-xl text-sm font-bold">
              تراجع
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <h2 className="text-base font-bold">الإعلانات ({tips.length})</h2>
      {tips.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">لا توجد إعلانات</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tips.map((t) => (
            <TipRow key={t.id} tip={t} places={places} />
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
