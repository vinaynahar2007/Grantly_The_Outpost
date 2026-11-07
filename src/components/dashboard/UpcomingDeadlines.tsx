import { Link } from "react-router-dom";
import { CalendarDays, Clock, ArrowUpRight } from "lucide-react";
import type { DeadlineUrgency, UpcomingDeadlineItem } from "@/types";
import { Card, Button } from "@/components/ui";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { cn } from "@/utils/cn";

export interface UpcomingDeadlinesProps {
  deadlines: UpcomingDeadlineItem[];
  maxItems?: number;
}

const urgencyPillStyles: Record<DeadlineUrgency, string> = {
  urgent: "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C]",
  attention: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  normal: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  closed: "border-[#E2E8F0] bg-[#F1F4F9] text-[#64748B]",
};

const urgencyDotStyles: Record<DeadlineUrgency, string> = {
  urgent: "bg-[#E11D48]",
  attention: "bg-[#D97706]",
  normal: "bg-[#059669]",
  closed: "bg-[#94A3B8]",
};

function formatRemainingText(remainingDays: number): string {
  if (remainingDays < 0) {
    const overdue = Math.abs(remainingDays);
    return overdue === 1 ? "Expired 1 day ago" : `Expired ${overdue} days ago`;
  }
  if (remainingDays === 0) {
    return "Due today";
  }
  if (remainingDays === 1) {
    return "1 day remaining";
  }
  return `${remainingDays} days remaining`;
}

export function UpcomingDeadlines({ deadlines, maxItems = 5 }: UpcomingDeadlinesProps) {
  const visibleDeadlines = deadlines.slice(0, maxItems);

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="upcoming-deadlines-heading">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2
            id="upcoming-deadlines-heading"
            className="font-display text-base font-semibold tracking-[-0.015em] text-[#0F172A]"
          >
            Upcoming Deadlines
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Dynamic countdowns across tracked opportunities.
          </p>
        </div>

        <Link to="/calendar">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#6D28D9] hover:bg-[#F5F3FF]"
            rightIcon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Calendar
          </Button>
        </Link>
      </div>

      {visibleDeadlines.length === 0 ? (
        <div className="mt-4">
          <DashboardEmptyState
            icon={CalendarDays}
            title="No Scheduled Deadlines"
            description="Save or start an application to monitor submission deadlines here."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5" aria-label="Scholarship deadline countdowns">
          {visibleDeadlines.map((item) => {
            const { urgency, label, formattedDate, remainingDays } = item.deadlineInfo;

            return (
              <li key={item.id}>
                <Link
                  to={`/scholarships/${item.scholarshipId}`}
                  className="group block rounded-xl border border-[#EEF2F6] bg-[#F8F9FC]/80 p-3.5 transition-all hover:border-[#CBD5E1] hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0F172A] group-hover:text-[#6D28D9]">
                        {item.scholarshipTitle}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{formattedDate}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-[#475569] tabular-nums">
                          <Clock className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                          <span>{formatRemainingText(remainingDays)}</span>
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                        urgencyPillStyles[urgency]
                      )}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", urgencyDotStyles[urgency])}
                        aria-hidden="true"
                      />
                      {label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
