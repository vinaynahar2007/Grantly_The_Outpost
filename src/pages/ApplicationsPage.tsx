import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  Check,
  Columns3,
  FlaskConical,
  FolderKanban,
  List,
  Plus,
  Search,
  SearchX,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useCurrentDate } from "@/hooks/useCurrentDate";
import { useStudentData } from "@/context/StudentDataContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { ApplicationOverview } from "@/components/applications/ApplicationOverview";
import { ApplicationList } from "@/components/applications/ApplicationList";
import { ApplicationBoard } from "@/components/applications/ApplicationBoard";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { AddApplicationDialog } from "@/components/applications/AddApplicationDialog";
import { DeadlineWatch } from "@/components/applications/DeadlineWatch";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_ORDER,
} from "@/data/applicationStatuses";
import {
  applicationStatistics,
  DEFAULT_APPLICATION_FILTERS,
  joinApplications,
  queryApplications,
} from "@/utils/applicationLogic";
import { storageService } from "@/services/storageService";
import { cn } from "@/utils/cn";
import type {
  ApplicationFilters,
  ApplicationSort,
  ApplicationStatus,
} from "@/types";

export function ApplicationsPage() {
  useDocumentTitle("Applications");
  const now = useCurrentDate();
  const { applications, scholarships, updateApplication, deleteApplication } =
    useStudentData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ApplicationFilters>(
    DEFAULT_APPLICATION_FILTERS,
  );
  const [view, setView] = useState<"list" | "board">(() =>
    storageService.get<unknown>("application_view", "list") === "board"
      ? "board"
      : "list",
  );
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const records = useMemo(
    () => joinApplications(applications, scholarships),
    [applications, scholarships],
  );
  const stats = useMemo(
    () => applicationStatistics(records, now),
    [records, now],
  );
  const visible = useMemo(
    () => queryApplications(records, filters, now),
    [records, filters, now],
  );
  const selectedId = searchParams.get("application");
  const selected = records.find(
    ({ application }) => application.id === selectedId,
  );
  const deleteRecord = records.find(
    ({ application }) => application.id === deleting,
  );
  const archived = visible.filter(
    ({ application }) =>
      application.status === "rejected" || application.status === "withdrawn",
  );
  const hasFilters =
    filters.query !== "" ||
    filters.status !== "all" ||
    filters.deadline !== "all";
  const setStatusFilter = (status: ApplicationFilters["status"]) =>
    setFilters((prev) => ({ ...prev, status, deadline: "all" }));
  const open = (id: string, edit = false) => {
    setEditing(edit);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("application", id);
      return next;
    });
  };
  const close = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("application");
        return next;
      },
      { replace: true },
    );
  const changeStatus = (id: string, status: ApplicationStatus) => {
    updateApplication(id, { status });
  };
  const changeView = (next: "list" | "board") => {
    setView(next);
    storageService.set("application_view", next);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-violet-700 uppercase">
          <FolderKanban size={13} strokeWidth={1.8} aria-hidden="true" />
          Your scholarship workspace
        </p>
        <PageHeader
          title="Applications"
          description="Big ambitions. Small steps. Keep every opportunity moving forward."
          actions={
            <div className="flex items-center gap-3">
              <Link
                to="/explore"
                className="hidden items-center gap-1.5 text-xs font-medium text-navy-600 transition-colors hover:text-violet-700 sm:inline-flex"
              >
                Explore scholarships{" "}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <Button
                onClick={() => setAdding(true)}
                leftIcon={<Plus size={16} aria-hidden="true" />}
              >
                Add application
              </Button>
            </div>
          }
        />
      </div>

      <ApplicationOverview
        records={records}
        now={now}
        onFilter={setStatusFilter}
      />

      <div
        className={cn(
          "grid items-start gap-6",
          view === "list" && "xl:grid-cols-[minmax(0,1fr)_240px]",
        )}
      >
        <Card
          className="min-w-0 overflow-hidden shadow-none"
          aria-labelledby="application-collection-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border-subtle px-5 pt-4">
            <div
              className="flex gap-5"
              role="group"
              aria-label="Application collection"
            >
              {[
                {
                  label: "All applications",
                  value: "all" as const,
                  count: stats.total,
                },
                {
                  label: "Active",
                  value: "active" as const,
                  count: stats.active,
                },
                {
                  label: "Completed",
                  value: "completed" as const,
                  count: stats.awarded + stats.rejected + stats.withdrawn,
                },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  aria-pressed={filters.status === tab.value}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 pb-4 text-xs font-semibold transition-colors",
                    filters.status === tab.value
                      ? "text-violet-700 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-violet-600"
                      : "text-navy-500 hover:text-navy-800",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] tabular-nums",
                      filters.status === tab.value
                        ? "bg-violet-50 text-violet-700"
                        : "bg-canvas text-navy-500",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div
              className="mb-3 inline-flex rounded-lg border border-border bg-canvas p-0.5"
              role="group"
              aria-label="Application display mode"
            >
              {[
                { mode: "list" as const, icon: List, label: "List view" },
                {
                  mode: "board" as const,
                  icon: Columns3,
                  label: "Kanban view",
                },
              ].map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => changeView(item.mode)}
                  aria-label={item.label}
                  aria-pressed={view === item.mode}
                  title={item.label}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-[10px] font-medium",
                    view === item.mode
                      ? "bg-white text-navy-800 shadow-xs"
                      : "text-navy-500 hover:text-navy-800",
                  )}
                >
                  <item.icon size={13} aria-hidden="true" />
                  {item.mode === "list" ? "List" : "Board"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-4 sm:px-5">
            <h2 id="application-collection-heading" className="sr-only">
              Your application tracker
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <div className="relative min-w-0 flex-1 sm:min-w-40">
                <label htmlFor="application-search" className="sr-only">
                  Search applications by scholarship or provider
                </label>
                <Search
                  className="pointer-events-none absolute top-3 left-3 size-3.5 text-navy-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  id="application-search"
                  value={filters.query}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      query: event.target.value,
                    }))
                  }
                  placeholder="Search applications..."
                  className="h-9.5 w-full rounded-lg border border-border bg-white pr-8 pl-9 text-xs text-navy-800 placeholder:text-navy-500 focus:border-violet-400 focus:outline-none"
                />
                {filters.query && (
                  <button
                    type="button"
                    aria-label="Clear application search"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, query: "" }))
                    }
                    className="absolute top-2 right-2 flex size-5 items-center justify-center rounded text-navy-500 hover:text-navy-900"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <label className="relative flex-1 sm:flex-none">
                  <span className="sr-only">Filter application status</span>
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: event.target
                          .value as ApplicationFilters["status"],
                      }))
                    }
                    className="h-9.5 w-full rounded-lg border border-border bg-white pr-5 pl-3 text-[11px] font-medium text-navy-600"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active applications</option>
                    <option value="in-progress">In progress</option>
                    <option value="completed">Completed applications</option>
                    {APPLICATION_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {APPLICATION_STATUSES[status].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 sm:flex-none">
                  <span className="sr-only">Filter application deadline</span>
                  <select
                    value={filters.deadline}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        deadline: event.target
                          .value as ApplicationFilters["deadline"],
                      }))
                    }
                    className="h-9.5 w-full rounded-lg border border-border bg-white pr-5 pl-3 text-[11px] font-medium text-navy-600"
                  >
                    <option value="all">All deadlines</option>
                    <option value="7">Due in 7 days</option>
                    <option value="30">Due in 30 days</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className="inline-flex items-center gap-1.5 text-[10px] text-navy-500"
                aria-live="polite"
              >
                <SlidersHorizontal size={11} aria-hidden="true" />
                {visible.length}{" "}
                {visible.length === 1 ? "application" : "applications"}
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_APPLICATION_FILTERS)}
                    className="ml-1 font-semibold text-violet-700 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </p>
              <label className="flex items-center gap-1.5 text-[10px] text-navy-500">
                <span>Sort by</span>
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      sort: event.target.value as ApplicationSort,
                    }))
                  }
                  className="max-w-40 cursor-pointer border-0 bg-transparent pr-0 text-[10px] font-semibold text-navy-700"
                >
                  <option value="updated">Recently updated</option>
                  <option value="deadline">Nearest deadline</option>
                  <option value="amount">Highest award</option>
                </select>
              </label>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="p-5 pt-1">
              <DashboardEmptyState
                icon={applications.length === 0 ? FolderKanban : SearchX}
                title={
                  applications.length === 0
                    ? "Your next chapter starts here"
                    : "No applications match your filters"
                }
                description={
                  applications.length === 0
                    ? "Turn a saved scholarship into your first application. We will keep the next steps, deadlines and little details together."
                    : "Try another search, status or deadline to find what you are looking for."
                }
                action={
                  <Button
                    onClick={() =>
                      applications.length === 0
                        ? setAdding(true)
                        : setFilters(DEFAULT_APPLICATION_FILTERS)
                    }
                    size="sm"
                  >
                    {applications.length === 0
                      ? "Add your first application"
                      : "Clear filters"}
                  </Button>
                }
              />
            </div>
          ) : view === "list" ? (
            <ApplicationList
              records={visible}
              now={now}
              onOpen={open}
              onStatus={changeStatus}
              onDelete={setDeleting}
            />
          ) : (
            <>
              <ApplicationBoard
                records={visible}
                now={now}
                onOpen={open}
                onStatus={changeStatus}
                onAdd={() => setAdding(true)}
              />
              {archived.length > 0 && (
                <section className="mx-5 mb-5 overflow-hidden rounded-xl border border-border">
                  <h3 className="flex items-center gap-2 border-b border-border-subtle bg-canvas p-4 text-xs font-semibold text-navy-700">
                    <Archive size={14} aria-hidden="true" />
                    Rejected &amp; withdrawn ({archived.length})
                  </h3>
                  <ApplicationList
                    records={archived}
                    now={now}
                    onOpen={open}
                    onStatus={changeStatus}
                    onDelete={setDeleting}
                  />
                </section>
              )}
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle bg-canvas/40 px-5 py-3 text-[10px] text-navy-500">
            <span>
              Showing {visible.length} of {stats.total} applications
            </span>
            <span className="inline-flex items-center gap-1">
              <Check
                size={11}
                className="text-emerald-600"
                aria-hidden="true"
              />
              Kept in this browser
            </span>
          </div>
        </Card>

        {view === "list" && (
          <DeadlineWatch
            records={records}
            now={now}
            onOpen={open}
            onOverdue={() =>
              setFilters({
                ...DEFAULT_APPLICATION_FILTERS,
                deadline: "overdue",
              })
            }
          />
        )}
      </div>

      {(stats.rejected > 0 || stats.withdrawn > 0) && (
        <p className="text-xs text-navy-500">
          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className="hover:text-rose-700"
          >
            {stats.rejected} rejected
          </button>
          <span className="mx-2 text-navy-500">/</span>
          <button
            type="button"
            onClick={() => setStatusFilter("withdrawn")}
            className="hover:text-violet-700"
          >
            {stats.withdrawn} withdrawn
          </button>
          <span className="ml-2 text-navy-500">
            Kept for your records, never counted as active.
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-navy-500">
        <p className="inline-flex items-center gap-1.5">
          <FlaskConical size={12} aria-hidden="true" />
          Demonstration workspace. Sample awards and deadlines, not verified
          opportunities.
        </p>
        <p>Your future deserves funding.</p>
      </div>

      {adding && <AddApplicationDialog onClose={() => setAdding(false)} />}
      {selected && (
        <ApplicationDetail
          key={selected.application.id}
          record={selected}
          now={now}
          onClose={close}
          edit={editing}
        />
      )}
      {selectedId && !selected && (
        <Dialog open title="Application not found" onClose={close}>
          <div className="p-7">
            <p className="text-sm text-navy-600">
              This application may have been deleted. Your other records are
              unchanged.
            </p>
            <Button className="mt-5" onClick={close}>
              Back to applications
            </Button>
          </div>
        </Dialog>
      )}
      {deleteRecord && (
        <Dialog
          open
          title="Delete application?"
          description="This action cannot be undone."
          onClose={() => setDeleting(null)}
        >
          <div className="p-5 sm:p-7">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2 size={20} aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed text-navy-600">
              Permanently delete{" "}
              <strong className="font-semibold text-navy-900">
                {deleteRecord.scholarship.title}
              </strong>{" "}
              and its notes and history? The scholarship and your bookmarks will
              stay.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Keep application
              </Button>
              <button
                type="button"
                onClick={() => {
                  deleteApplication(deleteRecord.application.id);
                  setDeleting(null);
                }}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
              >
                Delete application
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
