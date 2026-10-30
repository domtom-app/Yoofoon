"use client";

import Image from "next/image";
import { useState, useTransition, type ReactNode } from "react";
import { Camera, Loader2, Pencil, TriangleAlert, User } from "lucide-react";
import {
  changePassword,
  changePhone,
  saveAvatar,
  saveContactMode,
  saveSocial,
  saveUserDistrict,
  saveUsername,
  type ContactMode,
} from "@/app/actions/profile";
import { SOCIAL_ICONS, SocialLinksRow } from "@/components/social-links";
import { VerifiedBadge, type VerifyLevel } from "@/components/verified-badge";
import { SOCIAL_KEYS, SOCIAL_LABELS, type SocialLinks } from "@/lib/social";
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
import type { MyGift } from "@/lib/gifts-data";

function PhoneEditor({
  phone,
  initialPublic,
  initialBoth,
  initialName,
  initialSocial,
  initialSocialPublic,
  districtText,
  level,
  children,
}: {
  phone: string;
  initialPublic: boolean;
  initialBoth: boolean;
  initialName: string;
  initialSocial: SocialLinks;
  initialSocialPublic: boolean;
  districtText: string;
  level: VerifyLevel;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<ContactMode>(initialPublic ? (initialBoth ? "both" : "phone") : "name");
  const shown = mode !== "name";
  const [savingVis, startVis] = useTransition();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, startName] = useTransition();
  const [socialOpen, setSocialOpen] = useState(false);
  const [links, setLinks] = useState<SocialLinks>(initialSocial);
  const [socialShown, setSocialShown] = useState(initialSocialPublic);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [savingSocial, startSocial] = useTransition();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwPending, startPw] = useTransition();

  const reset = (v: boolean) => {
    setOpen(v);
    setStep("form");
    setSocialOpen(false);
    setSocialError(null);
    setValue("");
    setPassword("");
    setError(null);
    setPw({ current: "", next: "", again: "" });
    setPwMsg(null);
  };
  const pwValid = pw.current.length >= 6 && pw.next.length >= 6 && pw.next === pw.again;
  const valid = /^01[0125]\d{8}$/.test(value);
  const hasName = savedName.length > 0;

  const changeMode = (next: ContactMode) => {
    const prev = mode;
    setMode(next);
    startVis(async () => {
      const res = await saveContactMode(next);
      if (res.error) setMode(prev);
    });
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            {hasName && mode !== "phone" && (
              <p className="flex items-center gap-1 text-lg font-bold">
                {savedName}
                <VerifiedBadge level={level} />
              </p>
            )}
            {(!hasName || mode !== "name") && (
              <p dir="ltr" className="flex items-center gap-1 text-lg font-bold tabular-nums">
                {shown ? phone : "•••• ••• ••••"}
                {(!hasName || mode === "phone") && <VerifiedBadge level={level} />}
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            size="icon"
            aria-label="تعديل بيانات الظهور والرقم والدائرة"
            onClick={() => reset(true)}
            className="size-9 rounded-full"
          >
            <Pencil className="size-4" />
          </Button>
        </div>
        {socialShown && <SocialLinksRow links={links} />}
        {districtText && (
          <p className="text-center text-sm font-bold leading-[1.5] text-muted-foreground">{districtText}</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{socialOpen ? "مواقع التواصل" : "بياناتي"}</DialogTitle>
            <DialogDescription className="sr-only">الاسم والرقم والدائرة</DialogDescription>
          </DialogHeader>
          {socialOpen ? (
            <div className="flex flex-col gap-3">
              {SOCIAL_KEYS.map((k) => {
                const Icon = SOCIAL_ICONS[k];
                return (
                  <label key={k} className="flex items-center gap-2">
                    <Icon className="size-5 shrink-0 text-primary" />
                    <Input
                      dir="ltr"
                      inputMode="url"
                      maxLength={200}
                      placeholder={SOCIAL_LABELS[k]}
                      aria-label={SOCIAL_LABELS[k]}
                      value={links[k] ?? ""}
                      onChange={(e) => setLinks({ ...links, [k]: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </label>
                );
              })}
              {socialError && <p role="alert" className="text-center text-sm text-destructive">{socialError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={savingSocial}
                  onClick={() => setSocialOpen(false)}
                  className="h-12 rounded-2xl text-base font-bold"
                >
                  رجوع
                </Button>
                <Button
                  disabled={savingSocial}
                  onClick={() =>
                    startSocial(async () => {
                      const res = await saveSocial(links, true);
                      if (res.error) {
                        setSocialError(res.error);
                        return;
                      }
                      setSocialError(null);
                      setSocialShown(true);
                      setSocialOpen(false);
                    })
                  }
                  className="h-12 rounded-2xl text-base font-bold"
                >
                  {savingSocial ? "..." : "حفظ"}
                </Button>
              </div>
            </div>
          ) : (
            <>
          {step === "form" && children}
          {step === "form" && (
            <div className="flex flex-col gap-3 border-b pb-4">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  startName(async () => {
                    const res = await saveUsername(name);
                    setNameError(res.error ?? null);
                    if (!res.error) setSavedName(name.trim());
                  });
                }}
              >
                <Input
                  value={name}
                  maxLength={40}
                  placeholder="اسم المؤسسة أو اسمك"
                  aria-label="اسم المستخدم"
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 flex-1 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={savingName || name.trim() === savedName}
                  className="h-11 rounded-xl px-4 font-bold"
                >
                  {savingName ? "..." : "حفظ"}
                </Button>
              </form>
              {nameError && <p role="alert" className="text-sm text-destructive">{nameError}</p>}
              {hasName ? (
                <div className="flex flex-col gap-2 text-sm font-bold">
                  {(
                    [
                      ["name", "إظهار الاسم فقط"],
                      ["phone", "إظهار رقمي بدل الاسم"],
                      ["both", "إظهار رقمي مع الاسم"],
                    ] as const
                  ).map(([m, label]) => (
                    <label key={m} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="contact-mode"
                        checked={mode === m}
                        disabled={savingVis}
                        onChange={() => changeMode(m)}
                        className="size-4 cursor-pointer accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={shown}
                    disabled={savingVis}
                    onChange={(e) => changeMode(e.target.checked ? "phone" : "name")}
                    className="size-4 cursor-pointer accent-primary"
                  />
                  إظهار رقمي للجميع
                </label>
              )}
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={socialShown}
                    disabled={savingSocial}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSocialOpen(true);
                        return;
                      }
                      setSocialShown(false);
                      startSocial(async () => {
                        const res = await saveSocial(links, false);
                        if (res.error) setSocialShown(true);
                      });
                    }}
                    className="size-4 cursor-pointer accent-primary"
                  />
                  إضافة وإظهار مواقع التواصل
                </label>
                {socialShown && (
                  <Button variant="secondary" size="sm" onClick={() => setSocialOpen(true)} className="rounded-xl">
                    تعديل
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === "form" && (
            <div className="flex flex-col gap-3 border-b pb-4">
              <p className="text-center text-sm font-bold text-muted-foreground">تغيير كلمة المرور</p>
              {(["current", "next", "again"] as const).map((k) => (
                <Input
                  key={k}
                  type="password"
                  autoComplete={k === "current" ? "current-password" : "new-password"}
                  placeholder={
                    k === "current" ? "كلمة المرور الحالية" : k === "next" ? "كلمة المرور الجديدة" : "أعد كتابة الجديدة"
                  }
                  aria-label={k}
                  value={pw[k]}
                  onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
                  className="h-11 rounded-xl"
                />
              ))}
              {pw.again && pw.next !== pw.again && (
                <p className="text-center text-sm text-destructive">غير متطابقتين</p>
              )}
              {pwMsg && (
                <p
                  role="alert"
                  className={`text-center text-sm ${pwMsg.ok ? "font-medium text-primary" : "text-destructive"}`}
                >
                  {pwMsg.text}
                </p>
              )}
              <Button
                disabled={!pwValid || pwPending}
                onClick={() =>
                  startPw(async () => {
                    const res = await changePassword(pw.current, pw.next);
                    setPwMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "تم تغيير كلمة المرور" });
                    if (!res.error) setPw({ current: "", next: "", again: "" });
                  })
                }
                className="h-11 rounded-xl font-bold"
              >
                {pwPending ? "..." : "تغيير"}
              </Button>
            </div>
          )}

          <p className="text-center text-sm font-bold text-muted-foreground">تعديل رقم الدخول</p>

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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProfileView({
  phone,
  phonePublic,
  username,
  nameWithPhone,
  socialPublic,
  social,
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
  level,
}: {
  phone: string;
  phonePublic: boolean;
  username: string;
  nameWithPhone: boolean;
  socialPublic: boolean;
  social: SocialLinks;
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
  level: VerifyLevel;
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

      <PhoneEditor
        phone={phone}
        initialPublic={phonePublic}
        initialBoth={nameWithPhone}
        initialName={username}
        initialSocial={social}
        initialSocialPublic={socialPublic}
        level={level}
        districtText={[govName, centerName, current?.name].filter(Boolean).join(" - ")}
      >
        <div className="flex flex-col gap-3 border-b pb-4">
          <p className="text-center text-sm font-bold text-muted-foreground">دائرتي</p>
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
      </PhoneEditor>

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
                  <MyVoteCard c={{ ...s.card, details: undefined }} path={s.path} />
                </div>
              ),
          )}
        </div>
      )}

      <GiftCards gifts={gifts} />

      {tips.map((t) => (
        <AdvertCard key={t.id} tip={t} owner places={places} />
      ))}
    </div>
  );
}
