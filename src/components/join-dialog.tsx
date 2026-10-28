"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { joinToVote, type JoinResult } from "@/app/actions/auth";
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
import { cn } from "@/lib/utils";

type Places = { governorates: Governorate[]; centers: Center[]; districts: District[] };

const MODES = [
  { id: "signup", label: "حساب جديد" },
  { id: "login", label: "دخول" },
] as const;

function JoinForm({ places, initialId, onDone }: { places: Places; initialId: string | null; onDone: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [districtId, setDistrictId] = useState(initialId ?? "");
  const [result, setResult] = useState<JoinResult>({});
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await joinToVote({ mode, phone, password, districtId });
      setResult(res);
      if (!res.error && !res.fields) {
        onDone();
        router.refresh();
      }
    });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-2 rounded-2xl bg-secondary p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setResult({});
            }}
            aria-pressed={mode === m.id}
            className={cn(
              "h-10 rounded-xl text-sm font-bold transition-colors",
              mode === m.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="رقم الهاتف"
          aria-label="رقم الهاتف"
          aria-invalid={!!result.fields?.phone}
          maxLength={11}
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(normalizeDigits(e.target.value))}
          className="h-12 rounded-2xl bg-card px-4 text-start text-base"
        />
        {result.fields?.phone && <p className="text-sm text-destructive">{result.fields.phone}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="كلمة المرور"
            aria-label="كلمة المرور"
            aria-invalid={!!result.fields?.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-2xl bg-card ps-4 pe-12 text-start text-base"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "إخفاء" : "إظهار"}
            className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-muted-foreground"
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {result.fields?.password && <p className="text-sm text-destructive">{result.fields.password}</p>}
      </div>

      {mode === "signup" && (
        <DistrictFields {...places} initialId={initialId} onChange={setDistrictId} />
      )}

      {result.error && (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          {result.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || (mode === "signup" && !districtId)}
        className="h-12 rounded-2xl text-base font-bold"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : mode === "signup" ? "إنشاء حساب" : "دخول"}
      </Button>
    </form>
  );
}

export function JoinDialog({
  open,
  onOpenChange,
  places,
  initialId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  places: Places;
  initialId: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>سجّل لتصوّت</DialogTitle>
          <DialogDescription>تصوّت لأعضاء دائرتك فقط.</DialogDescription>
        </DialogHeader>
        <JoinForm places={places} initialId={initialId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
