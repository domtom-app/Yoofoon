"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Gift, Loader2, Search, Trophy, User, Users } from "lucide-react";
import { awardGift, listNominators, type GiftStatus, type NominatorsResult } from "@/app/actions/gifts";
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

export function NominatorsButton({ tipId }: { tipId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NominatorsResult | null>(null);
  const [loading, startLoad] = useTransition();
  const [awarding, setAwarding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = () =>
    startLoad(async () => {
      setData(await listNominators(tipId));
    });

  const award = async (userId: string) => {
    setAwarding(userId);
    setError(null);
    const res = await awardGift(tipId, userId);
    setAwarding(null);
    if (res.error) setError(res.error);
    await listNominators(tipId).then(setData);
  };

  const items = (data?.items ?? []).filter((n) => !query.trim() || n.phone.includes(query.trim()));
  const remaining = data?.qty != null ? Math.max(data.qty - data.given, 0) : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(true);
          load();
        }}
        className="h-10 w-full rounded-xl text-sm font-bold"
      >
        <Users className="size-4" />
        المهتمون
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none p-4 sm:top-1/2 sm:left-1/2 sm:h-[85dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold">المهتمون</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              inputMode="numeric"
              placeholder="ابحث بالرقم"
              aria-label="بحث"
              className="h-11 ps-9"
            />
          </div>
          {data?.free && (
            <p className="text-center text-xs font-bold text-muted-foreground">
              {remaining !== null ? `الهدايا المتبقية ${remaining} من ${data.qty}` : "هدايا بلا حد"}
            </p>
          )}
          {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {loading && !data ? (
              <Loader2 className="m-auto size-6 animate-spin text-primary" />
            ) : data?.error ? (
              <p className="m-auto text-sm text-muted-foreground">{data.error}</p>
            ) : items.length === 0 ? (
              <p className="m-auto text-sm text-muted-foreground">لا يوجد مهتمون</p>
            ) : (
              items.map((n) => {
                const active = n.gift === "pending" || n.gift === "accepted";
                const exhausted = remaining === 0;
                return (
                  <div key={n.userId} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                      {n.avatarUrl ? (
                        <Image src={n.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <User className="absolute inset-0 m-auto size-5 text-primary/40" />
                      )}
                    </span>
                    <Link href={`/nominee/${tipId}/${n.userId}`} className="min-w-0 flex-1">
                      <p className="truncate text-start text-sm font-bold"><bdi dir="ltr">{n.phone || "—"}</bdi></p>
                      <p className="text-start text-[11px] text-muted-foreground">{formatter.format(new Date(n.at))}</p>
                    </Link>
                    {active && data?.qty != null ? (
                      <p className="shrink-0 text-sm font-bold text-primary">{remaining}</p>
                    ) : active ? (
                      <p className="text-xs font-bold text-primary">{GIFT_LABEL[n.gift as GiftStatus]}</p>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        aria-label="اختيار فائز"
                        disabled={!data?.free || exhausted || n.cooling || awarding !== null}
                        onClick={() => award(n.userId)}
                        className="size-10 shrink-0 rounded-full"
                      >
                        {awarding === n.userId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : n.gift === "declined" ? (
                          <Gift className="size-4" />
                        ) : (
                          <Trophy className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
