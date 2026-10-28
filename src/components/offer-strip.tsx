"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HANDLE_PX = 36;
const PEEK_MS = 4000;
const PEEK_DELAY_MS = 2000;
const MAX_PEEKS = 3;

// طبقة العرض: تنفتح تلقائياً بعد ثانيتين من ظهورها في الشاشة (حتى 3 مرات)، وهي مخفية خلف طرف حاوي الترشيح ولا يظهر منها إلا مقبض أصفر؛ تُسحب لليسار فتنفتح فوق الزر وتعود عند الترك.
export function OfferStrip({ label }: { label: string }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const [peek, setPeek] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = panel.current?.parentElement;
    if (!host) return;
    let shown = 0;
    let delay: ReturnType<typeof setTimeout> | undefined;
    let close: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(delay);
        if (!entry.isIntersecting) {
          clearTimeout(close);
          setPeek(false);
          return;
        }
        if (shown >= MAX_PEEKS) return;
        delay = setTimeout(() => {
          shown += 1;
          setPeek(true);
          close = setTimeout(() => setPeek(false), PEEK_MS);
        }, PEEK_DELAY_MS);
      },
      { threshold: 0.6 },
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      clearTimeout(delay);
      clearTimeout(close);
    };
  }, []);
  const release = () => {
    setDragging(false);
    setDx(0);
  };

  return (
    <div
      ref={panel}
      dir="ltr"
      className={cn(
        "absolute inset-y-0 right-0 z-10 flex w-full",
        !dragging && "transition-transform duration-[900ms] ease-in-out",
      )}
      style={{ transform: `translateX(calc(${peek && !dragging ? "0px" : `100% - ${HANDLE_PX}px`} + ${dx}px))` }}
    >
      <span
        role="presentation"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          startX.current = e.clientX;
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          const max = (panel.current?.offsetWidth ?? 0) - HANDLE_PX;
          setDx(Math.max(-max, Math.min(0, e.clientX - startX.current)));
        }}
        onPointerUp={release}
        onPointerCancel={release}
        className="w-9 shrink-0 cursor-grab touch-none bg-gradient-to-l from-amber-300 to-amber-200 shadow-md"
      />
      <div dir="rtl" className="flex flex-1 items-center justify-center whitespace-nowrap pr-9 bg-[#eef0d6] text-[13px] font-bold text-[#6b7a1f]">
        {label}
      </div>
    </div>
  );
}
