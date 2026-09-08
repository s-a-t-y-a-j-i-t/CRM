import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("h-9 w-full rounded-md border border-input bg-background px-3 text-sm", className)}
      {...props}
    >
      {children}
    </select>
  );
}
