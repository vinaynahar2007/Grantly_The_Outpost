import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface DashboardEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8F9FC]/70 px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3.5 font-display text-base font-semibold text-[#0F172A]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748B]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
