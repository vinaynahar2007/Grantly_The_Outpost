import { describe, expect, it } from "vitest";
import { createDemoApplications, createDemoScholarships } from "@/data/scholarships";
import {
  buildCalendarEvents,
  daysUntil,
  filterCalendarEvents,
  getDeadlineUrgency,
  getMonthGridDates,
  getWeekStart,
  parseDateKey,
  toDateKey,
} from "@/utils/calendarLogic";
import type {
  PersonalCalendarReminder,
  ScholarshipApplication,
  VaultDocument,
} from "@/types";

describe("Deadline calendar logic", () => {
  const today = new Date(2026, 10, 7, 18, 30);

  it("calculates urgency at the exact day boundaries using local calendar dates", () => {
    expect(daysUntil("2026-11-07", today)).toBe(0);
    expect(daysUntil("2026-11-06", today)).toBe(-1);
    expect(getDeadlineUrgency("2026-11-06", today)).toBe("expired");
    expect(getDeadlineUrgency("2026-11-07", today)).toBe("urgent");
    expect(getDeadlineUrgency("2026-11-13", today)).toBe("urgent");
    expect(getDeadlineUrgency("2026-11-14", today)).toBe("approaching");
    expect(getDeadlineUrgency("2026-11-21", today)).toBe("approaching");
    expect(getDeadlineUrgency("2026-11-22", today)).toBe("normal");
    expect(daysUntil("2026-02-30", today)).toBeNull();
    expect(parseDateKey("2026-02-30")).toBeNull();
  });

  it("builds centralized events from applications, documents, and reminders without duplicating records", () => {
    const scholarships = createDemoScholarships(today);
    const applications = createDemoApplications();
    const terminalScholarship = {
      ...scholarships[0],
      id: "terminal-scholarship",
      title: "Terminal Opportunity",
    };
    const terminal: ScholarshipApplication = {
      ...applications[0],
      id: "terminal-app",
      scholarshipId: terminalScholarship.id,
      status: "awarded",
    };
    const docs: VaultDocument[] = [
      {
        id: "doc-1",
        name: "ID.pdf",
        category: "identity",
        mimeType: "application/pdf",
        size: 12,
        updatedAt: today.toISOString(),
        status: "verified",
        expiresAt: "2026-12-01",
        associatedApplicationIds: [applications[0].id],
      },
    ];
    const reminders: PersonalCalendarReminder[] = [
      {
        id: "reminder-1",
        title: "Request a reference",
        date: "2026-11-09",
        notes: "Ask faculty",
        applicationId: applications[0].id,
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
    ];
    const events = buildCalendarEvents(
      [...scholarships, terminalScholarship],
      [...applications, terminal],
      docs,
      reminders,
    );
    expect(
      events.filter((event) => event.scholarshipId === terminalScholarship.id),
    ).toHaveLength(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        id: `deadline-${applications[0].scholarshipId}`,
        type: "scholarship-deadline",
        applicationStatus: applications[0].status,
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        id: "document-doc-1",
        type: "document-reminder",
        applicationId: applications[0].id,
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        id: "reminder-1",
        type: "personal-reminder",
        scholarshipTitle: scholarships.find(
          (item) => item.id === applications[0].scholarshipId,
        )?.title,
      }),
    );
    expect(filterCalendarEvents(events, "document-reminder")).toHaveLength(1);
    expect(filterCalendarEvents(events, "all")).toHaveLength(events.length);
  });

  it("creates Sunday-first month and week ranges with local date keys", () => {
    const month = getMonthGridDates(new Date(2026, 10, 1));
    expect(month).toHaveLength(42);
    expect(month[0].getDay()).toBe(0);
    expect(month[0].getMonth()).toBe(10);
    expect(month[month.length - 1].getDay()).toBe(6);
    const week = getWeekStart(new Date(2026, 10, 7));
    expect(toDateKey(week)).toBe("2026-11-01");
  });
});
