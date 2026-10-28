"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowUpLeft, MapPin, Plus } from "lucide-react";
import { nominateTip, submitTip, type TipState } from "@/app/actions/tips";
import { AreaFields, AreaSelect } from "@/components/area-select";
import { CandidateCard, VoteButton } from "@/components/candidate-cards";
import { PhotoField } from "@/components/photo-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { OfferStrip } from "@/components/offer-strip";
import { areasOverlap, NO_AREA, type Area, type Places } from "@/lib/area";
import type { TipItem, TipOffer } from "@/lib/tips-data";
import { cn } from "@/lib/utils";

export const TIPS_HEADING = "فيد واستفيد";

function offerLabel(tip: TipItem) {
  if (tip.offer === "free") return tip.offerQty ? `${tip.offerQty} هدية` : "مجاني";
  const base = tip.offerPercent ? `${tip.offerPercent}%` : "خصم";
  return tip.offerQty ? `${base} · عدد ${tip.offerQty}` : base;
}

export function OfferField({
  defaultValue = "none",
  defaultQty = null,
  defaultPercent = null,
}: {
  defaultValue?: TipOffer;
  defaultQty?: number | null;
  defaultPercent?: number | null;
}) {
  const [offer, setOffer] = useState<TipOffer>(defaultValue);
  return (
    <div className="flex flex-col gap-2">
      <NativeSelect
        name="offer"
        aria-label="العرض"
        value={offer}
        onChange={(e) => setOffer(e.target.value as TipOffer)}
        className="text-sm font-bold"
      >
        <option value="none">بدون عرض</option>
        <option value="discount">عرض خصم</option>
        <option value="free">مجاني</option>
      </NativeSelect>
      {offer === "discount" && (
        <Input
          name="offerPercent"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          defaultValue={defaultPercent ?? ""}
          placeholder="نسبة الخصم %"
          aria-label="نسبة الخصم"
          className="h-12 rounded-xl"
        />
      )}
      {offer !== "none" && (
        <Input
          name="offerQty"
          type="number"
          inputMode="numeric"
          min={1}
          max={99999}
          defaultValue={defaultQty ?? ""}
          placeholder={offer === "free" ? "عدد الهدايا (اختياري)" : "عدد المستفيدين (اختياري)"}
          aria-label={offer === "free" ? "عدد الهدايا" : "عدد المستفيدين"}
          className="h-12 rounded-xl"
        />
      )}
    </div>
  );
}

export function TipForm({ places, onDone }: { places: Places; onDone?: () => void }) {
  const [state, action, pending] = useActionState<TipState, FormData>(async (prev, fd) => {
    const res = await submitTip(prev, fd);
    if (res.done) onDone?.();
    return res;
  }, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tip-title">العنوان</Label>
        <Input id="tip-title" name="title" required maxLength={18} className="h-12 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tip-body">النص</Label>
        <textarea
          id="tip-body"
          name="body"
          rows={4}
          maxLength={2000}
          className="w-full rounded-xl border border-input bg-transparent p-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>النطاق</Label>
        <AreaFields places={places} allLabel="كل مصر" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tip-link">رابط الصفحة أو الموقع أو المتجر</Label>
        <Input id="tip-link" name="link" dir="ltr" inputMode="url" maxLength={300} placeholder="https://" className="h-12 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>العرض</Label>
        <OfferField />
      </div>
      <PhotoField />
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-12 rounded-xl font-bold">
        {pending ? "..." : "إرسال"}
      </Button>
    </form>
  );
}

function AddTip({ account, places }: { account: boolean; places: Places }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (!account) {
    return (
      <Button render={<Link href="/login" />} nativeButton={false} variant="outline" className="h-10 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        إضافة
      </Button>
    );
  }
  return (
    <>
      <Button variant="outline" onClick={() => { setSent(false); setOpen(true); }} className="h-10 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        إضافة
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {TIPS_HEADING} <span className="font-normal text-muted-foreground">· سوق مجاني</span>
            </DialogTitle>
          </DialogHeader>
          {sent ? (
            <p className="py-6 text-center font-bold text-primary">تم الإرسال، بانتظار المراجعة</p>
          ) : (
            <TipForm places={places} onDone={() => setSent(true)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NominateForm({ tip, mine, account }: { tip: TipItem; mine: boolean; account: boolean }) {
  const [state, action] = useActionState<TipState, FormData>(nominateTip, {});
  const voted = mine || Boolean(state.done);
  const locked = voted || !tip.canNominate;
  const pad = tip.offer !== "none" && "pr-9";

  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex overflow-hidden rounded-2xl">
        {tip.offer !== "none" && <OfferStrip label={offerLabel(tip)} />}
        {!tip.canNominate ? (
          <Button disabled className={cn("h-10 min-w-0 flex-1 whitespace-nowrap rounded-none px-1 text-sm font-bold", pad)}>
            غير متاح
          </Button>
        ) : account ? (
          <form action={action} className="min-w-0 flex-1">
            <input type="hidden" name="tipId" value={tip.id} />
            <VoteButton voted={voted} locked={voted} idle="مهتم" done="تم" icon={false} className={cn("h-10 rounded-none text-sm", pad)} />
          </form>
        ) : (
          <Button render={<Link href="/login" />} nativeButton={false} className={cn("h-10 min-w-0 flex-1 rounded-none text-sm font-bold", pad)}>
            مهتم
          </Button>
        )}
        {tip.link && (
          <a
            href={tip.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label="فتح الرابط"
            className={cn(
              "flex w-9 shrink-0 items-center justify-center border-s",
              locked
                ? "border-background bg-secondary text-secondary-foreground"
                : "border-primary-foreground/30 bg-primary text-primary-foreground",
            )}
          >
            <ArrowUpLeft className="size-4" />
          </a>
        )}
      </div>
      {state.error && <p role="alert" className="text-center text-xs text-destructive">{state.error}</p>}
    </div>
  );
}

export function TipsSection({
  tips,
  mine,
  account,
  places,
  heading = true,
}: {
  tips: TipItem[];
  mine: string[];
  account: boolean;
  places: Places;
  heading?: boolean;
}) {
  const [filtering, setFiltering] = useState(false);
  const [filter, setFilter] = useState<Area>(NO_AREA);
  const visible = tips.filter(
    (t) => filter.governorateId === null || (t.area.governorateId !== null && areasOverlap(t.area, filter)),
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3">
        {heading && <h2 className="truncate text-base font-bold leading-[1.5]">{TIPS_HEADING}</h2>}
        <div className="flex items-center gap-2">
          <AddTip account={account} places={places} />
          <Button
            type="button"
            variant={filtering ? "default" : "outline"}
            onClick={() => {
              setFiltering(!filtering);
              setFilter(NO_AREA);
            }}
            className="h-10 rounded-full px-4 font-bold"
          >
            <MapPin className="size-4" />
            منطقتي
          </Button>
        </div>
      </div>
      {filtering && (
        <div className="mx-auto w-full max-w-sm">
          <AreaSelect places={places} value={filter} onChange={setFilter} allLabel="كل المناطق" />
        </div>
      )}
      {visible.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">لا توجد عناصر</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((t) => (
            <CandidateCard
              key={t.id}
              c={t}
              unit="مهتم"
              mine={mine.includes(t.id)}
              photoHref={t.hasOwner ? `/advertiser/${t.id}` : undefined}
            >
              <NominateForm tip={t} mine={mine.includes(t.id)} account={account} />
            </CandidateCard>
          ))}
        </ul>
      )}
    </section>
  );
}
