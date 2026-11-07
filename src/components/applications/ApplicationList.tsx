import { ArrowUpRight, PencilLine, Trash2 } from "lucide-react";
import type { ApplicationStatus, TrackedApplication } from "@/types";
import { StatusSelect } from "./ApplicationStatus";
import { ApplicationDeadline } from "./ApplicationDeadline";
import { formatDisplayDate, formatINR } from "@/utils/dashboardLogic";

interface Props {
  records: TrackedApplication[];
  now: Date;
  onOpen: (id: string, edit?: boolean) => void;
  onStatus: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}

export function ScholarshipMonogram({
  title,
  index = 0,
}: {
  title: string;
  index?: number;
}) {
  const styles = [
    "bg-violet-50 text-violet-800 border-violet-100",
    "bg-blue-50 text-blue-700 border-blue-100",
    "bg-emerald-50 text-emerald-700 border-emerald-100",
    "bg-amber-50 text-amber-700 border-amber-100",
  ];
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold ${styles[index % styles.length]}`}
      aria-hidden="true"
    >
      {title.charAt(0)}
    </span>
  );
}

export function ApplicationList({
  records,
  now,
  onOpen,
  onStatus,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-b-2xl">
      <table className="block w-full border-collapse text-left md:table">
        <caption className="sr-only">
          Tracked scholarship applications. Change a status directly or open a
          record to edit notes, dates and documents.
        </caption>
        <thead className="hidden bg-canvas md:table-header-group">
          <tr className="border-y border-border-subtle text-[10px] tracking-[0.06em] text-navy-500 uppercase">
            <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
              Scholarship
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Deadline
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Award
            </th>
            <th scope="col" className="py-3 pr-4 pl-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {records.map((record, index) => {
            const { application: app, scholarship } = record;
            return (
              <tr
                key={app.id}
                className="group relative grid grid-cols-2 gap-4 border-b border-border-subtle p-5 transition-colors last:border-0 hover:bg-violet-50/25 md:table-row md:p-0"
              >
                <th
                  scope="row"
                  className="col-span-2 text-left font-normal md:max-w-[270px] md:py-5 md:pr-3 md:pl-5"
                >
                  <div className="flex items-start gap-3">
                    <ScholarshipMonogram
                      title={scholarship.title}
                      index={index}
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpen(app.id)}
                        className="text-left text-sm font-semibold leading-[1.55] text-navy-900 hover:text-violet-700 md:text-[13px]"
                      >
                        {scholarship.title}
                      </button>
                      <p className="mt-1 text-xs leading-relaxed text-navy-500 md:text-[10px]">
                        {scholarship.provider}
                      </p>
                      <p className="mt-1.5 text-[10px] text-navy-500">
                        Updated{" "}
                        <time dateTime={app.updatedAt}>
                          {formatDisplayDate(app.updatedAt)}
                        </time>
                      </p>
                    </div>
                  </div>
                </th>
                <td className="md:px-3 md:py-5">
                  <span className="mb-1 block text-[10px] font-medium text-navy-500 md:hidden">
                    Status
                  </span>
                  <StatusSelect
                    status={app.status}
                    label={`Status for ${scholarship.title}`}
                    onChange={(status) => onStatus(app.id, status)}
                  />
                </td>
                <td className="md:px-3 md:py-5">
                  <span className="mb-1 block text-[10px] font-medium text-navy-500 md:hidden">
                    Deadline
                  </span>
                  <ApplicationDeadline record={record} now={now} />
                </td>
                <td className="self-center md:px-3 md:py-5 md:text-right">
                  <span className="mb-1 block text-[10px] font-medium text-navy-500 md:hidden">
                    Potential award
                  </span>
                  <span className="whitespace-nowrap text-xs font-semibold text-navy-800 tabular-nums">
                    {formatINR(scholarship.amount)}
                  </span>
                </td>
                <td className="self-center text-right md:py-5 md:pr-4 md:pl-2">
                  <div className="inline-flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Edit ${scholarship.title}`}
                      title="Edit application"
                      onClick={() => onOpen(app.id, true)}
                      className="flex size-8 items-center justify-center rounded-lg text-navy-500 hover:bg-violet-50 hover:text-violet-700"
                    >
                      <PencilLine size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${scholarship.title}`}
                      title="Delete application"
                      onClick={() => onDelete(app.id)}
                      className="flex size-8 items-center justify-center rounded-lg text-navy-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`View application ${scholarship.title}`}
                      title="View application"
                      onClick={() => onOpen(app.id)}
                      className="flex size-8 items-center justify-center rounded-lg text-navy-500 hover:bg-violet-50 hover:text-violet-700"
                    >
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
