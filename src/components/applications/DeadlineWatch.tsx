import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui";
import type { TrackedApplication } from "@/types";
import { applicationDeadline } from "@/utils/applicationLogic";
import { formatDisplayDate } from "@/utils/dashboardLogic";
import { cn } from "@/utils/cn";

export function DeadlineWatch({
  records,
  now,
  onOpen,
  onOverdue,
}: {
  records: TrackedApplication[];
  now: Date;
  onOpen: (id: string) => void;
  onOverdue: () => void;
}) {
  const actionable = records
    .filter((record) => applicationDeadline(record, now).needsAction)
    .sort(
      (a, b) =>
        Date.parse(a.scholarship.deadline) - Date.parse(b.scholarship.deadline),
    );
  const overdue = actionable.filter(
    (record) => applicationDeadline(record, now).overdue,
  ).length;
  const recent = records
    .flatMap(({ application, scholarship }) =>
      application.history.map((event) => ({ event, application, scholarship })),
    )
    .sort(
      (a, b) => Date.parse(b.event.timestamp) - Date.parse(a.event.timestamp),
    )
    .slice(0, 3);
  return (
    <aside className="space-y-5" aria-label="Application reminders">
      <Card className="overflow-hidden shadow-none">
        <div className="border-b border-border-subtle p-5">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="size-4 text-violet-600"
              aria-hidden="true"
            />
            <h2 className="font-display text-sm font-semibold text-navy-900">
              Deadline watch
            </h2>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-navy-500">
            A little nudge for what comes next.
          </p>
        </div>
        <div className="space-y-4 p-5">
          {actionable.slice(0, 3).map((record) => {
            const info = applicationDeadline(record, now);
            return (
              <button
                key={record.application.id}
                type="button"
                onClick={() => onOpen(record.application.id)}
                className="group flex w-full items-start gap-3 text-left"
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border",
                    info.tone === "urgent"
                      ? "border-rose-100 bg-rose-50 text-rose-700"
                      : "border-violet-100 bg-violet-50 text-violet-700",
                  )}
                >
                  <span className="text-[9px] font-semibold uppercase">
                    {new Date(record.scholarship.deadline).toLocaleDateString(
                      "en-US",
                      { month: "short" },
                    )}
                  </span>
                  <span className="text-lg font-semibold leading-5 tabular-nums">
                    {new Date(record.scholarship.deadline).getDate()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-navy-800 transition-colors group-hover:text-violet-700">
                    {record.scholarship.title}
                  </p>
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-[10px] font-medium",
                      info.tone === "urgent"
                        ? "text-rose-700"
                        : "text-amber-700",
                    )}
                  >
                    {info.tone === "urgent" && (
                      <CircleAlert size={10} aria-hidden="true" />
                    )}
                    {info.label}
                  </p>
                </div>
                <ArrowUpRight
                  className="ml-auto mt-1 size-3.5 shrink-0 text-navy-500"
                  aria-hidden="true"
                />
              </button>
            );
          })}
          {actionable.length === 0 && (
            <div className="py-3 text-center">
              <CheckCircle2
                className="mx-auto mb-2 size-7 text-emerald-500"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-navy-800">
                You're all caught up.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-navy-500">
                No tracked applications need submission.
              </p>
            </div>
          )}
          {overdue > 0 && (
            <button
              type="button"
              onClick={onOverdue}
              className="w-full rounded-lg bg-rose-50 px-3 py-2.5 text-left text-[11px] font-medium text-rose-700"
            >
              {overdue} overdue {overdue === 1 ? "application" : "applications"}{" "}
              <ArrowRight
                size={12}
                className="ml-1 inline"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
        <div className="border-t border-border-subtle bg-canvas/50 px-5 py-3">
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-700 hover:underline"
          >
            Open your calendar <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </Card>
      <section className="px-1" aria-labelledby="tracker-recent-heading">
        <h2
          id="tracker-recent-heading"
          className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-navy-800"
        >
          <History className="size-4 text-navy-500" aria-hidden="true" />
          Recent changes
        </h2>
        {recent.length === 0 ? (
          <p className="border-l-2 border-violet-200 py-1 pl-3 text-[11px] leading-relaxed text-navy-500">
            A fresh page for your progress. Your next update will appear here.
          </p>
        ) : (
          <ol className="ml-1.5 border-l border-border">
            {recent.map(({ event, application, scholarship }) => (
              <li key={event.id} className="relative pb-5 pl-4 last:pb-0">
                <span className="absolute top-1 -left-[3px] size-[5px] rounded-full bg-violet-400" />
                <button
                  type="button"
                  onClick={() => onOpen(application.id)}
                  className="text-left text-[11px] font-medium leading-relaxed text-navy-700 hover:text-violet-700"
                >
                  {event.description}
                </button>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-navy-500">
                  {scholarship.title}
                </p>
                <time
                  dateTime={event.timestamp}
                  className="mt-1 block text-[10px] text-navy-500"
                >
                  {formatDisplayDate(event.timestamp)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
