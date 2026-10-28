"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authenticate, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "login", label: "دخول" },
  { id: "signup", label: "حساب جديد" },
] as const;

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [show, setShow] = useState(false);
  const [state, action, pending] = useActionState<AuthState, FormData>(
    authenticate,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="mode" value={mode} />

      <div className="grid grid-cols-2 rounded-2xl bg-secondary p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            className={cn(
              "h-11 rounded-xl text-base font-bold transition-colors",
              mode === m.id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <Input
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="رقم الهاتف"
            aria-label="رقم الهاتف"
            aria-invalid={!!state.fields?.phone}
            maxLength={11}
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(normalizeDigits(e.target.value))}
            className="h-14 rounded-2xl bg-card ps-4 pe-14 text-start text-lg"
          />
          <span
            dir="ltr"
            className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-xs tabular-nums text-muted-foreground"
          >
            {phone.length}/11
          </span>
        </div>
        {state.fields?.phone && (
          <p className="text-sm text-destructive">{state.fields.phone}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <Input
            name="password"
            type={show ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="كلمة المرور"
            aria-label="كلمة المرور"
            aria-invalid={!!state.fields?.password}
            className="h-14 rounded-2xl bg-card ps-4 pe-14 text-start text-lg"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "إخفاء" : "إظهار"}
            className="absolute inset-y-0 end-0 flex w-14 items-center justify-center text-muted-foreground"
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {state.fields?.password && (
          <p className="text-sm text-destructive">{state.fields.password}</p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-14 rounded-2xl text-lg font-bold"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : mode === "login" ? (
          "دخول"
        ) : (
          "إنشاء حساب"
        )}
      </Button>
    </form>
  );
}
