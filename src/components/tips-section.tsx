"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
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
import { NominatorStack } from "@/components/nominator-stack";
import { TipsGuide } from "@/components/tips-guide";
import { areasOverlap, NO_AREA, type Area, type Places } from "@/lib/area";
import type { TipItem, TipOffer } from "@/lib/tips-data";
import { cn } from "@/lib/utils";

export const TIPS_HEADING = "فيد واستفيد";
const OFFER_FILTERS: [TipOffer | "all", string][] = [
  ["all", "الكل"],
  ["free", "مجاني"],
  ["discount", "خصم"],
  ["none", "بدون عرض"],
];

// The headline figure replacing the vote percentage: the price, else the offer.
export function headline(tip: TipItem): ReactNode {
  if (tip.priceNow !== null) return <PriceText tip={tip} />;
  if (tip.offer === "free") return tip.offerQty ? `${tip.offerQty} هدية` : "مجاني";
  if (tip.offer === "discount") return tip.offerPercent ? `${tip.offerPercent}%` : "خصم";
  return undefined;
}

export function PriceText({ tip }: { tip: Pick<TipItem, "priceNow" | "priceBefore"> }) {
  if (tip.priceNow === null) return null;
  return (
    <>
      {formatPrice(tip.priceNow)} ج
      {tip.priceBefore && (
        <span className="ms-1.5 font-bold text-muted-foreground">
          <span className="line-through decoration-red-600 decoration-[1px]">{formatPrice(tip.priceBefore)}</span> ج
        </span>
      )}
    </>
  );
}

const formatPrice = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function OfferField({
  defaultValue = "none",
  defaultQty = null,
  defaultPercent = null,
  defaultPriceNow = null,
  defaultPriceBefore = null,
}: {
  defaultValue?: TipOffer;
  defaultQty?: number | null;
  defaultPercent?: number | null;
  defaultPriceNow?: number | null;
  defaultPriceBefore?: number | null;
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
      {offer !== "free" && (
        <div className={offer === "discount" ? "grid grid-cols-2 gap-2" : undefined}>
          <Input
            name="priceNow"
            type="text"
            inputMode="decimal"
            maxLength={10}
            defaultValue={defaultPriceNow ?? ""}
            placeholder="السعر الآن"
            aria-label="السعر الآن"
            className="h-12 rounded-xl"
          />
          {offer === "discount" && (
            <Input
              name="priceBefore"
              type="text"
              inputMode="decimal"
              maxLength={10}
              defaultValue={defaultPriceBefore ?? ""}
              placeholder="السعر قبل"
              aria-label="السعر قبل"
              className="h-12 rounded-xl"
            />
          )}
        </div>
      )}
      {offer === "discount" && (
        <Input
          name="offerPercent"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          defaultValue={defaultPercent ?? ""}
          placeholder="نسبة الخصم % (تُحسب من السعرين إن تُركت)"
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
        <Label htmlFor="tip-link">رابط المنتج أو الصفحة أو الموقع أو المتجر</Label>
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

function AddTip({
  account,
  places,
  blocked,
  onBlocked,
}: {
  account: boolean;
  places: Places;
  blocked: string | null;
  onBlocked: () => void;
}) {
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
      <Button
        variant="outline"
        onClick={() => {
          if (blocked) return onBlocked();
          setSent(false);
          setOpen(true);
        }}
        className="h-10 rounded-full px-4 font-bold"
      >
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
  const hasStrip = tip.offer !== "none" || tip.priceNow !== null;
  const pad = hasStrip && "pr-9";

  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex overflow-hidden rounded-2xl">
        {hasStrip && <OfferStrip label={`${tip.percent}%`} avatarUrl={tip.ownerAvatarUrl} />}
        {tip.isOwn || !tip.canNominate ? (
          <Button disabled className={cn("h-10 min-w-0 flex-1 whitespace-nowrap rounded-none px-1 text-sm font-bold", pad)}>
            {tip.isOwn ? "إعلاني" : "خارج محافظتك"}
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
  title = TIPS_HEADING,
  blocked = null,
}: {
  tips: TipItem[];
  mine: string[];
  account: boolean;
  places: Places;
  heading?: boolean;
  title?: string;
  blocked?: string | null;
}) {
  const [filtering, setFiltering] = useState(false);
  const [filter, setFilter] = useState<Area>(NO_AREA);
  const [offerFilter, setOfferFilter] = useState<TipOffer | "all">("all");
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(false), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  const visible = tips.filter(
    (t) =>
      (offerFilter === "all" || t.offer === offerFilter) &&
      (filter.governorateId === null || (t.area.governorateId !== null && areasOverlap(t.area, filter))),
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3">
        {heading && <h2 className="truncate text-base font-bold leading-[1.5]">{title}</h2>}
        <div className="flex items-center gap-2">
          <AddTip account={account} places={places} blocked={blocked} onBlocked={() => setNotice(true)} />
          <TipsGuide />
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
      <div className="flex justify-center gap-1.5">
        {OFFER_FILTERS.map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={offerFilter === value ? "default" : "outline"}
            onClick={() => setOfferFilter(value)}
            className="h-8 rounded-full px-3 text-xs font-bold"
          >
            {label}
          </Button>
        ))}
      </div>
      {notice && blocked && (
        <p role="alert" className="mx-auto rounded-2xl bg-destructive/10 px-4 py-2 text-center text-sm font-bold leading-[1.6] text-destructive">
          {blocked}
        </p>
      )}
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
              c={{ ...t, details: [t.body] }}
              place={t.areaText}
              price={headline(t)}
              unit="مهتم"
              stack={<NominatorStack tipId={t.id} count={t.votes} avatars={t.nominatorAvatars} />}
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
