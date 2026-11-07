import { Clock3, Check, CircleAlert } from "lucide-react";
import type { TrackedApplication } from "@/types";
import { applicationDeadline } from "@/utils/applicationLogic";
import { formatDisplayDate } from "@/utils/dashboardLogic";
import { cn } from "@/utils/cn";

export function ApplicationDeadline({
  record,
  now,
  compact = false,
}: {
  record: TrackedApplication;
  now: Date;
  compact?: boolean;
}) {
  const info = applicationDeadline(record, now);
  const Icon =
    info.tone === "urgent"
      ? CircleAlert
      : info.tone === "success"
        ? Check
        : Clock3;
  return (
    <div className={compact ? "" : "space-y-1"}>
      {!compact && (
        <time
          dateTime={record.scholarship.deadline}
          className="block whitespace-nowrap text-xs font-medium text-navy-700"
        >
          {formatDisplayDate(record.scholarship.deadline)}
        </time>
      )}
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium",
          info.tone === "urgent"
            ? "text-rose-700"
            : info.tone === "attention"
              ? "text-amber-700"
              : info.tone === "success"
                ? "text-emerald-700"
                : "text-navy-500",
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
        {info.label}
      </span>
    </div>
  );
}
