import { describe, expect, it } from "vitest";
import {
  createDemoApplications,
  createDemoScholarships,
} from "@/data/scholarships";
import { APPLICATION_STATUS_ORDER } from "@/data/applicationStatuses";
import {
  applicationDeadline,
  applicationStatistics,
  createApplication,
  DEFAULT_APPLICATION_FILTERS,
  findActiveApplication,
  isDateOnly,
  joinApplications,
  normalizeApplications,
  queryApplications,
  updateApplicationRecord,
  validateApplicationUpdates,
} from "@/utils/applicationLogic";
import {
  computeDashboardMetrics,
  summarizeApplicationProgress,
} from "@/utils/dashboardLogic";
import type { ApplicationStatus, ScholarshipApplication } from "@/types";

const now = new Date(2026, 4, 15, 10);
const scholarships = createDemoScholarships(now);
const defaults = createDemoApplications(now);

describe("Application record lifecycle", () => {
  it("creates a scholarship-linked record and records only the real creation event", () => {
    const record = createApplication("demo-sch-04", "saved", now);
    expect(record).toMatchObject({
      scholarshipId: "demo-sch-04",
      status: "saved",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      submittedAt: null,
      notes: "",
    });
    expect(record.history).toHaveLength(1);
    expect(record.history[0]).toMatchObject({
      type: "created",
      toStatus: "saved",
      timestamp: now.toISOString(),
    });
    expect(record).not.toHaveProperty("title");
    expect(record.id).not.toBe(
      createApplication("demo-sch-04", "preparing", now).id,
    );
  });

  it("finds duplicate active applications but allows another attempt after completion", () => {
    expect(findActiveApplication(defaults, "demo-sch-01")?.id).toBe(
      "demo-app-01",
    );
    expect(findActiveApplication(defaults, "demo-sch-06")).toBeUndefined();
    expect(
      findActiveApplication(defaults, "demo-sch-01", "demo-app-01"),
    ).toBeUndefined();
  });

  it("appends a status event with its previous state and never infers a submission date", () => {
    const current = createApplication("demo-sch-04", "preparing", now);
    const next = updateApplicationRecord(
      current,
      { status: "submitted" },
      new Date(2026, 4, 16, 11),
    );
    expect(next.status).toBe("submitted");
    expect(next.submittedAt).toBeNull();
    expect(next.history).toHaveLength(2);
    expect(next.history[1]).toMatchObject({
      type: "status_changed",
      fromStatus: "preparing",
      toStatus: "submitted",
    });
    expect(current.status).toBe("preparing");
  });

  it("keeps notes, actual submission dates, personal reminders and document changes", () => {
    const current = createApplication("demo-sch-01", "preparing", now);
    const next = updateApplicationRecord(
      current,
      {
        notes: "Ask my mentor for a recommendation.",
        submittedAt: "2026-05-15",
        reminderDate: "2026-05-18",
        completedDocuments: [scholarships[0].requiredDocuments[0]],
      },
      now,
    );
    expect(next.notes).toContain("mentor");
    expect(next.submittedAt).toBe("2026-05-15");
    expect(next.history.map((event) => event.type)).toEqual([
      "created",
      "notes_updated",
      "submission_updated",
      "reminder_updated",
      "documents_updated",
    ]);
    expect(
      next.history.every(
        (event) => !event.description.includes("Ask my mentor"),
      ),
    ).toBe(true);
    expect(
      updateApplicationRecord(
        next,
        {
          notes: next.notes,
          submittedAt: next.submittedAt,
          reminderDate: next.reminderDate,
          completedDocuments: next.completedDocuments,
        },
        now,
      ),
    ).toBe(next);
  });

  it("supports every status including withdrawal and reopening without losing history", () => {
    let record = createApplication("demo-sch-04", "saved", now);
    for (const status of APPLICATION_STATUS_ORDER.slice(1))
      record = updateApplicationRecord(record, { status }, now);
    expect(record.status).toBe("withdrawn");
    expect(record.history).toHaveLength(8);
    record = updateApplicationRecord(record, { status: "preparing" }, now);
    expect(record.history).toHaveLength(9);
    expect(record.history[8].fromStatus).toBe("withdrawn");
  });

  it("validates date boundaries and rejects malformed or future submission dates", () => {
    expect(isDateOnly("2024-02-29")).toBe(true);
    expect(isDateOnly("2026-02-29")).toBe(false);
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(
      validateApplicationUpdates({ submittedAt: "2026-05-15" }, now),
    ).toBeNull();
    expect(
      validateApplicationUpdates({ submittedAt: "2026-05-16" }, now),
    ).toMatch(/no later than today/);
    expect(
      validateApplicationUpdates({ notes: "x".repeat(5001) }, now),
    ).toMatch(/5,000/);
    expect(
      validateApplicationUpdates({ status: "bogus" as ApplicationStatus }, now),
    ).toMatch(/valid/);
  });
});

describe("Safe persistence and legacy migration", () => {
  it("migrates legacy status fields while preserving notes and refusing to fabricate history", () => {
    const [record] = normalizeApplications(
      [
        {
          id: "legacy-1",
          scholarshipId: "demo-sch-01",
          stage: "drafting",
          statusLabel: "Preparing",
          progressPercent: 75,
          notes: "Keep my notes",
          updatedAt: now.toISOString(),
        },
      ],
      defaults,
      scholarships,
    );
    expect(record.status).toBe("preparing");
    expect(record.notes).toBe("Keep my notes");
    expect(record.createdAt).toBeNull();
    expect(record.submittedAt).toBeNull();
    expect(record.history).toEqual([]);
    expect(record).not.toHaveProperty("stage");
  });

  it("preserves intentionally empty arrays and never restores deleted applications", () => {
    expect(normalizeApplications([], defaults, scholarships)).toEqual([]);
    expect(normalizeApplications(null, defaults, scholarships)).toBe(defaults);
  });

  it("discards malformed records, unknown scholarships, duplicate IDs and duplicate active records", () => {
    const record = createApplication("demo-sch-04", "saved", now);
    const duplicate = { ...record, id: "another-id" };
    const archived = { ...record, id: "completed-id", status: "rejected" };
    expect(
      normalizeApplications(
        [
          null,
          1,
          {},
          { ...record, scholarshipId: "missing" },
          { ...record, status: undefined, stage: "toString" },
          { ...record, updatedAt: "bad" },
          record,
          record,
          duplicate,
          archived,
        ],
        defaults,
        scholarships,
      ),
    ).toHaveLength(2);
  });

  it("sanitizes notes, dates, documents and history events without evaluating arbitrary content", () => {
    const record = createApplication("demo-sch-04", "saved", now);
    const [loaded] = normalizeApplications(
      [
        {
          ...record,
          notes: 42,
          submittedAt: "not-a-date",
          completedDocuments: ["not a required document"],
          history: [
            null,
            {
              id: "h",
              type: "status_changed",
              timestamp: now.toISOString(),
              description: "invalid",
              fromStatus: "wrong",
              toStatus: "submitted",
            },
            ...record.history,
          ],
        },
      ],
      defaults,
      scholarships,
    );
    expect(loaded.notes).toBe("");
    expect(loaded.submittedAt).toBeNull();
    expect(loaded.completedDocuments).toEqual([]);
    expect(loaded.history).toEqual(record.history);
  });
});

describe("Application statistics, deadlines and queries", () => {
  it("derives all four statistics and excludes completed records from dashboard active counts", () => {
    const records = joinApplications(defaults, scholarships);
    expect(applicationStatistics(records, now)).toMatchObject({
      total: 5,
      inProgress: 3,
      submitted: 1,
      awarded: 1,
      active: 4,
      dueSoon: 1,
    });
    expect(
      computeDashboardMetrics(scholarships, defaults, now)
        .activeApplicationsCount,
    ).toBe(4);
    expect(
      summarizeApplicationProgress(defaults).reduce(
        (total, stage) => total + stage.count,
        0,
      ),
    ).toBe(5);
  });

  it.each([
    "submitted",
    "under-review",
    "shortlisted",
    "awarded",
    "rejected",
    "withdrawn",
  ] as ApplicationStatus[])(
    "never marks %s as an active overdue submission",
    (status) => {
      const app = { ...defaults[0], status };
      const scholarship = {
        ...scholarships[0],
        deadline: new Date(2026, 4, 10).toISOString(),
      };
      const info = applicationDeadline({ application: app, scholarship }, now);
      expect(info.overdue).toBe(false);
      expect(info.needsAction).toBe(false);
    },
  );

  it("calculates due-today, urgent, attention and expired dates dynamically", () => {
    const make = (days: number) =>
      applicationDeadline(
        {
          application: defaults[0],
          scholarship: {
            ...scholarships[0],
            deadline: new Date(2026, 4, 15 + days, 12).toISOString(),
          },
        },
        now,
      );
    expect(make(0)).toMatchObject({
      label: "Due today",
      tone: "urgent",
      overdue: false,
    });
    expect(make(6).tone).toBe("urgent");
    expect(make(7).tone).toBe("attention");
    expect(make(15).tone).toBe("normal");
    expect(make(-1)).toMatchObject({ overdue: true, label: "1d overdue" });
  });

  it("combines search, status and deadline filters with deterministic sorting", () => {
    const records = joinApplications(defaults, scholarships);
    expect(
      queryApplications(
        records,
        {
          ...DEFAULT_APPLICATION_FILTERS,
          query: "Navodaya",
          status: "preparing",
          deadline: "30",
        },
        now,
      ).map(({ application }) => application.id),
    ).toEqual(["demo-app-02"]);
    expect(
      queryApplications(
        records,
        { ...DEFAULT_APPLICATION_FILTERS, status: "completed" },
        now,
      ),
    ).toHaveLength(1);
    expect(
      queryApplications(
        records,
        { ...DEFAULT_APPLICATION_FILTERS, status: "in-progress" },
        now,
      ),
    ).toHaveLength(3);
    expect(
      queryApplications(
        records,
        { ...DEFAULT_APPLICATION_FILTERS, deadline: "7" },
        now,
      ),
    ).toHaveLength(1);
    expect(
      queryApplications(
        records,
        { ...DEFAULT_APPLICATION_FILTERS, sort: "amount" },
        now,
      )[0].application.id,
    ).toBe("demo-app-01");
    expect(
      queryApplications(
        records,
        { ...DEFAULT_APPLICATION_FILTERS, sort: "updated" },
        now,
      )[0].application.id,
    ).toBe("demo-app-01");
    expect(
      queryApplications(
        records,
        { ...DEFAULT_APPLICATION_FILTERS, sort: "deadline" },
        now,
      )[0].application.id,
    ).toBe("demo-app-01");
    expect(
      queryApplications(
        records,
        { ...DEFAULT_APPLICATION_FILTERS, query: "nothing" },
        now,
      ),
    ).toEqual([]);
  });

  it("reflects deletion, rejection and withdrawal immediately in derived statistics", () => {
    const changed: ScholarshipApplication[] = defaults.map((app, index) =>
      index === 0
        ? { ...app, status: "withdrawn" }
        : index === 1
          ? { ...app, status: "rejected" }
          : app,
    );
    expect(
      applicationStatistics(joinApplications(changed, scholarships), now),
    ).toMatchObject({ active: 2, rejected: 1, withdrawn: 1, awarded: 1 });
    expect(
      computeDashboardMetrics(scholarships, changed.slice(1), now)
        .activeApplicationsCount,
    ).toBe(2);
  });
});
