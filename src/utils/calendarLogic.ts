import {
  hasOnlyTerminalApplications,
  isActiveApplication,
} from "@/data/applicationStatuses";
import type {
  CalendarEvent,
  CalendarEventFilter,
  DocumentStatus,
  PersonalCalendarReminder,
  Scholarship,
  ScholarshipApplication,
  VaultDocument,
} from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
}

export function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

export function daysUntil(dateKey: string, today: Date): number | null {
  const target = parseDateKey(dateKey);
  if (!target) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / DAY_MS);
}

export function getDeadlineUrgency(
  dateKey: string,
  today: Date,
): "normal" | "approaching" | "urgent" | "expired" {
  const remaining = daysUntil(dateKey, today);
  if (remaining === null) return "normal";
  if (remaining < 0) return "expired";
  if (remaining < 7) return "urgent";
  if (remaining <= 14) return "approaching";
  return "normal";
}

export function getMonthGridDates(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = shiftDate(firstDay, -firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => shiftDate(start, index));
}

export function getWeekStart(date: Date): Date {
  return shiftDate(date, -date.getDay());
}

function createEvent(
  event: Omit<CalendarEvent, "notes"> & { notes?: string },
): CalendarEvent {
  return { ...event, notes: event.notes ?? "" };
}

export function buildCalendarEvents(
  scholarships: Scholarship[],
  applications: ScholarshipApplication[],
  documents: VaultDocument[],
  reminders: PersonalCalendarReminder[],
): CalendarEvent[] {
  const scholarshipById = new Map(
    scholarships.map((scholarship) => [scholarship.id, scholarship]),
  );
  const events: CalendarEvent[] = [];

  for (const application of applications) {
    const scholarship = scholarshipById.get(application.scholarshipId);
    if (!scholarship) continue;

    if (application.submittedAt) {
      events.push(
        createEvent({
          id: `submission-${application.id}`,
          type: "application-date",
          title: `${scholarship.title} submitted`,
          date: application.submittedAt,
          scholarshipId: scholarship.id,
          scholarshipTitle: scholarship.title,
          applicationId: application.id,
          applicationStatus: application.status,
          readOnly: true,
        }),
      );
    }

    if (application.reminderDate) {
      events.push(
        createEvent({
          id: `application-reminder-${application.id}`,
          type: "personal-reminder",
          title: `${scholarship.title} reminder`,
          date: application.reminderDate,
          scholarshipId: scholarship.id,
          scholarshipTitle: scholarship.title,
          applicationId: application.id,
          applicationStatus: application.status,
          readOnly: true,
          notes: "Application reminder",
        }),
      );
    }
  }

  for (const scholarship of scholarships) {
    const scholarshipApplications = applications.filter(
      (application) => application.scholarshipId === scholarship.id,
    );
    if (hasOnlyTerminalApplications(scholarship.id, applications)) continue;
    const application = scholarshipApplications.find((item) =>
      isActiveApplication(item.status),
    );
    events.push(
      createEvent({
        id: `deadline-${scholarship.id}`,
        type: "scholarship-deadline",
        title: `${scholarship.title} deadline`,
        date: scholarship.deadline.slice(0, 10),
        scholarshipId: scholarship.id,
        scholarshipTitle: scholarship.title,
        applicationId: application?.id ?? null,
        applicationStatus: application?.status ?? null,
        readOnly: true,
      }),
    );
  }

  for (const document of documents) {
    if (!document.expiresAt) continue;
    events.push(
      createEvent({
        id: `document-${document.id}`,
        type: "document-reminder",
        title: `${document.name} expires`,
        date: document.expiresAt,
        scholarshipId: null,
        scholarshipTitle: null,
        applicationId: document.associatedApplicationIds[0] ?? null,
        applicationStatus:
          applications.find(
            (application) =>
              application.id === document.associatedApplicationIds[0],
          )?.status ?? null,
        readOnly: true,
        notes: `Document status: ${documentStatusLabel(document.status)}.`,
      }),
    );
  }

  for (const reminder of reminders) {
    const application = applications.find(
      (item) => item.id === reminder.applicationId,
    );
    const scholarship = application
      ? scholarshipById.get(application.scholarshipId)
      : undefined;
    events.push(
      createEvent({
        id: reminder.id,
        type: "personal-reminder",
        title: reminder.title,
        date: reminder.date,
        scholarshipId: scholarship?.id ?? null,
        scholarshipTitle: scholarship?.title ?? null,
        applicationId: application?.id ?? null,
        applicationStatus: application?.status ?? null,
        readOnly: false,
        notes: reminder.notes,
      }),
    );
  }

  return events.filter((event) => parseDateKey(event.date) !== null);
}

function documentStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    uploaded: "Uploaded",
    "pending-verification": "Pending verification",
    verified: "Verified",
    expired: "Expired",
  };
  return labels[status];
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filter: CalendarEventFilter,
): CalendarEvent[] {
  return filter === "all" ? events : events.filter((event) => event.type === filter);
}
