"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Loader2, User } from "lucide-react";
import { listTipNominators, type PublicNominator } from "@/app/actions/gifts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const compactCount = (n: number) => (n > 999 ? `${Math.floor(n / 1000)}K` : String(n));

function Face({ url, size }: { url: string | null; size: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="relative block shrink-0 overflow-hidden rounded-full bg-background ring-2 ring-card"
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <User className="absolute inset-0 m-auto size-1/2 text-primary/40" />
      )}
    </span>
  );
}

export function NominatorStack({ tipId, count, avatars }: { tipId: string; count: number; avatars: (string | null)[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PublicNominator[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  if (count <= 0) return <span className="shrink-0 text-muted-foreground">0 مهتم</span>;

  return (
    <>
      <button
        type="button"
        aria-label={`المهتمون ${count}`}
        onClick={() => {
          setOpen(true);
          startLoad(async () => {
            const res = await listTipNominators(tipId);
            setItems(res.items);
            setError(res.error ?? null);
          });
        }}
        className="flex shrink-0 items-center gap-1.5 leading-[1.5]"
      >
        <span className="flex items-center">
          {avatars.slice(0, 2).map((url, i) => (
            <span key={i} className={i > 0 ? "relative z-10 -ms-1" : undefined}>
              <Face url={url} size={16} />
            </span>
          ))}
        </span>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">{compactCount(count)} مهتم</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[80dvh] flex-col gap-3 p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">المهتمون ({compactCount(count)})</DialogTitle>
          </DialogHeader>
          {loading && !items ? (
            <Loader2 className="mx-auto my-6 size-6 animate-spin text-primary" />
          ) : error ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {(items ?? []).map((n) => (
                <div key={n.userId} className="flex items-center gap-3 rounded-2xl bg-secondary p-2.5">
                  <Face url={n.avatarUrl} size={40} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-bold">{n.name}</p>
                    {n.governorate && <p className="text-xs text-muted-foreground">{n.governorate}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
