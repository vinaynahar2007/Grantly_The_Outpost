import {
  Bookmark,
  PencilLine,
  Send,
  Clock3,
  Sparkles,
  Trophy,
  CircleX,
  Archive,
  type LucideIcon,
} from "lucide-react";
import type {
  ApplicationStatus,
  DashboardApplicationStatus,
  ScholarshipApplication,
} from "@/types";

interface StatusConfig {
  label: DashboardApplicationStatus;
  color: string;
  className: string;
  icon: LucideIcon;
  terminal: boolean;
  inProgress: boolean;
  needsSubmission: boolean;
  progress: number;
}

export const APPLICATION_STATUSES: Record<ApplicationStatus, StatusConfig> = {
  saved: {
    label: "Saved",
    color: "#64748B",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Bookmark,
    terminal: false,
    inProgress: true,
    needsSubmission: true,
    progress: 10,
  },
  preparing: {
    label: "Preparing",
    color: "#7C3AED",
    className: "bg-violet-50 text-violet-700 border-violet-200",
    icon: PencilLine,
    terminal: false,
    inProgress: true,
    needsSubmission: true,
    progress: 30,
  },
  submitted: {
    label: "Submitted",
    color: "#2563EB",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Send,
    terminal: false,
    inProgress: false,
    needsSubmission: false,
    progress: 50,
  },
  "under-review": {
    label: "Under Review",
    color: "#D97706",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock3,
    terminal: false,
    inProgress: true,
    needsSubmission: false,
    progress: 70,
  },
  shortlisted: {
    label: "Shortlisted",
    color: "#0891B2",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: Sparkles,
    terminal: false,
    inProgress: true,
    needsSubmission: false,
    progress: 85,
  },
  awarded: {
    label: "Awarded",
    color: "#059669",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Trophy,
    terminal: true,
    inProgress: false,
    needsSubmission: false,
    progress: 100,
  },
  rejected: {
    label: "Rejected",
    color: "#E11D48",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: CircleX,
    terminal: true,
    inProgress: false,
    needsSubmission: false,
    progress: 100,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "#64748B",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Archive,
    terminal: true,
    inProgress: false,
    needsSubmission: false,
    progress: 100,
  },
};

export const APPLICATION_STATUS_ORDER = Object.keys(
  APPLICATION_STATUSES,
) as ApplicationStatus[];
export const KANBAN_STATUSES = APPLICATION_STATUS_ORDER.filter(
  (status) => status !== "rejected" && status !== "withdrawn",
);
export function isApplicationStatus(
  value: unknown,
): value is ApplicationStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(APPLICATION_STATUSES, value)
  );
}
export function isActiveApplication(status: ApplicationStatus): boolean {
  return !APPLICATION_STATUSES[status].terminal;
}

export function hasOnlyTerminalApplications(
  scholarshipId: string,
  applications: ScholarshipApplication[],
): boolean {
  const related = applications.filter(
    (application) => application.scholarshipId === scholarshipId,
  );
  return related.length > 0 && related.every((item) => !isActiveApplication(item.status));
}
