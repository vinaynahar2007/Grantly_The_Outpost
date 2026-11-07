import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export type BadgeVariant = "neutral" | "violet" | "emerald" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-[#F1F4F9] text-[#334155] border-[#E2E8F0]",
  violet: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
  emerald: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]",
  outline: "bg-white text-[#475569] border-[#E2E8F0]",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-[#64748B]",
  violet: "bg-[#7C3AED]",
  emerald: "bg-[#059669]",
  outline: "bg-[#94A3B8]",
};

export function Badge({
  className,
  variant = "neutral",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-[-0.005em]",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClasses[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
