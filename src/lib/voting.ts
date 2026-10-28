export const HEADING_MAX = 32;

export const DEFAULT_HEADINGS = {
  president: "تصويت حقيقي غير رسمي",
  parliament: "تصويت البرلمان",
} as const;

export type Candidate = {
  id: string;
  name: string;
  photoUrl: string | null;
  votes: number;
  percent: number;
  details?: string[];
};

type Row = { id: string; name: string; photo_path: string | null; votes: number };

export type MemberRow = Row & {
  governorate: string;
  center: string | null;
  district: string | null;
  district_id: string | null;
};

export type Governorate = { id: number; name: string };
export type Center = { id: string; governorateId: number; name: string };
export type District = Center & { centerId: string };

export function toCenters(rows: { id: string; governorate_id: number; name: string }[]): Center[] {
  return rows.map((r) => ({ id: r.id, governorateId: r.governorate_id, name: r.name }));
}

export function toDistricts(
  rows: { id: string; governorate_id: number; center_id: string; name: string }[],
): District[] {
  return rows.map((r) => ({
    id: r.id,
    governorateId: r.governorate_id,
    centerId: r.center_id,
    name: r.name,
  }));
}

export const WINNER_DAYS = 3;
export const DISTRICT_CHANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Days left before the voter may change their district again (0 = allowed now).
export function daysUntilChange(changedAt: string | null | undefined, now: Date) {
  if (!changedAt) return 0;
  const unlock = new Date(changedAt).getTime() + DISTRICT_CHANGE_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((unlock - now.getTime()) / DAY_MS));
}

export type HomePhase = "upcoming" | "voting" | "winner" | "announcement";
export type WindowStatus = "upcoming" | "open" | "closed";

export function windowStatus(
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date,
): WindowStatus {
  if (startsAt && now < startsAt) return "upcoming";
  if (endsAt && now >= endsAt) return "closed";
  return "open";
}

export function phaseOf(
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date,
): HomePhase {
  const status = windowStatus(startsAt, endsAt, now);
  if (status === "upcoming") return "upcoming";
  if (status === "open") return "voting";
  if (now.getTime() < endsAt!.getTime() + WINNER_DAYS * DAY_MS) return "winner";
  return "announcement";
}

export function toPercent(votes: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((votes / total) * 1000) / 10;
}

// Stable sort: highest votes first, ties keep the incoming order.
function build<T extends Row>(
  rows: T[],
  photoBaseUrl: string,
  details?: (r: T) => string[],
): Candidate[] {
  const total = rows.reduce((sum, r) => sum + r.votes, 0);
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      photoUrl: r.photo_path ? `${photoBaseUrl}/${r.photo_path}` : null,
      votes: r.votes,
      percent: toPercent(r.votes, total),
      ...(details ? { details: details(r) } : {}),
    }))
    .sort((a, b) => b.votes - a.votes);
}

export function toCandidates(rows: Row[], photoBaseUrl: string): Candidate[] {
  return build(rows, photoBaseUrl);
}

export function toMembers(rows: MemberRow[], photoBaseUrl: string): Candidate[] {
  return build(rows, photoBaseUrl, (r) => [
    [r.governorate, r.center, r.district].filter(Boolean).join(" - "),
  ]);
}

export function topCandidates(candidates: Candidate[]): Candidate[] {
  const max = candidates[0]?.votes ?? 0;
  return max > 0 ? candidates.filter((c) => c.votes === max) : [];
}
