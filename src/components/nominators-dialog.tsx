"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Ban, Gift, Loader2, Pencil, Search, Trophy, User, Users } from "lucide-react";
import {
  awardGift,
  blockUser,
  listNominators,
  type GiftStatus,
  type Nominator,
  type NominatorsResult,
} from "@/app/actions/gifts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const GIFT_LABEL: Record<GiftStatus, string> = {
  pending: "بانتظار رد الفائز",
  accepted: "قبل الهدية",
  declined: "ردّ الهدية",
};

const formatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

const dayFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" });

function Avatar({ url, size }: { url: string | null; size: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="relative block shrink-0 overflow-hidden rounded-full bg-background ring-1 ring-primary/20"
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <User className="absolute inset-0 m-auto size-1/2 text-primary/40" />
      )}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-secondary p-2">
      <span className="text-base font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function NominatorsButton({ tipId }: { tipId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NominatorsResult | null>(null);
  const [loading, startLoad] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const load = () =>
    startLoad(async () => {
      setData(await listNominators(tipId));
    });

  const run = async (fn: () => Promise<{ error?: string }>, after?: () => void) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    if (res.error) setError(res.error);
    else after?.();
    setData(await listNominators(tipId));
    setBusy(false);
  };

  const remaining = data?.qty != null ? Math.max(data.qty - data.given, 0) : null;
  const items = (data?.items ?? []).filter(
    (n) => !query.trim() || n.phone.includes(query.trim()) || n.name.includes(query.trim()),
  );
  const current: Nominator | undefined = data?.items.find((n) => n.userId === selected);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSelected(null);
      setConfirmBlock(false);
      setError(null);
    }
  };

  const detail = (n: Nominator) => {
    const active = n.gift === "pending" || n.gift === "accepted";
    const exhausted = remaining === 0;
    const reason = active
      ? null
      : exhausted
        ? "نفدت الهدايا"
        : n.coolingUntil
          ? `لا يمكن منحه هدية جديدة قبل ${dayFormatter.format(new Date(n.coolingUntil))}`
          : null;
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
          <Avatar url={n.avatarUrl} size={56} />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm font-bold">{n.name || "مستخدم"}</p>
            <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
              {n.governorate && <span>{n.governorate}</span>}
              {n.governorate && n.phone && "-"}
              {n.phone && <span dir="ltr" className="tabular-nums">{n.phone}</span>}
            </p>
          </div>
          <Button
            render={<Link href={`/nominee/${tipId}/${n.userId}`} />}
            nativeButton={false}
            size="sm"
            variant="outline"
            className="h-8 shrink-0 rounded-xl px-3 text-xs font-bold"
          >
            الملف
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="مشاركاته" value={n.interests} />
          <Stat label="هدايا منك" value={n.giftsGiven} />
          <Stat label="اهتم في" value={dayFormatter.format(new Date(n.at))} />
        </div>

        {data?.free && (
          <section className="flex flex-col gap-2 rounded-2xl border p-3">
            <h3 className="text-sm font-bold">منح الهدية</h3>
            <p className="text-xs font-medium leading-6 text-muted-foreground">
              {remaining !== null ? `المتبقي ${remaining} من ${data.qty} هدية.` : "عدد الهدايا غير محدود."} يصله إشعار
              ويقبل الهدية أو يرفضها، والمرفوضة تعود إلى رصيدك. لا تُمنح له مرتين في نفس الإعلان، ويفصل {14} يومًا بين
              هداياك له.
            </p>
            {n.gift && (
              <p className="text-sm font-bold text-primary">{GIFT_LABEL[n.gift]}</p>
            )}
            {reason && <p className="text-xs font-bold text-destructive">{reason}</p>}
            {!active && (
              <Button
                type="button"
                disabled={busy || exhausted || n.cooling}
                onClick={() => run(() => awardGift(tipId, n.userId))}
                className="h-10 rounded-xl text-sm font-bold"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : n.gift === "declined" ? <Gift className="size-4" /> : <Trophy className="size-4" />}
                {n.gift === "declined" ? "منح هدية مرة أخرى" : "اختيار كفائز"}
              </Button>
            )}
          </section>
        )}

        <section className="flex flex-col gap-2 rounded-2xl border p-3">
          <h3 className="text-sm font-bold">منع الاهتمام</h3>
          <p className="text-xs font-medium leading-6 text-muted-foreground">
            يُحذف اهتمامه الحالي بإعلاناتك ولا يستطيع الاهتمام بإعلاناتك لاحقًا. يمكنك إلغاء المنع من أسفل القائمة.
          </p>
          {confirmBlock ? (
            <Button
              type="button"
              variant="destructive"
              autoFocus
              disabled={busy}
              onBlur={() => setConfirmBlock(false)}
              onClick={() =>
                run(() => blockUser(n.userId, true), () => {
                  setSelected(null);
                  setConfirmBlock(false);
                })
              }
              className="h-10 rounded-xl text-sm font-bold"
            >
              تأكيد المنع
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmBlock(true)}
              className="h-10 rounded-xl text-sm font-bold text-destructive"
            >
              <Ban className="size-4" />
              منع من الاهتمام بإعلاناتي
            </Button>
          )}
        </section>
      </div>
    );
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(true);
          load();
        }}
        className="h-10 w-full rounded-xl px-1 text-sm font-bold"
      >
        <Users className="size-4" />
        المهتمون
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent
          showCloseButton
          className="top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none p-4 sm:top-1/2 sm:left-1/2 sm:h-[85dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {current && (
                <button
                  type="button"
                  aria-label="رجوع"
                  onClick={() => {
                    setSelected(null);
                    setConfirmBlock(false);
                    setError(null);
                  }}
                  className="flex size-8 items-center justify-center rounded-full bg-secondary"
                >
                  <ArrowRight className="size-4" />
                </button>
              )}
              {current ? "إدارة المهتم" : "المهتمون"}
            </DialogTitle>
          </DialogHeader>
          {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
          {loading && !data ? (
            <Loader2 className="m-auto size-6 animate-spin text-primary" />
          ) : data?.error ? (
            <p className="m-auto text-sm text-muted-foreground">{data.error}</p>
          ) : current ? (
            detail(current)
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الرقم"
                  aria-label="بحث"
                  className="h-11 ps-9"
                />
              </div>
              {data?.free && (
                <p className="text-center text-xs font-bold text-muted-foreground">
                  {remaining !== null ? `الهدايا المتبقية ${remaining} من ${data.qty}` : "هدايا بلا حد"}
                </p>
              )}
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="m-auto text-sm text-muted-foreground">لا يوجد مهتمون</p>
                ) : (
                  items.map((n) => {
                    const details = [
                      n.governorate || null,
                      n.phone ? <span key="p" dir="ltr" className="tabular-nums">{n.phone}</span> : null,
                      `${n.interests} مشاركة`,
                      n.gift ? GIFT_LABEL[n.gift] : null,
                    ].filter(Boolean);
                    return (
                      <div key={n.userId} className="relative flex items-center gap-3 rounded-2xl bg-secondary p-3">
                        <Link
                          href={`/nominee/${tipId}/${n.userId}`}
                          aria-label={n.name || "مستخدم"}
                          className="absolute inset-0 rounded-2xl"
                        />
                        <Avatar url={n.avatarUrl} size={48} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate text-start text-sm font-bold">{n.name || "مستخدم"}</p>
                          <p className="flex flex-wrap items-center gap-x-1 text-start text-xs text-muted-foreground">
                            {details.map((d, i) => (
                              <span key={i} className="flex items-center gap-1">
                                {i > 0 && "-"}
                                {d}
                              </span>
                            ))}
                          </p>
                          <p className="text-start text-[11px] text-muted-foreground">{formatter.format(new Date(n.at))}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(n.userId)}
                          className="relative h-8 shrink-0 rounded-xl px-3 text-xs font-bold"
                        >
                          <Pencil className="size-3.5" />
                          تعديل
                        </Button>
                      </div>
                    );
                  })
                )}
                {(data?.blocked.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-col gap-2 border-t pt-3">
                    <p className="text-xs font-bold text-muted-foreground">المحظورون ({data!.blocked.length})</p>
                    {data!.blocked.map((b) => (
                      <div key={b.userId} className="flex items-center gap-3 rounded-2xl border p-2">
                        <Avatar url={b.avatarUrl} size={36} />
                        <p className="min-w-0 flex-1 truncate text-sm font-bold">{b.name}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => run(() => blockUser(b.userId, false))}
                          className="h-8 shrink-0 rounded-xl px-3 text-xs font-bold"
                        >
                          إلغاء المنع
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
