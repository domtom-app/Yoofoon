import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerifyLevel = "blue" | "silver" | null;

export function verifyLevel(p: { verified?: boolean | null; terms_accepted_at?: string | null } | null | undefined): VerifyLevel {
  if (p?.verified) return "blue";
  return p?.terms_accepted_at ? "silver" : null;
}

export function VerifiedBadge({ level, className }: { level: VerifyLevel; className?: string }) {
  if (!level) return null;
  return (
    <BadgeCheck
      aria-label={level === "blue" ? "حساب موثّق من الإدارة" : "حساب موثّق"}
      className={cn("inline-block size-5 shrink-0 align-middle", level === "blue" ? "text-sky-500" : "text-slate-400", className)}
    />
  );
}
