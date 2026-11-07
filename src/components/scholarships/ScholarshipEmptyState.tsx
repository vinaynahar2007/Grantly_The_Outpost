import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";

export interface ScholarshipEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function ScholarshipEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: ScholarshipEmptyStateProps) {
  return (
    <Card className="border-dashed border-[#CBD5E1] bg-white/80">
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold text-[#0F172A]">{title}</h2>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#64748B]">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </Card>
  );
}
