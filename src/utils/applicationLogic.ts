import {
  APPLICATION_STATUSES,
  isActiveApplication,
  isApplicationStatus,
} from "@/data/applicationStatuses";
import type {
  ApplicationFilters,
  ApplicationHistoryEvent,
  ApplicationStatus,
  ApplicationUpdates,
  Scholarship,
  ScholarshipApplication,
  TrackedApplication,
} from "@/types";
import { evaluateDeadline } from "./dashboardLogic";

export function createApplicationId(prefix = "app"): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function localDateValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function validTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.includes("T") &&
    Number.isFinite(Date.parse(value))
  );
}

export function createApplication(
  scholarshipId: string,
  status: "saved" | "preparing" = "preparing",
  now = new Date(),
): ScholarshipApplication {
  const timestamp = now.toISOString();
  return {
    id: createApplicationId(),
    scholarshipId,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: null,
    reminderDate: null,
    notes: "",
    completedDocuments: [],
    history: [
      {
        id: createApplicationId("event"),
        type: "created",
        timestamp,
        toStatus: status,
        description: `Added to tracker as ${APPLICATION_STATUSES[status].label}.`,
      },
    ],
  };
}

export function joinApplications(
  applications: ScholarshipApplication[],
  scholarships: Scholarship[],
): TrackedApplication[] {
  const byId = new Map(
    scholarships.map((scholarship) => [scholarship.id, scholarship]),
  );
  return applications.flatMap((application) => {
    const scholarship = byId.get(application.scholarshipId);
    return scholarship ? [{ application, scholarship }] : [];
  });
}

export function findActiveApplication(
  applications: ScholarshipApplication[],
  scholarshipId: string,
  exceptId?: string,
) {
  return applications.find(
    (app) =>
      app.id !== exceptId &&
      app.scholarshipId === scholarshipId &&
      isActiveApplication(app.status),
  );
}

export function validateApplicationUpdates(
  updates: ApplicationUpdates,
  today = new Date(),
): string | null {
  if (updates.status !== undefined && !isApplicationStatus(updates.status))
    return "Choose a valid application status.";
  if (
    updates.notes !== undefined &&
    (typeof updates.notes !== "string" || updates.notes.length > 5000)
  )
    return "Notes must be 5,000 characters or fewer.";
  if (
    updates.submittedAt &&
    (!isDateOnly(updates.submittedAt) ||
      updates.submittedAt > localDateValue(today))
  )
    return "Submission date must be a valid date, no later than today.";
  if (updates.reminderDate && !isDateOnly(updates.reminderDate))
    return "Choose a valid reminder date.";
  return null;
}

export function updateApplicationRecord(
  application: ScholarshipApplication,
  updates: ApplicationUpdates,
  now = new Date(),
): ScholarshipApplication {
  const events: ApplicationHistoryEvent[] = [];
  const timestamp = now.toISOString();
  const next = { ...application };
  const append = (
    type: ApplicationHistoryEvent["type"],
    description: string,
    extra: Partial<ApplicationHistoryEvent> = {},
  ) => {
    events.push({
      id: createApplicationId("event"),
      type,
      timestamp,
      description,
      ...extra,
    });
  };
  if (updates.status && updates.status !== application.status) {
    next.status = updates.status;
    append(
      "status_changed",
      `${APPLICATION_STATUSES[application.status].label} to ${APPLICATION_STATUSES[updates.status].label}.`,
      { fromStatus: application.status, toStatus: updates.status },
    );
  }
  if (updates.notes !== undefined && updates.notes !== application.notes) {
    next.notes = updates.notes;
    append("notes_updated", "Personal notes updated.");
  }
  if (
    updates.submittedAt !== undefined &&
    updates.submittedAt !== application.submittedAt
  ) {
    next.submittedAt = updates.submittedAt;
    append(
      "submission_updated",
      updates.submittedAt
        ? `Submission date recorded: ${updates.submittedAt}.`
        : "Submission date cleared.",
    );
  }
  if (
    updates.reminderDate !== undefined &&
    updates.reminderDate !== application.reminderDate
  ) {
    next.reminderDate = updates.reminderDate;
    append(
      "reminder_updated",
      updates.reminderDate
        ? `Personal reminder set for ${updates.reminderDate}.`
        : "Personal reminder cleared.",
    );
  }
  if (
    updates.completedDocuments !== undefined &&
    JSON.stringify([...updates.completedDocuments].sort()) !==
      JSON.stringify([...application.completedDocuments].sort())
  ) {
    next.completedDocuments = [...new Set(updates.completedDocuments)];
    append(
      "documents_updated",
      `Document checklist updated: ${next.completedDocuments.length} marked ready.`,
    );
  }
  if (events.length === 0) return application;
  return {
    ...next,
    updatedAt: timestamp,
    history: [...application.history, ...events],
  };
}

const LEGACY_STATUS: Record<string, ApplicationStatus> = {
  saved: "saved",
  drafting: "preparing",
  submitted: "submitted",
  review: "under-review",
  awarded: "awarded",
  declined: "rejected",
};
const EVENT_TYPES = new Set([
  "created",
  "status_changed",
  "notes_updated",
  "submission_updated",
  "reminder_updated",
  "documents_updated",
  "imported",
]);

/** Migrate old records without synthesizing dates, submission events or earlier history. */
export function normalizeApplications(
  raw: unknown,
  fallback: ScholarshipApplication[],
  validScholarships: Scholarship[],
): ScholarshipApplication[] {
  if (!Array.isArray(raw)) return fallback;
  const scholarships = new Map(
    validScholarships.map((scholarship) => [scholarship.id, scholarship]),
  );
  const seenIds = new Set<string>();
  const activeScholarships = new Set<string>();
  return raw.flatMap((item): ScholarshipApplication[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const status = isApplicationStatus(record.status)
      ? record.status
      : typeof record.stage === "string" &&
          Object.prototype.hasOwnProperty.call(LEGACY_STATUS, record.stage)
        ? LEGACY_STATUS[record.stage]
        : undefined;
    if (
      typeof record.id !== "string" ||
      !record.id ||
      seenIds.has(record.id) ||
      typeof record.scholarshipId !== "string" ||
      !scholarships.has(record.scholarshipId) ||
      !status ||
      !validTimestamp(record.updatedAt)
    )
      return [];
    if (
      isActiveApplication(status) &&
      activeScholarships.has(record.scholarshipId)
    )
      return [];
    seenIds.add(record.id);
    if (isActiveApplication(status))
      activeScholarships.add(record.scholarshipId);
    const eventIds = new Set<string>();
    const history: ApplicationHistoryEvent[] = Array.isArray(record.history)
      ? record.history
          .flatMap((event) => {
            if (
              !event ||
              typeof event !== "object" ||
              typeof event.id !== "string" ||
              eventIds.has(event.id) ||
              !EVENT_TYPES.has(event.type) ||
              !validTimestamp(event.timestamp) ||
              typeof event.description !== "string"
            )
              return [];
            if (
              event.type === "status_changed" &&
              (!isApplicationStatus(event.fromStatus) ||
                !isApplicationStatus(event.toStatus))
            )
              return [];
            eventIds.add(event.id);
            return [
              {
                id: event.id,
                type: event.type,
                timestamp: event.timestamp,
                description: event.description.slice(0, 1000),
                ...(isApplicationStatus(event.fromStatus)
                  ? { fromStatus: event.fromStatus }
                  : {}),
                ...(isApplicationStatus(event.toStatus)
                  ? { toStatus: event.toStatus }
                  : {}),
              },
            ];
          })
          .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
      : [];
    return [
      {
        id: record.id,
        scholarshipId: record.scholarshipId,
        status,
        createdAt: validTimestamp(record.createdAt) ? record.createdAt : null,
        updatedAt: record.updatedAt,
        submittedAt:
          isDateOnly(record.submittedAt) &&
          record.submittedAt <= localDateValue()
            ? record.submittedAt
            : null,
        reminderDate: isDateOnly(record.reminderDate)
          ? record.reminderDate
          : null,
        notes:
          typeof record.notes === "string" ? record.notes.slice(0, 5000) : "",
        completedDocuments: Array.isArray(record.completedDocuments)
          ? [
              ...new Set(
                record.completedDocuments.filter(
                  (doc): doc is string =>
                    typeof doc === "string" &&
                    scholarships
                      .get(record.scholarshipId as string)!
                      .requiredDocuments.includes(doc),
                ),
              ),
            ]
          : [],
        history,
      },
    ];
  });
}

export function applicationDeadline(
  { application, scholarship }: TrackedApplication,
  now = new Date(),
) {
  if (!Number.isFinite(Date.parse(scholarship.deadline)))
    return {
      label: "Date unavailable",
      tone: "neutral",
      needsAction: false,
      overdue: false,
      remainingDays: null,
    } as const;
  const { remainingDays } = evaluateDeadline(scholarship.deadline, now);
  const config = APPLICATION_STATUSES[application.status];
  if (config.terminal)
    return {
      label: config.label,
      tone: application.status === "awarded" ? "success" : "neutral",
      needsAction: false,
      overdue: false,
      remainingDays,
    } as const;
  if (!config.needsSubmission)
    return {
      label: "Awaiting decision",
      tone: "neutral",
      needsAction: false,
      overdue: false,
      remainingDays,
    } as const;
  if (remainingDays < 0)
    return {
      label: `${Math.abs(remainingDays)}d overdue`,
      tone: "urgent",
      needsAction: true,
      overdue: true,
      remainingDays,
    } as const;
  return {
    label: remainingDays === 0 ? "Due today" : `${remainingDays}d left`,
    tone:
      remainingDays < 7
        ? "urgent"
        : remainingDays <= 14
          ? "attention"
          : "normal",
    needsAction: true,
    overdue: false,
    remainingDays,
  } as const;
}

export function applicationStatistics(
  records: TrackedApplication[],
  now = new Date(),
) {
  const count = (status: ApplicationStatus) =>
    records.filter(({ application }) => application.status === status).length;
  const due = records.filter((record) => {
    const info = applicationDeadline(record, now);
    return (
      info.needsAction &&
      !info.overdue &&
      info.remainingDays !== null &&
      info.remainingDays <= 7
    );
  });
  return {
    total: records.length,
    inProgress: records.filter(
      ({ application }) => APPLICATION_STATUSES[application.status].inProgress,
    ).length,
    active: records.filter(({ application }) =>
      isActiveApplication(application.status),
    ).length,
    submitted: count("submitted"),
    awarded: count("awarded"),
    rejected: count("rejected"),
    withdrawn: count("withdrawn"),
    dueSoon: due.length,
    overdue: records.filter(
      (record) => applicationDeadline(record, now).overdue,
    ).length,
    awardedAmount: records
      .filter(({ application }) => application.status === "awarded")
      .reduce((sum, { scholarship }) => sum + scholarship.amount, 0),
  };
}

export const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
  query: "",
  status: "all",
  deadline: "all",
  sort: "updated",
};
export function queryApplications(
  records: TrackedApplication[],
  filters: ApplicationFilters,
  now = new Date(),
) {
  const query = filters.query.trim().toLowerCase();
  const filtered = records.filter((record) => {
    const { application: app, scholarship } = record;
    if (
      query &&
      !`${scholarship.title} ${scholarship.provider}`
        .toLowerCase()
        .includes(query)
    )
      return false;
    if (filters.status === "active" && !isActiveApplication(app.status))
      return false;
    if (
      filters.status === "in-progress" &&
      !APPLICATION_STATUSES[app.status].inProgress
    )
      return false;
    if (filters.status === "completed" && isActiveApplication(app.status))
      return false;
    if (isApplicationStatus(filters.status) && app.status !== filters.status)
      return false;
    const info = applicationDeadline(record, now);
    if (filters.deadline === "overdue") return info.overdue;
    if (filters.deadline !== "all")
      return (
        info.needsAction &&
        !info.overdue &&
        info.remainingDays !== null &&
        info.remainingDays <= Number(filters.deadline)
      );
    return true;
  });
  return filtered.sort((a, b) => {
    if (filters.sort === "amount")
      return (
        b.scholarship.amount - a.scholarship.amount ||
        a.application.id.localeCompare(b.application.id)
      );
    if (filters.sort === "deadline")
      return (
        (Date.parse(a.scholarship.deadline) || Infinity) -
        (Date.parse(b.scholarship.deadline) || Infinity)
      );
    return (
      Date.parse(b.application.updatedAt) -
        Date.parse(a.application.updatedAt) ||
      a.application.id.localeCompare(b.application.id)
    );
  });
}
