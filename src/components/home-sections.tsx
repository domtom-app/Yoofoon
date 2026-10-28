import Image from "next/image";
import { Trophy, User } from "lucide-react";
import type { Candidate } from "@/lib/voting";

export function Winners({ winners }: { winners: Candidate[] }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div className="flex items-center justify-center gap-2 text-primary">
        <Trophy className="size-6" />
        <p className="text-lg font-extrabold leading-[1.5]">الأعلى تصويتًا</p>
      </div>
      {winners.map((w) => (
        <div key={w.id} className="flex flex-col gap-3 rounded-3xl border border-primary bg-card p-3 ring-2 ring-primary/30">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
            {w.photoUrl ? (
              <Image src={w.photoUrl} alt={w.name} fill sizes="384px" className="object-cover" />
            ) : (
              <User className="absolute inset-0 m-auto size-1/3 text-primary/40" />
            )}
          </div>
          <h2 className="truncate text-center text-lg font-bold leading-[1.5]">{w.name}</h2>
          <p dir="ltr" className="text-center text-3xl font-extrabold tabular-nums text-primary">
            {w.percent}%
          </p>
        </div>
      ))}
    </div>
  );
}
