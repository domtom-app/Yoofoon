export const SOCIAL_KEYS = ["youtube", "facebook", "instagram", "tiktok", "store", "website"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type SocialLinks = Partial<Record<SocialKey, string>>;

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  youtube: "يوتيوب",
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  tiktok: "تيك توك",
  store: "المتجر",
  website: "الموقع",
};

export function cleanLinks(input: unknown): SocialLinks {
  const out: SocialLinks = {};
  if (!input || typeof input !== "object") return out;
  for (const key of SOCIAL_KEYS) {
    const raw = (input as Record<string, unknown>)[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    out[key] = raw.trim();
  }
  return out;
}

export function toUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > 200) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
