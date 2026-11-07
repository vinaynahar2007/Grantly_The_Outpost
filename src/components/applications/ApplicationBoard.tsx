import { Plus, ArrowUpRight } from "lucide-react";
import {
  APPLICATION_STATUSES,
  KANBAN_STATUSES,
} from "@/data/applicationStatuses";
import type { ApplicationStatus, TrackedApplication } from "@/types";
import { ApplicationDeadline } from "./ApplicationDeadline";
import { StatusSelect } from "./ApplicationStatus";
import { formatINR } from "@/utils/dashboardLogic";

interface Props {
  records: TrackedApplication[];
  now: Date;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: ApplicationStatus) => void;
  onAdd: () => void;
}

export function ApplicationBoard({
  records,
  now,
  onOpen,
  onStatus,
  onAdd,
}: Props) {
  return (
    <div
      className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3"
      aria-label="Application Kanban board"
    >
      {KANBAN_STATUSES.map((status) => {
        const config = APPLICATION_STATUSES[status];
        const items = records.filter(
          ({ application }) => application.status === status,
        );
        return (
          <section
            key={status}
            className="min-w-0 rounded-xl bg-canvas p-3"
            aria-label={`${config.label} column`}
          >
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
              <span
                className="size-2 rounded-full"
                style={{ background: config.color }}
                aria-hidden="true"
              />
              <h3 className="text-xs font-semibold text-navy-800">
                {config.label}
              </h3>
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-navy-500 tabular-nums">
                {items.length}
              </span>
              <button
                type="button"
                onClick={onAdd}
                aria-label={`Add application from ${config.label} column`}
                className="ml-auto flex size-7 items-center justify-center rounded-md text-navy-500 hover:bg-white hover:text-violet-700"
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
            <ul className="space-y-3">
              {items.map((record) => (
                <li
                  key={record.application.id}
                  className="rounded-xl border border-border bg-white p-4 shadow-xs"
                >
                  <p className="text-[10px] font-medium text-navy-500">
                    {record.scholarship.category}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpen(record.application.id)}
                    className="mt-1.5 text-left text-[13px] font-semibold leading-relaxed text-navy-900 hover:text-violet-700"
                  >
                    {record.scholarship.title}
                  </button>
                  <p className="mt-1 line-clamp-1 text-[10px] text-navy-500">
                    {record.scholarship.provider}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-navy-800">
                      {formatINR(record.scholarship.amount)}
                    </span>
                    <ApplicationDeadline record={record} now={now} compact />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                    <StatusSelect
                      status={status}
                      label={`Status for ${record.scholarship.title}`}
                      onChange={(next) => onStatus(record.application.id, next)}
                    />
                    <button
                      type="button"
                      onClick={() => onOpen(record.application.id)}
                      aria-label={`View application ${record.scholarship.title}`}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-navy-500 hover:bg-violet-50 hover:text-violet-700"
                    >
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {items.length === 0 && (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border px-3 text-center">
                <config.icon
                  className="mb-2 size-5 text-navy-500"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <p className="text-[11px] text-navy-500">
                  No applications here yet.
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
