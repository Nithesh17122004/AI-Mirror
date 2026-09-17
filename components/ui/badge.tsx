import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brass-500/30 bg-brass-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-700",
        className
      )}
      {...props}
    />
  );
}
