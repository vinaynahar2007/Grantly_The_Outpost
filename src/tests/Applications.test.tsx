import { beforeEach, describe, expect, it } from "vitest";
import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/tests/testAppRoutes";
import { createDemoApplications } from "@/data/scholarships";
import type { ScholarshipApplication } from "@/types";
import {
  StudentDataProvider,
  useStudentData,
} from "@/context/StudentDataContext";
import { ToastProvider } from "@/context/ToastContext";

const STORE = "grantly_v1_scholar_applications";
const read = (): ScholarshipApplication[] =>
  JSON.parse(localStorage.getItem(STORE) ?? "[]");
const renderTracker = (path = "/applications") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

describe("Application tracker workflows", () => {
  beforeEach(() => localStorage.clear());

  it("guards simultaneous duplicate requests at the shared state boundary", async () => {
    const user = userEvent.setup();
    function DuplicateRequests() {
      const { startApplication } = useStudentData();
      return (
        <button
          onClick={() => {
            startApplication("demo-sch-04");
            startApplication("demo-sch-04");
          }}
        >
          Add twice
        </button>
      );
    }
    render(
      <ToastProvider>
        <StudentDataProvider>
          <DuplicateRequests />
        </StudentDataProvider>
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Add twice" }));
    expect(
      read().filter((app) => app.scholarshipId === "demo-sch-04"),
    ).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Application Already Tracked",
    );
  });

  it("blocks reopening a completed record when another active attempt exists", async () => {
    const user = userEvent.setup();
    const defaults = createDemoApplications();
    const awarded = defaults.find((app) => app.status === "awarded")!;
    localStorage.setItem(
      STORE,
      JSON.stringify([
        ...defaults,
        { ...awarded, id: "active-attempt", status: "preparing" },
      ]),
    );
    renderTracker(`/applications?application=${awarded.id}`);
    const dialog = screen.getByRole("dialog", { name: "Application details" });
    await user.selectOptions(
      within(dialog).getByLabelText("Application status"),
      "saved",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(
      screen.getByText("An active application already exists"),
    ).toBeInTheDocument();
    expect(read().find((app) => app.id === awarded.id)?.status).toBe("awarded");
    expect(read().find((app) => app.id === awarded.id)?.history).toEqual([]);
  });

  it("renders the four real statistics and the linked application list", () => {
    renderTracker();
    const stats = screen.getByRole("region", {
      name: "Application statistics",
    });
    expect(
      within(stats).getByRole("button", { name: /Total Applications: 5/ }),
    ).toBeInTheDocument();
    expect(
      within(stats).getByRole("button", { name: /In Progress: 3/ }),
    ).toBeInTheDocument();
    expect(
      within(stats).getByRole("button", { name: /Submitted: 1/ }),
    ).toBeInTheDocument();
    expect(
      within(stats).getByRole("button", { name: /Awarded: 1/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(6);
  });

  it("adds a saved scholarship, initializes real history and prevents a duplicate choice", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.click(
      screen.getByRole("button", { name: /^Add application$/i }),
    );
    const dialog = screen.getByRole("dialog");
    const scholarship = "Pragati First-Generation Leaders Scholarship";
    await user.click(within(dialog).getByRole("radio", { name: scholarship }));
    await user.click(within(dialog).getByRole("radio", { name: /^Saved$/ }));
    await user.click(
      within(dialog).getByRole("button", { name: /^Add application$/i }),
    );
    expect(screen.getByText("Application Tracked")).toBeInTheDocument();
    expect(read()).toHaveLength(6);
    const record = read().find((item) => item.scholarshipId === "demo-sch-04")!;
    expect(record.status).toBe("saved");
    expect(record.history.map((item) => item.type)).toEqual(["created"]);
    await user.click(
      screen.getByRole("button", { name: /^Add application$/i }),
    );
    expect(
      within(screen.getByRole("dialog")).getByRole("radio", {
        name: scholarship,
      }),
    ).toBeDisabled();
    expect(read()).toHaveLength(6);
  });

  it("can add an unsaved opportunity from the full catalogue", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.click(
      screen.getByRole("button", { name: /^Add application$/i }),
    );
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /^All scholarships$/ }),
    );
    await user.type(
      within(dialog).getByLabelText("Search scholarships to add"),
      "Kiran",
    );
    await user.click(
      within(dialog).getByRole("radio", { name: /Kiran Global Exchange/ }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: /^Add application$/i }),
    );
    expect(
      read().some(
        (app) =>
          app.scholarshipId === "demo-sch-07" && app.status === "preparing",
      ),
    ).toBe(true);
  });

  it("changes status in the list and appends one timestamped event", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.selectOptions(
      screen.getByRole("combobox", {
        name: "Status for Aarohan STEM Excellence Fellowship",
      }),
      "shortlisted",
    );
    const app = read().find((record) => record.id === "demo-app-01")!;
    expect(app.status).toBe("shortlisted");
    expect(app.history).toHaveLength(1);
    expect(app.history[0]).toMatchObject({
      fromStatus: "preparing",
      toStatus: "shortlisted",
    });
    expect(app.submittedAt).toBeNull();
    expect(
      screen.getByText("Status updated to Shortlisted"),
    ).toBeInTheDocument();
  });

  it("persists notes, actual submission date, reminder and document readiness across remounts", async () => {
    const user = userEvent.setup();
    const { unmount } = renderTracker("/applications?application=demo-app-01");
    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByLabelText("Personal notes"));
    await user.type(
      within(dialog).getByLabelText("Personal notes"),
      "Ask Professor Rao for my reference.",
    );
    fireEvent.change(within(dialog).getByLabelText("Submission date"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(within(dialog).getByLabelText("Personal reminder date"), {
      target: { value: "2027-01-10" },
    });
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "Official Semester Transcripts",
      }),
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Application status"),
      "submitted",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(read()[0]).toMatchObject({
      status: "submitted",
      notes: "Ask Professor Rao for my reference.",
      submittedAt: "2026-01-01",
      reminderDate: "2027-01-10",
      completedDocuments: ["Official Semester Transcripts"],
    });
    expect(read()[0].history.map((event) => event.type)).toEqual([
      "status_changed",
      "notes_updated",
      "submission_updated",
      "reminder_updated",
      "documents_updated",
    ]);
    unmount();
    renderTracker("/applications?application=demo-app-01");
    expect(screen.getByLabelText("Personal notes")).toHaveValue(
      "Ask Professor Rao for my reference.",
    );
    expect(screen.getByLabelText("Submission date")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("Personal reminder date")).toHaveValue(
      "2027-01-10",
    );
    expect(
      screen.getByRole("checkbox", { name: "Official Semester Transcripts" }),
    ).toBeChecked();
    await user.click(screen.getByRole("button", { name: /History \(5\)/ }));
    expect(
      screen.getByRole("region", { name: "Application history" }),
    ).toHaveTextContent("Preparing to Submitted");
  });

  it("searches and combines status/deadline filters and clears them", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.type(
      screen.getByLabelText("Search applications by scholarship or provider"),
      "Navodaya",
    );
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.selectOptions(
      screen.getByLabelText("Filter application status"),
      "submitted",
    );
    expect(
      screen.getByText("No applications match your filters"),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0],
    );
    await user.selectOptions(
      screen.getByLabelText("Filter application deadline"),
      "7",
    );
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText("Sort by"), "amount");
    expect(
      screen.getByRole("combobox", { name: /Status for Aarohan/ }),
    ).toBeInTheDocument();
  });

  it("moves a card using the accessible Kanban status selector and keeps archived records visible", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.click(screen.getByRole("button", { name: "Kanban view" }));
    const preparing = screen.getByRole("region", { name: "Preparing column" });
    await user.selectOptions(
      within(preparing).getByRole("combobox", {
        name: "Status for Aarohan STEM Excellence Fellowship",
      }),
      "shortlisted",
    );
    const shortlisted = screen.getByRole("region", {
      name: "Shortlisted column",
    });
    expect(
      within(shortlisted).getByText("Aarohan STEM Excellence Fellowship"),
    ).toBeInTheDocument();
    await user.selectOptions(
      within(shortlisted).getByRole("combobox", {
        name: "Status for Aarohan STEM Excellence Fellowship",
      }),
      "rejected",
    );
    expect(
      screen.getByRole("heading", { name: "Rejected & withdrawn (1)" }),
    ).toBeInTheDocument();
    expect(read()[0].status).toBe("rejected");
    expect(localStorage.getItem("grantly_v1_application_view")).toBe('"board"');
  });

  it("withdraws without deleting history and updates the dashboard active count", async () => {
    const user = userEvent.setup();
    renderTracker("/applications?application=demo-app-01");
    await user.click(
      screen.getByRole("button", { name: "Withdraw application" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );
    expect(read()[0].status).toBe("withdrawn");
    expect(read()[0].history[0].toStatus).toBe("withdrawn");
    const navigation = screen.getByRole("navigation", {
      name: "Primary Navigation",
    });
    await user.click(
      within(navigation).getByRole("link", { name: "Dashboard" }),
    );
    expect(screen.getByText("03 active")).toBeInTheDocument();
    const counts = await screen.findByRole("list", {
      name: "Application stage counts",
    });
    expect(within(counts).getByText("Withdrawn")).toBeInTheDocument();
  });

  it("deletes only after confirmation and persists an intentionally empty tracker", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORE, JSON.stringify([createDemoApplications()[0]]));
    const { unmount } = renderTracker();
    await user.click(
      screen.getByRole("button", {
        name: "Delete Aarohan STEM Excellence Fellowship",
      }),
    );
    expect(read()).toHaveLength(1);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete application",
      }),
    );
    expect(read()).toEqual([]);
    expect(
      screen.getByText("Your next chapter starts here"),
    ).toBeInTheDocument();
    unmount();
    renderTracker();
    expect(
      screen.getByText("Your next chapter starts here"),
    ).toBeInTheDocument();
    expect(read()).toEqual([]);
  });

  it("handles malformed persisted data and a missing application deep link safely", async () => {
    localStorage.setItem(STORE, "{broken-json");
    renderTracker("/applications?application=missing-record");
    expect(
      screen.getByRole("dialog", { name: "Application not found" }),
    ).toBeInTheDocument();
    expect(read()).toHaveLength(5);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Back to applications" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("promotes a saved scholarship directly into the same shared tracker", async () => {
    const user = userEvent.setup();
    renderTracker("/saved");
    await user.click(
      screen.getByRole("button", {
        name: "Track application for Pragati First-Generation Leaders Scholarship",
      }),
    );
    expect(read()).toHaveLength(6);
    const link = screen.getByRole("link", {
      name: "View tracked application for Pragati First-Generation Leaders Scholarship",
    });
    await user.click(link);
    expect(
      screen.getByRole("dialog", { name: "Application details" }),
    ).toBeInTheDocument();
  });
});
