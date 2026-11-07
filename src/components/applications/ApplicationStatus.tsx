import { ChevronDown } from "lucide-react";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_ORDER,
} from "@/data/applicationStatuses";
import type { ApplicationStatus } from "@/types";
import { cn } from "@/utils/cn";

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const config = APPLICATION_STATUSES[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

export function StatusSelect({
  status,
  label,
  onChange,
  id,
  className,
}: {
  status: ApplicationStatus;
  label: string;
  onChange: (status: ApplicationStatus) => void;
  id?: string;
  className?: string;
}) {
  const config = APPLICATION_STATUSES[status];
  const Icon = config.icon;
  return (
    <div
      className={cn("relative inline-flex max-w-full items-center", className)}
    >
      <Icon
        className="pointer-events-none absolute left-2.5 size-3.5"
        style={{ color: config.color }}
        aria-hidden="true"
      />
      <select
        id={id}
        value={status}
        onChange={(event) => onChange(event.target.value as ApplicationStatus)}
        aria-label={label}
        className={cn(
          "h-11 w-full min-w-[137px] cursor-pointer appearance-none rounded-lg border py-1 pr-7 pl-8 text-xs font-medium transition-shadow hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 md:h-9",
          config.className,
        )}
      >
        {APPLICATION_STATUS_ORDER.map((key) => (
          <option key={key} value={key} className="bg-white text-navy-900">
            {APPLICATION_STATUSES[key].label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 size-3 text-navy-500"
        aria-hidden="true"
      />
    </div>
  );
}
