import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// قائمة المتصفح الأصلية: تظهر على الهواتف كمنتقي النظام، والسهم هنا بمسافة ثابتة من الحافة.
export function NativeSelect({
  className,
  iconClassName,
  children,
  ...props
}: ComponentProps<"select"> & { iconClassName?: string }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "h-12 w-full appearance-none rounded-xl border border-input bg-transparent ps-4 pe-12 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground",
          iconClassName,
        )}
      />
    </div>
  );
}
