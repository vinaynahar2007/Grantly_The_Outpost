import type { ReactNode } from "react";
import { Badge } from "@/components/ui";

export interface PageHeaderProps {
  title: string;
  description: string;
  badgeText?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, badgeText, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-2xl font-bold tracking-[-0.025em] text-[#0F172A] sm:text-[28px]">
            {title}
          </h1>
          {badgeText && <Badge variant="violet">{badgeText}</Badge>}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-[#64748B]">{description}</p>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  );
}
