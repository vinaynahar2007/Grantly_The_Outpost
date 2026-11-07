import { Files, PencilLine, Send, Trophy, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui";
import { applicationStatistics } from "@/utils/applicationLogic";
import type { ApplicationFilters, TrackedApplication } from "@/types";
import { cn } from "@/utils/cn";

export function ApplicationOverview({
  records,
  now,
  onFilter,
}: {
  records: TrackedApplication[];
  now: Date;
  onFilter: (status: ApplicationFilters["status"]) => void;
}) {
  const stats = applicationStatistics(records, now);
  const items = [
    {
      label: "Total Applications",
      value: stats.total,
      hint: "Your scholarship journey",
      icon: Files,
      style: "bg-violet-50 text-violet-700",
      filter: "all" as const,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      hint: "From preparing to shortlisted",
      icon: PencilLine,
      style: "bg-amber-50 text-amber-700",
      filter: "in-progress" as const,
    },
    {
      label: "Submitted",
      value: stats.submitted,
      hint: "Sent. A step closer.",
      icon: Send,
      style: "bg-blue-50 text-blue-700",
      filter: "submitted" as const,
    },
    {
      label: "Awarded",
      value: stats.awarded,
      hint: "Hard work, recognised",
      icon: Trophy,
      style: "bg-emerald-50 text-emerald-700",
      filter: "awarded" as const,
    },
  ];
  return (
    <section
      aria-label="Application statistics"
      className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
    >
      {items.map((item) => (
        <Card key={item.label} className="overflow-hidden shadow-none">
          <button
            type="button"
            onClick={() => onFilter(item.filter)}
            className="group w-full p-4 text-left transition-colors hover:bg-canvas sm:p-5"
            aria-label={`${item.label}: ${item.value}. Filter applications`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-navy-500">
                {item.label}
              </span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  item.style,
                )}
              >
                <item.icon size={16} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="font-display text-[32px] font-semibold leading-none tracking-tight text-navy-900 tabular-nums">
                {String(item.value).padStart(2, "0")}
              </span>
              <ArrowUpRight
                className="size-4 text-navy-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 text-[11px] text-navy-500">{item.hint}</p>
          </button>
        </Card>
      ))}
    </section>
  );
}
