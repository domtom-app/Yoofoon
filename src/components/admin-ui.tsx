"use client";

import { useState, useTransition } from "react";
import type { AdminState } from "@/app/actions/admin";

export function useAction(action: (fd: FormData) => Promise<AdminState>, onOk: () => void) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fd: FormData) =>
    start(async () => {
      const res = await action(fd);
      if (res.error) setError(res.error);
      else {
        setError(null);
        onOk();
      }
    });
  return { pending, error, run, clear: () => setError(null) };
}
