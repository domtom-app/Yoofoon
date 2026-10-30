"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Pencil, User } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminAdvertiser } from "@/lib/tips-data";

export function AdvertiserAvatar({ url, size = 48 }: { url: string | null; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="relative block shrink-0 overflow-hidden rounded-full bg-background ring-1 ring-primary/20"
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <User className="absolute inset-0 m-auto size-1/2 text-primary/40" />
      )}
    </span>
  );
}

function Row({ a }: { a: AdminAdvertiser }) {
  const title = a.label || a.phone || "بدون اسم";
  const details = [
    a.label && a.phone ? <span key="p" dir="ltr" className="tabular-nums">{a.phone}</span> : null,
    a.governorate || null,
    a.tips > 0 ? `${a.tips} إعلان` : null,
    a.suspension ? "موقوف" : null,
  ].filter(Boolean);
  return (
    <div className="relative flex items-center gap-3 rounded-2xl bg-secondary p-3">
      <Link href={a.tipId ? `/advertiser/${a.tipId}` : `/admin/advertisers/${a.id}`} aria-label={title} className="absolute inset-0 rounded-2xl" />
      <AdvertiserAvatar url={a.avatarUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex items-center gap-1 truncate text-sm font-bold">
          {title}
          <VerifiedBadge level={a.level} />
        </p>
        <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
          {details.map((d, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && "-"}
              {d}
            </span>
          ))}
        </p>
      </div>
      <Button
        render={<Link href={`/admin/advertisers/${a.id}`} />}
        nativeButton={false}
        size="sm"
        variant="outline"
        className="relative h-8 shrink-0 rounded-xl px-3 text-xs font-bold"
      >
        <Pencil className="size-3.5" />
        تعديل
      </Button>
    </div>
  );
}

export function AdvertisersTab({ advertisers, empty = "لا يوجد معلنون" }: { advertisers: AdminAdvertiser[]; empty?: string }) {
  const [q, setQ] = useState("");
  const term = q.trim();
  const list = term ? advertisers.filter((a) => `${a.label} ${a.phone}`.includes(term)) : advertisers;
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث بالاسم أو الرقم"
        aria-label="بحث"
        className="h-11 rounded-2xl"
      />
      {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>}
      {list.map((a) => (
        <Row key={a.id} a={a} />
      ))}
    </div>
  );
}
