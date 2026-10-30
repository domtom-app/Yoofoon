"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  createContender,
  deleteContender,
  rerunContender,
  voteContender,
} from "@/app/actions/contests";
import type { TipState } from "@/app/actions/tips";
import { AreaFields } from "@/components/area-select";
import { CandidateCard, VoteButton } from "@/components/candidate-cards";
import { NativeSelect } from "@/components/native-select";
import { PhotoField } from "@/components/photo-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoterStack } from "@/components/nominator-stack";
import { ReportButton } from "@/components/report-button";
import { CONTEST_CATEGORIES, CONTEST_START_COUNT, categoryOf } from "@/lib/contests";
import type { ContestItem, ContestsData, OutContender } from "@/lib/contests-data";
import type { Places } from "@/lib/area";

function ContenderForm({ places, onDone }: { places: Places; onDone: () => void }) {
  const [category, setCategory] = useState(CONTEST_CATEGORIES[0].id);
  const [state, action, pending] = useActionState<TipState, FormData>(async (prev, fd) => {
    const res = await createContender(prev, fd);
    if (res.done) onDone();
    return res;
  }, {});
  const cat = categoryOf(category)!;

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="c-name">الاسم</Label>
        <Input id="c-name" name="name" required maxLength={40} className="h-12 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>المجال</Label>
        <NativeSelect
          name="category"
          aria-label="المجال"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm font-bold"
        >
          {CONTEST_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
        {cat.specialties.length > 0 ? (
          <NativeSelect key={cat.id} name="specialty" aria-label="التخصص" className="text-sm font-bold">
            <option value="">التخصص</option>
            {cat.specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Input name="specialty" maxLength={30} placeholder="اكتب المجال" aria-label="المجال" className="h-12 rounded-xl" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label>النطاق</Label>
        <AreaFields places={places} allLabel="كل مصر" />
        <p className="text-xs text-muted-foreground">يصوّت لك سكان النطاق فقط.</p>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        مدة الاستفتاء 30 يومًا لكل المتنافسين في نفس المجال والنطاق. بعدها يبقى المركز الأول فقط ويخرج الباقون، وتبدأ
        جولة جديدة عندما يتنافس {CONTEST_START_COUNT} في نفس المجال، ولو اختلفت المحافظة.
      </p>
      <PhotoField />
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-12 rounded-xl font-bold">
        {pending ? "..." : "ترشّح"}
      </Button>
    </form>
  );
}

function AddContender({ account, places }: { account: boolean; places: Places }) {
  const [open, setOpen] = useState(false);
  if (!account) {
    return (
      <Button render={<Link href="/login" />} nativeButton={false} variant="outline" className="h-10 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        ترشّح
      </Button>
    );
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-10 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        ترشّح
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>استفتاء جديد</DialogTitle>
          </DialogHeader>
          <ContenderForm places={places} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContestActions({ item, account }: { item: ContestItem; account: boolean }) {
  const [state, action] = useActionState<TipState, FormData>(voteContender, {});
  const [confirm, setConfirm] = useState(false);
  const [busy, startBusy] = useTransition();
  const voted = item.voted || Boolean(state.done);

  if (item.isOwn) {
    return (
      <div className="flex flex-col gap-1">
        <Button disabled className="h-10 rounded-2xl text-sm font-bold">ترشيحي</Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          autoFocus={confirm}
          onBlur={() => setConfirm(false)}
          onClick={() => (confirm ? startBusy(async () => void (await deleteContender(item.id))) : setConfirm(true))}
          className="h-8 rounded-xl text-xs font-bold text-destructive"
        >
          {confirm ? "تأكيد الحذف" : "حذف"}
        </Button>
      </div>
    );
  }
  if (!account) {
    return (
      <Button render={<Link href="/login" />} nativeButton={false} className="h-10 rounded-2xl text-sm font-bold">
        صوّت
      </Button>
    );
  }
  if (item.daysLeft === null) {
    return <Button disabled className="h-10 rounded-2xl px-1 text-sm font-bold">بانتظار المنافسين</Button>;
  }
  if (!item.canVote) {
    return <Button disabled className="h-10 rounded-2xl px-1 text-sm font-bold">لسكان النطاق فقط</Button>;
  }
  return (
    <div className="flex flex-col gap-1">
      <form action={action}>
        <input type="hidden" name="contenderId" value={item.id} />
        <VoteButton voted={voted} locked={voted || item.groupVoted} idle={item.groupVoted ? "سبق تصويتك" : "صوّت"} done="تم" icon={false} className="h-10 text-sm" />
      </form>
      {state.error && <p role="alert" className="text-center text-xs text-destructive">{state.error}</p>}
    </div>
  );
}

function OutCard({ item }: { item: OutContender }) {
  const [state, action, pending] = useActionState<TipState, FormData>(rerunContender, {});
  return (
    <form action={action} className="flex flex-col gap-2 rounded-2xl border p-3">
      <input type="hidden" name="id" value={item.id} />
      <p className="text-sm font-bold">
        {item.name} <span className="font-normal text-muted-foreground">· {item.categoryLabel} · {item.areaText}</span>
      </p>
      <Button type="submit" disabled={pending} className="h-10 rounded-xl text-sm font-bold">
        {pending ? "..." : "رشّحني مرة أخرى"}
      </Button>
      {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function ContestsSection({ data }: { data: ContestsData }) {
  const [category, setCategory] = useState("");
  const visible = data.items.filter((i) => !category || i.categoryId === category);

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">الاستفتاءات</h1>
        <AddContender account={data.account} places={data.places} />
      </div>
      <NativeSelect
        aria-label="المجال"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="text-sm font-bold"
      >
        <option value="">كل المجالات</option>
        {CONTEST_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </NativeSelect>
      {data.out.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-muted-foreground">خرجت من المنافسة</p>
          {data.out.map((o) => (
            <OutCard key={o.id} item={o} />
          ))}
        </div>
      )}
      {visible.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">لا توجد استفتاءات</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((i) => (
            <CandidateCard
              key={i.id}
              c={{
                ...i,
                details: [
                  [i.categoryLabel, i.specialty].filter(Boolean).join(" · "),
                  i.daysLeft === null
                    ? `بانتظار المنافسين ${i.groupSize}/${CONTEST_START_COUNT}`
                    : `المركز ${i.rank} · ينتهي بعد ${i.daysLeft} يوم`,
                ],
              }}
              place={i.areaText}
              unit="صوت"
              stack={<VoterStack id={i.id} count={i.votes} avatars={i.voterAvatars} />}
              mine={i.voted}
            >
              <div className="flex flex-col gap-2">
                <ContestActions item={i} account={data.account} />
                {data.account && !i.isOwn && <ReportButton contenderId={i.id} />}
              </div>
            </CandidateCard>
          ))}
        </ul>
      )}
    </section>
  );
}
