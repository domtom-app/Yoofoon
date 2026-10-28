"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label="عودة"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="size-11 rounded-full"
    >
      <ArrowLeft className="size-6" />
    </Button>
  );
}
