import Image from "next/image";
import { Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Advertiser } from "@/lib/tips-data";

export function AdvertiserHeader({ advertiser }: { advertiser: Advertiser }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border bg-card p-3">
      <span className="relative block size-20 overflow-hidden rounded-full bg-secondary ring-2 ring-primary/20">
        {advertiser.avatarUrl ? (
          <Image src={advertiser.avatarUrl} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <User className="absolute inset-0 m-auto size-8 text-primary/40" />
        )}
      </span>
      {advertiser.place && (
        <p className="text-center text-sm font-bold leading-[1.5] text-muted-foreground">{advertiser.place}</p>
      )}
      {advertiser.phone && (
        <Button
          render={<a href={`tel:${advertiser.phone}`} />}
          nativeButton={false}
          className="h-11 w-full rounded-2xl text-base font-bold"
        >
          <Phone className="size-5" />
          <span dir="ltr" className="tabular-nums">{advertiser.phone}</span>
        </Button>
      )}
    </div>
  );
}
