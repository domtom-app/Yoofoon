"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { deleteTip, saveTipsHeading, setTipApproved, updateTip } from "@/app/actions/tips";
import { Label } from "@/components/ui/label";
import { HEADING_MAX } from "@/lib/voting";
import { AreaFields } from "@/components/area-select";
import { PhotoField } from "@/components/photo-field";
import { useAction } from "@/components/admin-ui";
import { NativeSelect } from "@/components/native-select";
import { OfferField, TipForm } from "@/components/tips-section";
import type { Places } from "@/lib/area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AdminTip } from "@/lib/tips-data";

export function EditTip({
  tip,
  places,
  triggerClassName = "h-10 rounded-xl text-sm font-bold",
}: {
  tip: Pick<AdminTip, "id" | "title" | "body" | "photoUrl" | "area" | "link" | "offer" | "offerQty" | "offerPercent" | "priceNow" | "priceBefore">;
  places: Places;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction((fd) => updateTip(fd), () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" className={triggerClassName} />}
      >
        <Pencil className="size-4" />
        تعديل
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل</DialogTitle>
        </DialogHeader>
        <form action={run} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={tip.id} />
          <Input name="title" required maxLength={18} defaultValue={tip.title} aria-label="العنوان" className="h-12 rounded-xl" />
          <textarea
            name="body"
            rows={4}
            maxLength={2000}
            defaultValue={tip.body}
            aria-label="النص"
            className="w-full rounded-xl border border-input bg-transparent p-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <AreaFields places={places} initial={tip.area} allLabel="كل مصر" />
          <OfferField defaultValue={tip.offer} defaultQty={tip.offerQty} defaultPercent={tip.offerPercent} defaultPriceNow={tip.priceNow} defaultPriceBefore={tip.priceBefore} />
          <Input name="link" dir="ltr" inputMode="url" maxLength={300} defaultValue={tip.link ?? ""} placeholder="https://" aria-label="الرابط" className="h-12 rounded-xl" />
          {tip.photoUrl && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removePhoto" className="size-4" />
              حذف الصورة
            </label>
          )}
          <PhotoField />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="h-12 rounded-xl font-bold">
            {pending ? "..." : "حفظ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TipRow({ tip, places }: { tip: AdminTip; places: Places }) {
  const approve = useAction((fd) => setTipApproved(fd), () => {});
  const remove = useAction((fd) => deleteTip(fd), () => {});
  const error = approve.error ?? remove.error;
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-secondary p-3">
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-background">
          {tip.photoUrl && <Image src={tip.photoUrl} alt="" fill sizes="48px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{tip.title}</p>
          <p className="text-xs text-muted-foreground">
            {tip.approved ? `${tip.votes} مهتم` : "بانتظار المراجعة"}
            {tip.reports > 0 && <span className="font-bold text-destructive"> · {tip.reports} بلاغ</span>}
          </p>
        </div>
      </div>
      {tip.body && <p className="line-clamp-2 text-sm text-muted-foreground">{tip.body}</p>}
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-label="إشعار صاحب الإعلان"
        className="h-9 w-full rounded-xl border bg-background px-3 text-sm"
      >
        <option value="">إشعار بدون سبب</option>
        <option value="misleading">السبب: محتوى مضلل أو غير دقيق</option>
        <option value="inappropriate">السبب: محتوى غير لائق</option>
        <option value="incomplete">السبب: بيانات الإعلان غير مكتملة</option>
        <option value="duplicate">السبب: إعلان مكرر</option>
        <option value="custom">سبب آخر (كتابة)</option>
        <option value="none">عدم إرسال إشعار</option>
      </select>
      {reason === "custom" && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder="اكتب السبب"
          className="h-9 w-full rounded-xl border bg-background px-3 text-sm"
        />
      )}
      <div className="grid grid-cols-3 gap-2">
        <form action={approve.run} className="contents">
          <input type="hidden" name="reason" value={reason} />
          <input type="hidden" name="reason_text" value={note} />
          <input type="hidden" name="id" value={tip.id} />
          <input type="hidden" name="approved" value={String(!tip.approved)} />
          <Button
            type="submit"
            variant={tip.approved ? "outline" : "default"}
            disabled={approve.pending}
            className="h-10 rounded-xl text-sm font-bold"
          >
            {tip.approved ? <X className="size-4" /> : <Check className="size-4" />}
            {tip.approved ? "إخفاء" : "قبول"}
          </Button>
        </form>
        <EditTip tip={tip} places={places} />
        <form action={remove.run} className="contents">
          <input type="hidden" name="reason" value={reason} />
          <input type="hidden" name="reason_text" value={note} />
          <input type="hidden" name="id" value={tip.id} />
          <Button type="submit" variant="outline" disabled={remove.pending} className="h-10 rounded-xl text-sm font-bold text-destructive">
            <Trash2 className="size-4" />
            حذف
          </Button>
        </form>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </li>
  );
}

const filterCls = "h-10 ps-3 pe-7 text-sm";

function HeadingForm({ heading }: { heading: string }) {
  const [title, setTitle] = useState(heading);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean } | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <Label htmlFor="tips-heading">العنوان</Label>
      <div className="flex gap-2">
        <Input
          id="tips-heading"
          value={title}
          maxLength={HEADING_MAX}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 flex-1 rounded-xl text-base font-bold"
        />
        <Button
          disabled={pending || title.trim() === heading}
          onClick={() => start(async () => setMsg(await saveTipsHeading(title)))}
          className="h-12 rounded-xl px-5 font-bold"
        >
          {pending ? "..." : "حفظ"}
        </Button>
      </div>
      {msg?.error && <p role="alert" className="text-sm text-destructive">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-primary">تم الحفظ</p>}
    </div>
  );
}

export function TipsTab({
  tips,
  places,
  heading,
  initialStatus = "all",
}: {
  tips: AdminTip[];
  places: Places;
  heading: string;
  initialStatus?: string;
}) {
  const [formKey, setFormKey] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [gov, setGov] = useState("all");
  const shown = tips.filter(
    (t) =>
      (status === "all" || (status === "approved") === t.approved) &&
      (gov === "all" || String(t.area.governorateId ?? "") === gov),
  );
  return (
    <div className="flex flex-col gap-4">
      <HeadingForm heading={heading} />
      <TipForm key={formKey} places={places} onDone={() => setFormKey((k) => k + 1)} />
      <div className="grid grid-cols-2 gap-2">
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} aria-label="الحالة" className={filterCls} iconClassName="end-2 size-4">
          <option value="all">كل الحالات</option>
          <option value="approved">مقبول</option>
          <option value="pending">غير مقبول</option>
        </NativeSelect>
        <NativeSelect value={gov} onChange={(e) => setGov(e.target.value)} aria-label="المحافظة" className={filterCls} iconClassName="end-2 size-4">
          <option value="all">كل المحافظات</option>
          <option value="">كل مصر</option>
          {places.governorates.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <ul className="flex flex-col gap-2">
        {shown.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">لا توجد عناصر</li>}
        {shown.map((t) => (
          <TipRow key={t.id} tip={t} places={places} />
        ))}
      </ul>
    </div>
  );
}
