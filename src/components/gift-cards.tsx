"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Gift, Share2, Undo2 } from "lucide-react";
import { respondGift } from "@/app/actions/gifts";
import { Button } from "@/components/ui/button";
import type { MyGift } from "@/lib/gifts-data";

const formatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" });

function GiftSummary({ g }: { g: MyGift }) {
  return (
    <>
      {g.photoUrl && (
        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
          <Image src={g.photoUrl} alt="" fill sizes="64px" className="object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{g.title}</p>
        {g.body && <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{g.body}</p>}
      </div>
    </>
  );
}

function GiftCard({ g }: { g: MyGift }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${g.tipId ? `/advertiser/${g.tipId}` : ""}`;
    const text = `فزت بهدية من إعلان «${g.title}» على Yoofoon`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The user dismissed the share sheet.
    }
  };
  const respond = (accept: boolean) => {
    start(async () => {
      const res = await respondGift(g.id, accept);
      setError(res.error ?? null);
    });
  };

  return (
    <div id="gifts" className="flex w-full scroll-mt-24 flex-col gap-3 overflow-hidden rounded-3xl border border-primary/30 bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        <Gift className="size-5" />
        <p className="text-base font-bold leading-[1.5]">فزت بهدية</p>
        <span className="ms-auto text-xs text-muted-foreground">{formatter.format(new Date(g.createdAt))}</span>
      </div>
      {g.tipId ? (
        <Link href={`/advertiser/${g.tipId}`} className="flex gap-3 rounded-2xl bg-secondary p-2">
          <GiftSummary g={g} />
        </Link>
      ) : (
        <div className="flex gap-3 rounded-2xl bg-secondary p-2">
          <GiftSummary g={g} />
        </div>
      )}
      {g.status === "accepted" ? (
        <div className="flex items-center justify-center gap-3">
          <p className="flex items-center gap-1 text-sm font-bold text-primary">
            <Check className="size-4" />
            تم قبول الهدية
          </p>
          <button
            type="button"
            onClick={share}
            aria-label={copied ? "تم النسخ" : "مشاركة"}
            className="flex size-8 items-center justify-center text-primary"
          >
            {copied ? <Check className="size-5" /> : <Share2 className="size-5" />}
          </button>
        </div>
      ) : confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-center text-sm font-bold">رد الهدية؟</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="destructive" disabled={pending} onClick={() => respond(false)} className="h-10 rounded-xl text-sm font-bold">
              تأكيد الرد
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)} className="h-10 rounded-xl text-sm font-bold">
              تراجع
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" disabled={pending} onClick={() => respond(true)} className="h-10 rounded-xl text-sm font-bold">
            <Check className="size-4" />
            قبول
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(true)} className="h-10 rounded-xl text-sm font-bold">
            <Undo2 className="size-4" />
            رد الهدية
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function GiftCards({ gifts }: { gifts: MyGift[] }) {
  return gifts.map((g) => <GiftCard key={g.id} g={g} />);
}
