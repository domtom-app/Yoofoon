"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { trackVisit } from "@/app/actions/visit";

export function VisitorCount({ initial }: { initial: number | null }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    trackVisit().then((n) => {
      if (n !== null) setCount(n);
    });
  }, []);

  if (count === null) return null;

  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      <Users className="size-6 text-primary" />
      <span dir="ltr" className="text-2xl font-extrabold tabular-nums text-primary">
        {count.toLocaleString("en-US")}
      </span>
      <span className="text-base font-bold text-muted-foreground">زائر</span>
    </div>
  );
}
