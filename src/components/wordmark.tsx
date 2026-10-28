import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-flex items-baseline font-extrabold tracking-tight",
        className,
      )}
    >
      Yoofoon
      <span className="ms-0.5 inline-block size-[0.22em] rounded-full bg-sun" />
    </span>
  );
}
