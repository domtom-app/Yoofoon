"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/wordmark";

export function Splash() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/");
    const t = setTimeout(() => router.replace("/"), 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary text-white">
      <Wordmark className="text-6xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-700 md:text-8xl" />
    </main>
  );
}
