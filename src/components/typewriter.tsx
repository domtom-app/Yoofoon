"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 45;
const MAX_TICKS = 450;

// The full text is laid out invisibly first, so the box keeps its final height while the letters appear.
export function Typewriter({ text, maxLines }: { text: string; maxLines?: number }) {
  const chars = Array.from(text);
  const total = chars.length;
  const ref = useRef<HTMLParagraphElement>(null);
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Long texts type faster per tick so they never take more than about 20 seconds.
    const step = reduced ? total : Math.max(1, Math.ceil(total / MAX_TICKS));
    const timer = setInterval(() => {
      setCount((c) => {
        const next = Math.min(c + step, total);
        if (next >= total) clearInterval(timer);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [started, total]);

  const done = count >= total;

  return (
    <p ref={ref} className="relative whitespace-pre-line break-words">
      <span
        aria-hidden
        className="invisible block overflow-hidden"
        style={maxLines ? { display: "-webkit-box", WebkitLineClamp: maxLines, WebkitBoxOrient: "vertical" } : undefined}
      >
        {text}
      </span>
      <span aria-hidden className="absolute inset-0 overflow-hidden">
        {chars.slice(0, count).join("")}
        {!done && started && <span className="ms-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] animate-pulse bg-primary" />}
      </span>
      <span className="sr-only">{text}</span>
    </p>
  );
}
