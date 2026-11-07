import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/utils/cn";

export type StatAccent = "violet" | "emerald" | "navy" | "amber";

export interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accent?: StatAccent;
  indicatorText?: string;
  footnote?: string;
}

const iconContainerStyles: Record<StatAccent, string> = {
  violet: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
  emerald: "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]",
  navy: "border-[#E2E8F0] bg-[#F1F4F9] text-[#0F172A]",
  amber: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
};

const pillStyles: Record<StatAccent, string> = {
  violet: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
  emerald: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]",
  navy: "bg-[#F1F4F9] text-[#334155] border-[#E2E8F0]",
  amber: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "violet",
  indicatorText,
  footnote,
}: StatCardProps) {
  return (
    <Card
      interactive
      className="flex flex-col justify-between p-5 sm:p-6"
      aria-label={`${title}: ${value}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              iconContainerStyles[accent]
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>

          {indicatorText && (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                pillStyles[accent]
              )}
            >
              {indicatorText}
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold tracking-[0.02em] text-[#64748B] uppercase">
            {title}
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold tracking-[-0.025em] text-[#0F172A] tabular-nums sm:text-[26px]">
            {value}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#EEF2F6]">
        <p className="text-xs leading-relaxed text-[#475569]">{description}</p>
        {footnote && (
          <p className="mt-1 text-[11px] font-medium text-[#64748B]">{footnote}</p>
        )}
      </div>
    </Card>
  );
}
