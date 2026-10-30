"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Share2, User } from "lucide-react";
import { type VoteState } from "@/app/actions/vote";
import { Button } from "@/components/ui/button";
import type { Candidate, WindowStatus } from "@/lib/voting";
import { cn } from "@/lib/utils";

function formatStart(iso: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(iso));
}

export function VoteButton({
  voted,
  locked,
  label,
  idle = "صوّت",
  done = "صوتي",
  icon = true,
  className,
}: {
  voted: boolean;
  locked: boolean;
  label?: React.ReactNode;
  idle?: string;
  done?: string;
  icon?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={locked || pending}
      variant={voted ? "secondary" : "default"}
      className={cn("h-12 w-full rounded-2xl text-base font-bold", voted && "disabled:opacity-100", className)}
    >
      {pending ? (
        <Loader2 className="size-5 animate-spin" />
      ) : label ? (
        label
      ) : voted ? (
        <>
          {icon && <Check className="size-5" />}
          {done}
        </>
      ) : (
        idle
      )}
    </Button>
  );
}

export function ShareButton({ name, path }: { name: string; path: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    const text = `صوّتُّ لـ ${name} على Yoofoon`;
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

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={share}
      aria-label={copied ? "تم النسخ" : "مشاركة"}
      className="h-10 w-9 shrink-0 rounded-none border-s border-background px-0"
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
    </Button>
  );
}

export function CandidateCard({
  c,
  mine = false,
  unit = "صوت",
  photoHref,
  description,
  price,
  place,
  stack,
  children,
}: {
  c: Candidate;
  mine?: boolean;
  unit?: string;
  photoHref?: string;
  description?: ReactNode;
  price?: ReactNode;
  place?: string;
  stack?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-3xl border bg-card p-3",
        mine && "border-primary ring-2 ring-primary/30",
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
        {c.photoUrl ? (
          <Image
            src={c.photoUrl}
            alt={c.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <User className="absolute inset-0 m-auto size-1/3 text-primary/40" />
        )}
        {photoHref && <Link href={photoHref} aria-label={c.name} className="absolute inset-0" />}
      </div>

      <h2 className="truncate text-center text-base font-bold leading-[1.5]">{c.name}</h2>

      {description && price && (
        <p dir="rtl" className="-mt-2 text-center text-base font-extrabold leading-[1.5] tabular-nums text-primary">
          {price}
        </p>
      )}

      {c.details && !(description && price) && (
        <div className="-mb-2 -mt-2 text-center text-[11px] font-bold leading-[1.5] text-muted-foreground">
          {c.details.map((d, i) => (
            <p key={i} className="truncate">
              {d || "\u00A0"}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {description ? (
          <div className="flex items-center justify-between gap-2 text-base font-extrabold leading-[1.5]">
            {stack ?? (
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {c.votes} {unit}
              </span>
            )}
            <span dir="rtl" className="min-w-0 truncate tabular-nums text-primary">
              {price ? <span className="text-xs text-muted-foreground">{place}</span> : `${c.percent}%`}
            </span>
          </div>
        ) : (
          <>
            <p dir="rtl" className="text-center text-2xl font-extrabold tabular-nums text-primary">
              {price ?? `${c.percent}%`}
            </p>
            <p className="flex items-center justify-between gap-2 text-xs font-bold leading-[1.5] text-muted-foreground">
              {stack ?? (
                <span className="shrink-0">
                  <span className="tabular-nums">{c.votes}</span> {unit}
                </span>
              )}
              {place ? <span className="min-w-0 truncate">{place}</span> : <span />}
            </p>
          </>
        )}
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700"
            style={{ width: `${c.percent}%` }}
          />
        </div>
      </div>

      {description}

      {children}
    </li>
  );
}

export function MyVoteCard({ c, path }: { c: Candidate; path: string }) {
  return (
    <ul className="w-full">
      <CandidateCard c={c} mine>
        <div className="flex overflow-hidden rounded-2xl">
          <div className="min-w-0 flex-1">
            <VoteButton voted locked className="h-10 rounded-none text-sm" />
          </div>
          <ShareButton name={c.name} path={path} />
        </div>
      </CandidateCard>
    </ul>
  );
}

export function CandidateCards({
  candidates,
  votedId,
  voteAction,
  status = "open",
  startsAt = null,
  endsAt = null,
  disabledLabel,
  onBeforeVote,
  sharePath = "/",
  account = false,
}: {
  disabledLabel?: string;
  onBeforeVote?: () => boolean;
  sharePath?: string;
  account?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  candidates: Candidate[];
  votedId: string | null;
  voteAction: (prev: VoteState, formData: FormData) => Promise<VoteState>;
  status?: WindowStatus;
}) {
  const [state, action] = useActionState<VoteState, FormData>(voteAction, {});
  const router = useRouter();
  const hasVoted = votedId !== null || status !== "open" || Boolean(disabledLabel);

  const [handled, setHandled] = useState<VoteState | null>(null);
  const celebrating = Boolean(state.done) && handled !== state;

  // The component state survives back navigation, so each result may redirect only once.
  useEffect(() => {
    if (!state.redirectTo || handled === state) return;
    const timer = setTimeout(() => {
      setHandled(state);
      router.push(state.redirectTo!);
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, handled, router]);

  return (
    <div className="flex flex-col gap-4">
      {(status !== "open" || startsAt || endsAt) && (
        <p className="text-center text-[11px] font-bold leading-[1.5] text-[#6b7a2a] md:text-base">
          {status === "closed" && !endsAt
            ? "انتهى التصويت"
            : status === "upcoming" && !startsAt
              ? "لم يبدأ التصويت"
              : [
                  startsAt && `${status === "upcoming" ? "يبدأ" : "بدأ"} ${formatStart(startsAt)}`,
                  endsAt && `${status === "closed" ? "انتهى" : "ينتهي"} ${formatStart(endsAt)}`,
                ]
                  .filter(Boolean)
                  .join(" - ")}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {candidates.map((c) => {
          const mine = c.id === votedId;
          return (
            <CandidateCard key={c.id} c={c} mine={mine}>
              {mine ? (
                <div className="flex overflow-hidden rounded-2xl">
                  <div className="min-w-0 flex-1">
                    <VoteButton voted locked label={celebrating ? "تم التصويت" : undefined} className="h-10 rounded-none text-sm" />
                  </div>
                  {!account && <ShareButton name={c.name} path={sharePath} />}
                </div>
              ) : (
                <form
                  action={action}
                  onSubmit={(e) => {
                    if (onBeforeVote && !onBeforeVote()) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="candidateId" value={c.id} />
                  <VoteButton voted={false} locked={hasVoted} label={disabledLabel} />
                </form>
              )}
            </CandidateCard>
          );
        })}
      </ul>
    </div>
  );
}
