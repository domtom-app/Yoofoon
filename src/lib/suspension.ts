export type SuspendKind = "post" | "hide" | "full";

export const SUSPEND_LABELS: Record<SuspendKind, string> = {
  post: "منع النشر",
  hide: "إخفاء الإعلانات",
  full: "إيقاف كامل",
};

export const SUSPEND_REASONS = ["مخالفة المحتوى", "بلاغات متكررة", "بناءً على طلب المعلن"] as const;

export type Suspension = { kind: SuspendKind; reason: string; until: string | null };

type SuspendColumns = {
  suspend_kind?: string | null;
  suspend_reason?: string | null;
  suspend_until?: string | null;
};

// A suspension ends by itself once its end date passes, so it is evaluated on every read.
export function activeSuspension(p: SuspendColumns | null | undefined, now = new Date()): Suspension | null {
  const kind = p?.suspend_kind;
  if (kind !== "post" && kind !== "hide" && kind !== "full") return null;
  const until = p?.suspend_until ?? null;
  if (until && new Date(until) <= now) return null;
  return { kind, reason: p?.suspend_reason ?? "", until };
}

export function untilText(until: string | null): string {
  return until
    ? `حتى ${new Date(until).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" })}`
    : "حتى إشعار آخر";
}
