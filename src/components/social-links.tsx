import type { ComponentType } from "react";
import { Globe, Store } from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { SOCIAL_KEYS, SOCIAL_LABELS, type SocialKey, type SocialLinks } from "@/lib/social";

export const SOCIAL_ICONS: Record<SocialKey, ComponentType<{ className?: string }>> = {
  youtube: FaYoutube,
  facebook: FaFacebook,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  store: Store,
  website: Globe,
};

const COLORS: Record<SocialKey, string> = {
  youtube: "text-[#FF0000]",
  facebook: "text-[#1877F2]",
  instagram: "text-[#E4405F]",
  tiktok: "text-foreground",
  store: "text-primary",
  website: "text-primary",
};

export function SocialLinksRow({ links }: { links: SocialLinks }) {
  const items = SOCIAL_KEYS.filter((k) => links[k]);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {items.map((k) => {
        const Icon = SOCIAL_ICONS[k];
        return (
          <a
            key={k}
            href={links[k]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={SOCIAL_LABELS[k]}
            className="flex size-10 items-center justify-center rounded-full bg-secondary"
          >
            <Icon className={`size-5 ${COLORS[k]}`} />
          </a>
        );
      })}
    </div>
  );
}
