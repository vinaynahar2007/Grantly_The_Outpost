import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/App";
import { storageService } from "@/services/storageService";
import { toDateKey } from "@/utils/calendarLogic";

const REMINDERS_KEY = "grantly_v1_calendar_personal_reminders";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderCalendar() {
  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("Deadline Calendar", () => {
  beforeEach(() => localStorage.clear());

  it("navigates months and weeks and changes between calendar views", async () => {
    const user = userEvent.setup();
    renderCalendar();
    const monthHeading = screen.getByRole("heading", {
      name: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date()),
    });
    expect(monthHeading).toBeInTheDocument();
    const currentMonth = monthHeading.textContent;
    await user.click(screen.getByRole("button", { name: "Next month" }));
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    expect(
      screen.getByRole("heading", {
        name: new Intl.DateTimeFormat("en-US", {
          month: "long",
          year: "numeric",
        }).format(nextMonth),
      }),
    ).toBeInTheDocument();
    expect(currentMonth).not.toBe(
      nextMonth.toLocaleString("en-US", { month: "long", year: "numeric" }),
    );

    await user.click(screen.getByRole("button", { name: "week" }));
    expect(screen.getByRole("button", { name: "Previous week" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { name: /–/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "agenda" }));
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeInTheDocument();
  });

  it("creates, edits, deletes, and persists personal reminders", async () => {
    const user = userEvent.setup();
    const page = renderCalendar();
    await user.click(screen.getByRole("button", { name: "Add reminder" }));
    await user.type(
      screen.getByLabelText("Reminder title"),
      "Request a recommendation",
    );
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: toDateKey(new Date()) },
    });
    await user.type(
      screen.getByLabelText("Notes (optional)"),
      "Email the faculty advisor.",
    );
    const reminderDialog = screen.getByRole("dialog", {
      name: "Add personal reminder",
    });
    await user.click(
      within(reminderDialog).getByRole("button", { name: "Add reminder" }),
    );
    expect(
      (await screen.findAllByText("Request a recommendation")).length,
    ).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? "[]")).toMatchObject([
      {
        title: "Request a recommendation",
        date: toDateKey(new Date()),
        notes: "Email the faculty advisor.",
      },
    ]);

    page.unmount();
    renderCalendar();
    expect(
      (await screen.findAllByText("Request a recommendation")).length,
    ).toBeGreaterThan(0);
    await user.click(
      screen.getAllByRole("button", { name: "Request a recommendation" })[0],
    );
    await user.click(
      screen.getByRole("button", {
        name: "Close Request a recommendation",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Edit Request a recommendation",
      }),
    );
    const title = screen.getByLabelText("Reminder title");
    await user.clear(title);
    await user.type(title, "Request an updated recommendation");
    await user.click(screen.getByRole("button", { name: "Save reminder" }));
    expect(
      (await screen.findAllByText("Request an updated recommendation"))[0],
    ).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? "[]")[0].title).toBe(
      "Request an updated recommendation",
    );

    await user.click(
      screen.getAllByRole("button", {
        name: "Request an updated recommendation",
      })[0],
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const confirmDialog = screen.getByRole("dialog", { name: "Delete reminder?" });
    await user.click(
      within(confirmDialog).getByRole("button", { name: "Delete reminder" }),
    );
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? "[]")).toEqual([]);
    });
    expect(
      screen.queryAllByRole("button", {
        name: "Request an updated recommendation",
      }),
    ).toHaveLength(0);
  });

  it("filters centralized events and keeps application data linked to tracker details", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await user.click(
      screen.getByRole("button", { name: "Scholarship deadlines" }),
    );
    expect(screen.getByRole("group", { name: "Filter calendar events" })).toHaveAttribute(
      "aria-label",
      "Filter calendar events",
    );
    expect(screen.getAllByText(/deadline$/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Application dates" }));
    expect(screen.getByText("No events in this view")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All events" }));
    expect(
      screen.getByRole("link", { name: "Open Application Tracker" }),
    ).toHaveAttribute("href", "/applications");
  });

  it("surfaces browser storage failures instead of reporting a saved reminder", async () => {
    const user = userEvent.setup();
    vi.spyOn(storageService, "set").mockReturnValue(false);
    renderCalendar();
    await user.click(screen.getByRole("button", { name: "Add reminder" }));
    await user.type(screen.getByLabelText("Reminder title"), "Unsaved reminder");
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: toDateKey(new Date()) },
    });
    await user.click(
      within(screen.getByRole("dialog", { name: "Add personal reminder" }))
        .getByRole("button", { name: "Add reminder" }),
    );
    expect(
      within(
        screen.getByRole("dialog", { name: "Add personal reminder" }),
      ).getByRole("alert"),
    ).toHaveTextContent(
      "could not be saved in browser storage",
    );
    expect(screen.queryByText("Reminder created")).not.toBeInTheDocument();
    expect(localStorage.getItem(REMINDERS_KEY)).toBeNull();
  });
});
