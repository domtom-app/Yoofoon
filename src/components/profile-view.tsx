"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Camera, Loader2, Pencil, TriangleAlert, User } from "lucide-react";
import { changePhone, saveAvatar, savePhonePublic, saveUserDistrict } from "@/app/actions/profile";
import { MyVoteCard } from "@/components/candidate-cards";
import { DistrictFields } from "@/components/district-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeDigits } from "@/lib/phone";
import type { Center, District, Governorate } from "@/lib/voting";
import type { MyVotes } from "@/lib/voting-data";
import type { TipItem } from "@/lib/tips-data";
import type { Places } from "@/lib/area";
import { AdvertCard } from "@/components/advert-card";
import { GiftCards } from "@/components/gift-cards";
import { NotificationList } from "@/components/notification-list";
import type { MyNotification } from "@/lib/notifications";
import type { MyGift } from "@/lib/gifts-data";

function PhoneEditor({ phone, initialPublic }: { phone: string; initialPublic: boolean }) {
  const [shown, setShown] = useState(initialPublic);
  const [savingVis, startVis] = useTransition();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reset = (v: boolean) => {
    setOpen(v);
    setStep("form");
    setValue("");
    setPassword("");
    setError(null);
  };
  const valid = /^01[0125]\d{8}$/.test(value);

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          aria-label="إظهار رقمي للجميع في إعلاناتي"
          checked={shown}
          disabled={savingVis}
          onChange={(e) => {
            const next = e.target.checked;
            setShown(next);
            startVis(async () => {
              const res = await savePhonePublic(next);
              if (res.error) setShown(!next);
            });
          }}
          className="size-4 cursor-pointer accent-primary"
        />
        <p dir="ltr" className="text-lg font-bold tabular-nums">
          {shown ? phone : "•••• ••• ••••"}
        </p>
        <Button
          variant="secondary"
          size="icon"
          aria-label="تعديل الرقم"
          onClick={() => reset(true)}
          className="size-9 rounded-full"
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>تعديل رقم الدخول</DialogTitle>
            <DialogDescription className="sr-only">تغيير رقم الهاتف</DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 rounded-2xl bg-secondary p-3 text-sm font-medium leading-[1.8]">
            <TriangleAlert className="mt-1 size-4 shrink-0 text-primary" />
            هذا هو رقم تسجيل الدخول، وسيصبح الرقم الجديد هو رقم دخولك. تأكد منه جيدًا.
          </div>

          {step === "form" ? (
            <div className="flex flex-col gap-3">
              <Input
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                placeholder="01xxxxxxxxx"
                aria-label="الرقم الجديد"
                value={value}
                onChange={(e) => setValue(normalizeDigits(e.target.value).slice(0, 11))}
                className="h-12 rounded-xl text-center tabular-nums"
              />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="كلمة المرور الحالية"
                aria-label="كلمة المرور الحالية"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
              <Button
                disabled={!valid || password.length < 6}
                onClick={() => setStep("confirm")}
                className="h-12 rounded-2xl text-base font-bold"
              >
                متابعة
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p dir="ltr" className="rounded-2xl border py-3 text-center text-2xl font-extrabold tabular-nums">
                {value}
              </p>
              {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setStep("form");
                  }}
                  className="h-12 rounded-2xl text-base font-bold"
                >
                  رجوع
                </Button>
                <Button
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await changePhone(value, password);
                      if (res.error) setError(res.error);
                      else reset(false);
                    })
                  }
                  className="h-12 rounded-2xl text-base font-bold"
                >
                  {pending ? "..." : "تأكيد"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProfileView({
  phone,
  phonePublic,
  avatarUrl,
  districtId,
  daysLeft,
  governorates,
  centers,
  districts,
  votes,
  tips,
  places,
  gifts,
  notifications,}: {
  phone: string;
  phonePublic: boolean;
  avatarUrl: string | null;
  districtId: string | null;
  daysLeft: number;
  governorates: Governorate[];
  centers: Center[];
  districts: District[];
  votes: MyVotes;
  tips: TipItem[];
  places: Places;
  gifts: MyGift[];
  notifications: MyNotification[];
}) {
  const [avatarPending, startAvatar] = useTransition();
  const [pending, start] = useTransition();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const current = districts.find((d) => d.id === districtId);
  const govName = governorates.find((g) => g.id === current?.governorateId)?.name;
  const centerName = centers.find((c) => c.id === current?.centerId)?.name;
  const locked = Boolean(districtId) && daysLeft > 0;

  const upload = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("photo", file);
    startAvatar(async () => {
      const res = await saveAvatar(fd);
      setAvatarError(res.error ?? null);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5">
      <label className="relative size-28 cursor-pointer">
        <span className="relative block size-28 overflow-hidden rounded-full bg-secondary ring-2 ring-primary/20">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <User className="absolute inset-0 m-auto size-12 text-primary/40" />
          )}
        </span>
        <span className="absolute bottom-0 end-0 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {avatarPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="صورة الملف"
          className="sr-only"
          disabled={avatarPending}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </label>
      {avatarError && <p role="alert" className="text-sm text-destructive">{avatarError}</p>}

      <PhoneEditor phone={phone} initialPublic={phonePublic} />

      <div className="flex w-full flex-col gap-3 rounded-3xl border bg-card p-4">
        <p className="text-center text-base font-bold leading-[1.5]">دائرتي</p>
        {current && (
          <p className="rounded-2xl bg-secondary px-4 py-2 text-center text-sm font-bold leading-[1.5]">
            {[govName, centerName, current.name].filter(Boolean).join(" - ")}
          </p>
        )}
        {locked ? (
          <p className="text-center text-sm text-muted-foreground">يمكن التعديل بعد {daysLeft} يوم</p>
        ) : (
          <DistrictFields
            governorates={governorates}
            centers={centers}
            districts={districts}
            initialId={districtId}
            submitLabel={districtId ? "تعديل" : "حفظ"}
            pending={pending}
            error={error}
            onSubmit={(id) =>
              start(async () => {
                const res = await saveUserDistrict(id);
                setError(res.error ?? null);
                setSaved(!res.error);
              })
            }
          />
        )}
        {saved && !error && <p className="text-center text-sm font-medium text-primary">تم الحفظ</p>}
      </div>

      {(votes.president || votes.member) && (
        <div className="grid w-full grid-cols-2 items-start gap-3">
          {[
            { key: "president", title: "رئاسي", path: "/", card: votes.president },
            { key: "member", title: "برلماني", path: "/parliament", card: votes.member },
          ].map(
            (s) =>
              s.card && (
                <div key={s.key} className="flex min-w-0 flex-col gap-2">
                  <p className="text-center text-sm font-bold leading-[1.5]">صوتي {s.title}</p>
                  <MyVoteCard c={s.card} path={s.path} />
                </div>
              ),
          )}
        </div>
      )}

      <NotificationList items={notifications} />

      <GiftCards gifts={gifts} />

      {tips.map((t) => (
        <AdvertCard key={t.id} tip={t} owner places={places} />
      ))}
    </div>
  );
}
