import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useCurrentDate } from "@/hooks/useCurrentDate";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDocumentVault } from "@/context/DocumentVaultContext";
import { useStudentData } from "@/context/StudentDataContext";
import { useToast } from "@/context/ToastContext";
import { storageService } from "@/services/storageService";
import type {
  CalendarEvent,
  CalendarEventFilter,
  CalendarEventType,
  CalendarView,
  PersonalCalendarReminder,
} from "@/types";
import {
  buildCalendarEvents,
  daysUntil,
  filterCalendarEvents,
  getDeadlineUrgency,
  getMonthGridDates,
  getWeekStart,
  parseDateKey,
  shiftDate,
  toDateKey,
} from "@/utils/calendarLogic";

const REMINDERS_KEY = "calendar_personal_reminders";
const EVENT_FILTERS: Array<{ id: CalendarEventFilter; label: string }> = [
  { id: "all", label: "All events" },
  { id: "scholarship-deadline", label: "Scholarship deadlines" },
  { id: "application-date", label: "Application dates" },
  { id: "personal-reminder", label: "Personal reminders" },
  { id: "document-reminder", label: "Document reminders" },
];
const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  "scholarship-deadline": "Scholarship deadline",
  "application-date": "Application date",
  "personal-reminder": "Personal reminder",
  "document-reminder": "Document reminder",
};
const EVENT_COLORS: Record<CalendarEventType, string> = {
  "scholarship-deadline":
    "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  "application-date":
    "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
  "personal-reminder":
    "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  "document-reminder":
    "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
};
const URGENCY_CLASSES = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-800",
  approaching: "border-amber-200 bg-amber-50 text-amber-900",
  urgent: "border-rose-200 bg-rose-50 text-rose-800",
  expired: "border-slate-200 bg-slate-100 text-slate-600",
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isReminder(value: unknown): value is PersonalCalendarReminder {
  if (!value || typeof value !== "object") return false;
  const reminder = value as Partial<PersonalCalendarReminder>;
  return (
    typeof reminder.id === "string" &&
    typeof reminder.title === "string" &&
    typeof reminder.date === "string" &&
    Boolean(parseDateKey(reminder.date)) &&
    typeof reminder.notes === "string" &&
    (reminder.applicationId === null ||
      typeof reminder.applicationId === "string") &&
    typeof reminder.createdAt === "string" &&
    typeof reminder.updatedAt === "string"
  );
}

function loadReminders(): PersonalCalendarReminder[] {
  const stored = storageService.get<unknown>(REMINDERS_KEY, []);
  return Array.isArray(stored) ? stored.filter(isReminder) : [];
}

function formatDate(dateKey: string, options?: Intl.DateTimeFormatOptions) {
  const date = parseDateKey(dateKey);
  return date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...options,
      }).format(date)
    : "Date unavailable";
}

function formatCountdown(dateKey: string, now: Date): string {
  const remaining = daysUntil(dateKey, now);
  if (remaining === null) return "Date unavailable";
  if (remaining < 0)
    return `Expired ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} ago`;
  if (remaining === 0) return "Due today";
  return `${remaining} day${remaining === 1 ? "" : "s"} remaining`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function createReminderId(): string {
  return `reminder-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function CalendarPage() {
  useDocumentTitle("Deadlines Calendar");
  const now = useCurrentDate();
  const { scholarships, applications } = useStudentData();
  const { documents } = useDocumentVault();
  const { showToast } = useToast();
  const [reminders, setReminders] = useState(loadReminders);
  const [view, setView] = useState<CalendarView>("month");
  const [filter, setFilter] = useState<CalendarEventFilter>("all");
  const [anchorDate, setAnchorDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [reminderDialog, setReminderDialog] = useState<
    "create" | PersonalCalendarReminder | null
  >(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(toDateKey(now));
  const [reminderNotes, setReminderNotes] = useState("");
  const [reminderApplicationId, setReminderApplicationId] = useState("");
  const [reminderError, setReminderError] = useState("");
  const [deleteReminderId, setDeleteReminderId] = useState<string | null>(null);

  const events = useMemo(
    () => buildCalendarEvents(scholarships, applications, documents, reminders),
    [scholarships, applications, documents, reminders],
  );
  const filteredEvents = useMemo(
    () => filterCalendarEvents(events, filter),
    [events, filter],
  );
  const monthDates = useMemo(() => getMonthGridDates(anchorDate), [anchorDate]);
  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index)),
    [weekStart],
  );
  const rangeStart =
    view === "week"
      ? toDateKey(weekStart)
      : toDateKey(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  const rangeEnd =
    view === "week"
      ? toDateKey(shiftDate(weekStart, 6))
      : toDateKey(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0));
  const rangeEvents = useMemo(
    () =>
      filteredEvents
        .filter((event) => {
          if (selectedDate) return event.date === selectedDate;
          return event.date >= rangeStart && event.date <= rangeEnd;
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
    [filteredEvents, rangeStart, rangeEnd, selectedDate, view],
  );
  const upcomingDeadlines = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.type === "scholarship-deadline" &&
            (daysUntil(event.date, now) ?? -1) >= 0,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
    [events, now],
  );

  const saveReminders = (next: PersonalCalendarReminder[]) => {
    if (!storageService.set(REMINDERS_KEY, next)) {
      const message =
        "Your reminder could not be saved in browser storage. Check available storage space and try again.";
      setReminderError(message);
      showToast({
        title: "Reminder could not be saved",
        description: message,
        tone: "error",
      });
      return false;
    }
    setReminders(next);
    setReminderError("");
    return true;
  };

  const openNewReminder = () => {
    setReminderTitle("");
    setReminderDate(toDateKey(now));
    setReminderNotes("");
    setReminderApplicationId("");
    setReminderError("");
    setReminderDialog("create");
  };

  const openEditReminder = (reminder: PersonalCalendarReminder) => {
    setReminderTitle(reminder.title);
    setReminderDate(reminder.date);
    setReminderNotes(reminder.notes);
    setReminderApplicationId(reminder.applicationId ?? "");
    setReminderError("");
    setReminderDialog(reminder);
  };

  const saveReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = reminderTitle.trim();
    if (!title) {
      setReminderError("Enter a title for this reminder.");
      return;
    }
    if (title.length > 100) {
      setReminderError("Reminder titles must be 100 characters or fewer.");
      return;
    }
    if (!parseDateKey(reminderDate)) {
      setReminderError("Choose a valid reminder date.");
      return;
    }
    if (reminderNotes.length > 1000) {
      setReminderError("Reminder notes must be 1,000 characters or fewer.");
      return;
    }
    const timestamp = new Date().toISOString();
    const existing =
      reminderDialog && reminderDialog !== "create" ? reminderDialog : null;
    const reminder: PersonalCalendarReminder = {
      id: existing?.id ?? createReminderId(),
      title,
      date: reminderDate,
      notes: reminderNotes.trim(),
      applicationId: reminderApplicationId || null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const next = existing
      ? reminders.map((item) => (item.id === existing.id ? reminder : item))
      : [reminder, ...reminders];
    if (!saveReminders(next)) return;
    setReminderDialog(null);
    showToast({
      title: existing ? "Reminder updated" : "Reminder created",
      description: reminder.title,
    });
  };

  const deleteReminder = (reminderId: string) => {
    const next = reminders.filter((reminder) => reminder.id !== reminderId);
    if (!saveReminders(next)) return;
    setDeleteReminderId(null);
    setSelectedEvent(null);
    showToast({ title: "Reminder deleted", tone: "info" });
  };

  const moveRange = (direction: -1 | 1) => {
    setSelectedDate(null);
    if (view === "week") {
      setAnchorDate((date) => shiftDate(date, direction * 7));
    } else {
      setAnchorDate(
        (date) => new Date(date.getFullYear(), date.getMonth() + direction, 1),
      );
    }
  };

  const visibleDates = view === "week" ? weekDates : monthDates;
  const calendarTitle =
    view === "week"
      ? `${formatDate(toDateKey(weekStart), { month: "short" })} – ${formatDate(toDateKey(shiftDate(weekStart, 6)))}`
      : monthLabel(anchorDate);
  const isCurrentPeriod =
    view === "week"
      ? toDateKey(getWeekStart(now)) === toDateKey(weekStart)
      : now.getFullYear() === anchorDate.getFullYear() &&
        now.getMonth() === anchorDate.getMonth();

  const renderEventButton = (calendarEvent: CalendarEvent, compact = false) => (
    <button
      key={calendarEvent.id}
      type="button"
      onClick={() => setSelectedEvent(calendarEvent)}
      className={`block w-full min-w-0 rounded-lg border px-2 py-1 text-left text-[10px] font-medium leading-snug focus-visible:outline-2 focus-visible:outline-offset-1 ${EVENT_COLORS[calendarEvent.type]} ${compact ? "truncate" : ""}`}
      title={`${calendarEvent.title} — ${formatDate(calendarEvent.date)}`}
    >
      {calendarEvent.title}
    </button>
  );

  const renderAgendaEvent = (calendarEvent: CalendarEvent) => {
    const isDeadline = calendarEvent.type === "scholarship-deadline";
    const urgency = isDeadline
      ? getDeadlineUrgency(calendarEvent.date, now)
      : null;
    const application = applications.find(
      (item) => item.id === calendarEvent.applicationId,
    );
    return (
      <li key={calendarEvent.id}>
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <time
              dateTime={calendarEvent.date}
              className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-canvas px-2 py-2 text-center"
            >
              <span className="text-[10px] font-semibold uppercase text-navy-500">
                {formatDate(calendarEvent.date, { month: "short" })}
              </span>
              <span className="font-display text-lg font-bold leading-tight text-navy-900">
                {parseDateKey(calendarEvent.date)?.getDate()}
              </span>
            </time>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setSelectedEvent(calendarEvent)}
                className="block text-left text-sm font-semibold text-navy-900 hover:text-violet-700"
              >
                {calendarEvent.title}
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${EVENT_COLORS[calendarEvent.type]}`}
                >
                  {EVENT_TYPE_LABELS[calendarEvent.type]}
                </span>
                {calendarEvent.scholarshipTitle && (
                  <span className="truncate text-[11px] text-navy-500">
                    {calendarEvent.scholarshipTitle}
                  </span>
                )}
                {calendarEvent.applicationStatus && (
                  <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-navy-600">
                    {calendarEvent.applicationStatus.replace("-", " ")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {urgency && (
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${URGENCY_CLASSES[urgency]}`}
              >
                {formatCountdown(calendarEvent.date, now)}
              </span>
            )}
            {calendarEvent.applicationId && application && (
              <Link
                to={`/applications?application=${encodeURIComponent(application.id)}`}
                className="text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
              >
                Application
              </Link>
            )}
            {calendarEvent.scholarshipId && (
              <Link
                to={`/scholarships/${calendarEvent.scholarshipId}`}
                className="text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
              >
                Scholarship
              </Link>
            )}
            {!calendarEvent.readOnly && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${calendarEvent.title}`}
                onClick={() => {
                  const reminder = reminders.find(
                    (item) => item.id === calendarEvent.id,
                  );
                  if (reminder) openEditReminder(reminder);
                }}
              >
                <Pencil size={15} aria-hidden="true" />
              </Button>
            )}
          </div>
        </Card>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines Calendar"
        badgeText="Schedule"
        description="Keep scholarship cutoffs, application milestones, and personal reminders in one synchronized calendar."
        actions={
          <Button
            variant="primary"
            leftIcon={<CalendarPlus size={16} aria-hidden="true" />}
            onClick={openNewReminder}
          >
            Add reminder
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-4">
          <Card className="p-3 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-navy-900 sm:text-xl">
                    {calendarTitle}
                  </h2>
                  {!isCurrentPeriod && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAnchorDate(
                          new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                        );
                        setSelectedDate(null);
                      }}
                    >
                      Today
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={`Previous ${view === "week" ? "week" : "month"}`}
                    onClick={() => moveRange(-1)}
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={`Next ${view === "week" ? "week" : "month"}`}
                    onClick={() => moveRange(1)}
                  >
                    <ArrowRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div
                role="group"
                aria-label="Calendar view"
                className="grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1 sm:inline-flex sm:w-fit"
              >
                {(["month", "week", "agenda"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={view === item}
                    onClick={() => {
                      setView(item);
                      setSelectedDate(null);
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors ${view === item ? "bg-white text-violet-800 shadow-sm" : "text-navy-500 hover:text-navy-900"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div
                role="group"
                aria-label="Filter calendar events"
                className="flex gap-2 overflow-x-auto pb-1"
              >
                {EVENT_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={filter === item.id}
                    onClick={() => setFilter(item.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${filter === item.id ? "border-violet-700 bg-violet-50 text-violet-800" : "border-border bg-white text-navy-600 hover:bg-canvas"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {view !== "agenda" && (
              <div
                className={`mt-4 ${view === "month" ? "hidden sm:block" : "hidden lg:block"}`}
                aria-label={view === "month" ? "Monthly calendar grid" : "Weekly calendar grid"}
              >
                <div className="grid grid-cols-7 border-b border-border-subtle">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-navy-500 sm:text-xs"
                    >
                      <span className="sm:hidden">{day.slice(0, 1)}</span>
                      <span className="hidden sm:inline">{day}</span>
                    </div>
                  ))}
                </div>
                <div
                  className={`grid grid-cols-7 ${view === "month" ? "grid-rows-6" : "grid-rows-1"}`}
                >
                  {visibleDates.map((date) => {
                    const dateKey = toDateKey(date);
                    const inMonth =
                      date.getMonth() === anchorDate.getMonth() &&
                      date.getFullYear() === anchorDate.getFullYear();
                    const dayEvents = filteredEvents
                      .filter((event) => event.date === dateKey)
                      .sort((a, b) => a.title.localeCompare(b.title));
                    const isToday = dateKey === toDateKey(now);
                    return (
                      <div
                        key={dateKey}
                        className={`min-h-[82px] min-w-0 border-b border-r border-border-subtle p-1.5 sm:min-h-[110px] sm:p-2 ${view === "week" ? "lg:min-h-[280px]" : ""} ${view === "month" && !inMonth ? "bg-canvas/70" : "bg-white"}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(dateKey);
                            setView("agenda");
                          }}
                          className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-violet-700 text-white" : inMonth || view === "week" ? "text-navy-700 hover:bg-canvas" : "text-navy-300"}`}
                          aria-label={`Show events for ${formatDate(dateKey, { weekday: "long" })}`}
                        >
                          {date.getDate()}
                        </button>
                        <div className="space-y-1">
                          {dayEvents.slice(0, view === "month" ? 2 : 5).map((item) =>
                            renderEventButton(item, true),
                          )}
                          {dayEvents.length > (view === "month" ? 2 : 5) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(dateKey);
                                setView("agenda");
                              }}
                              className="px-1 text-[10px] font-semibold text-violet-700 hover:underline"
                            >
                              +{dayEvents.length - (view === "month" ? 2 : 5)} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <section
              aria-labelledby="calendar-agenda-heading"
              className={`${view === "agenda" || view === "month" ? "" : "mt-5 lg:hidden"} ${view === "month" ? "mt-5 sm:mt-5" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3
                    id="calendar-agenda-heading"
                    className="font-display text-sm font-bold text-navy-900"
                  >
                    {selectedDate
                      ? `Events for ${formatDate(selectedDate, { weekday: "long" })}`
                      : view === "agenda"
                        ? "Agenda"
                        : view === "week"
                          ? "This week"
                          : "This month"}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-navy-500">
                    {rangeEvents.length} event{rangeEvents.length === 1 ? "" : "s"}
                  </p>
                </div>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                  >
                    Clear day
                  </Button>
                )}
              </div>
              {rangeEvents.length ? (
                <ul className="space-y-2.5">
                  {rangeEvents.map(renderAgendaEvent)}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-canvas/70 px-4 py-8 text-center">
                  <CalendarDays
                    className="mx-auto h-6 w-6 text-navy-400"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm font-semibold text-navy-800">
                    No events in this view
                  </p>
                  <p className="mt-1 text-xs text-navy-500">
                    Try another filter, move to a different date, or add a personal reminder.
                  </p>
                </div>
              )}
            </section>
          </Card>
        </main>

        <aside className="space-y-5" aria-label="Upcoming deadlines and event key">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Clock3 size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-navy-900">
                  Upcoming deadlines
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-navy-500">
                  Active applications only. Updates follow your tracker.
                </p>
              </div>
            </div>
            {upcomingDeadlines.length ? (
              <ul className="mt-4 space-y-2.5">
                {upcomingDeadlines.map((deadline) => {
                  const urgency = getDeadlineUrgency(deadline.date, now);
                  return (
                    <li
                      key={deadline.id}
                      className="rounded-xl border border-border-subtle bg-canvas/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {deadline.scholarshipId ? (
                            <Link
                              to={`/scholarships/${deadline.scholarshipId}`}
                              className="line-clamp-2 text-xs font-semibold text-navy-900 hover:text-violet-700"
                            >
                              {deadline.scholarshipTitle}
                            </Link>
                          ) : (
                            <p className="text-xs font-semibold text-navy-900">
                              {deadline.title}
                            </p>
                          )}
                          <time
                            dateTime={deadline.date}
                            className="mt-1 block text-[10px] text-navy-500"
                          >
                            {formatDate(deadline.date)}
                          </time>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${URGENCY_CLASSES[urgency]}`}
                        >
                          {formatCountdown(deadline.date, now)}
                        </span>
                      </div>
                      {deadline.applicationId && (
                        <Link
                          to={`/applications?application=${encodeURIComponent(deadline.applicationId)}`}
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 hover:underline"
                        >
                          Open application
                          <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-navy-500">
                No upcoming deadlines for active applications. Track a scholarship to monitor its cutoff.
              </p>
            )}
            <Link
              to="/applications"
              className="mt-4 inline-flex text-xs font-semibold text-violet-700 hover:underline"
            >
              Open Application Tracker
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold text-navy-900">
              Event types
            </h2>
            <ul className="mt-3 space-y-2.5">
              {EVENT_FILTERS.slice(1).map((item) => (
                <li key={item.id} className="flex items-center gap-2.5">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${item.id === "scholarship-deadline" ? "bg-violet-600" : item.id === "application-date" ? "bg-blue-600" : item.id === "personal-reminder" ? "bg-amber-500" : "bg-emerald-600"}`}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-navy-600">{item.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <Dialog
        open={reminderDialog !== null}
        title={
          reminderDialog === "create"
            ? "Add personal reminder"
            : "Edit personal reminder"
        }
        description="This reminder is saved in browser storage and does not change official scholarship dates."
        onClose={() => setReminderDialog(null)}
      >
        <form onSubmit={saveReminder} className="space-y-4 overflow-y-auto p-5 sm:p-7">
          <div>
            <label
              htmlFor="calendar-reminder-title"
              className="text-xs font-semibold text-navy-800"
            >
              Reminder title
            </label>
            <input
              id="calendar-reminder-title"
              value={reminderTitle}
              onChange={(event) => setReminderTitle(event.target.value)}
              maxLength={100}
              required
              autoFocus
              className="mt-1.5 h-10 w-full rounded-lg border border-border px-3 text-sm text-navy-800"
              placeholder="e.g. Ask professor for a reference"
            />
          </div>
          <div>
            <label
              htmlFor="calendar-reminder-date"
              className="text-xs font-semibold text-navy-800"
            >
              Date
            </label>
            <input
              id="calendar-reminder-date"
              type="date"
              value={reminderDate}
              onChange={(event) => setReminderDate(event.target.value)}
              required
              className="mt-1.5 h-10 w-full rounded-lg border border-border px-3 text-sm text-navy-800"
            />
          </div>
          <div>
            <label
              htmlFor="calendar-reminder-application"
              className="text-xs font-semibold text-navy-800"
            >
              Link to application (optional)
            </label>
            <select
              id="calendar-reminder-application"
              value={reminderApplicationId}
              onChange={(event) => setReminderApplicationId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-navy-700"
            >
              <option value="">No application</option>
              {applications.map((application) => {
                const scholarship = scholarships.find(
                  (item) => item.id === application.scholarshipId,
                );
                return scholarship ? (
                  <option key={application.id} value={application.id}>
                    {scholarship.title}
                  </option>
                ) : null;
              })}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="calendar-reminder-notes"
                className="text-xs font-semibold text-navy-800"
              >
                Notes (optional)
              </label>
              <span className="text-[10px] text-navy-500">
                {reminderNotes.length}/1,000
              </span>
            </div>
            <textarea
              id="calendar-reminder-notes"
              value={reminderNotes}
              onChange={(event) => setReminderNotes(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1.5 w-full resize-y rounded-lg border border-border p-3 text-sm text-navy-800"
              placeholder="Add any details you want to remember."
            />
          </div>
          {reminderError && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
              {reminderError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {reminderDialog !== "create" && reminderDialog && (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-700 hover:bg-rose-50"
                leftIcon={<Trash2 size={14} aria-hidden="true" />}
                onClick={() => {
                  setDeleteReminderId(reminderDialog.id);
                  setReminderDialog(null);
                }}
              >
                Delete reminder
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReminderDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit" leftIcon={<CheckCircle2 size={15} aria-hidden="true" />}>
                {reminderDialog === "create" ? "Add reminder" : "Save reminder"}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(selectedEvent)}
        title={selectedEvent?.title ?? "Calendar event"}
        description={
          selectedEvent
            ? `${EVENT_TYPE_LABELS[selectedEvent.type]} · ${formatDate(selectedEvent.date)}`
            : undefined
        }
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <div className="space-y-4 overflow-y-auto p-5 sm:p-7">
            <div
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${EVENT_COLORS[selectedEvent.type]}`}
            >
              {EVENT_TYPE_LABELS[selectedEvent.type]}
            </div>
            <p className="text-sm text-navy-700">
              <span className="font-semibold">Date:</span>{" "}
              {formatDate(selectedEvent.date, { weekday: "long" })}
            </p>
            {selectedEvent.type === "scholarship-deadline" && (
              <p
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${URGENCY_CLASSES[getDeadlineUrgency(selectedEvent.date, now)]}`}
              >
                {formatCountdown(selectedEvent.date, now)}
              </p>
            )}
            {selectedEvent.scholarshipTitle && (
              <p className="text-sm text-navy-700">
                <span className="font-semibold">Scholarship:</span>{" "}
                {selectedEvent.scholarshipTitle}
              </p>
            )}
            {selectedEvent.applicationStatus && (
              <p className="text-sm capitalize text-navy-700">
                <span className="font-semibold not-capitalize">Application status:</span>{" "}
                {selectedEvent.applicationStatus.replace("-", " ")}
              </p>
            )}
            {selectedEvent.notes && (
              <p className="whitespace-pre-wrap rounded-xl bg-canvas p-3 text-sm leading-relaxed text-navy-600">
                {selectedEvent.notes}
              </p>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
              {selectedEvent.scholarshipId && (
                <Link to={`/scholarships/${selectedEvent.scholarshipId}`}>
                  <Button variant="secondary" size="sm">
                    View scholarship
                  </Button>
                </Link>
              )}
              {selectedEvent.applicationId && (
                <Link
                  to={`/applications?application=${encodeURIComponent(selectedEvent.applicationId)}`}
                >
                  <Button variant="secondary" size="sm">
                    View application
                  </Button>
                </Link>
              )}
              {!selectedEvent.readOnly && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Pencil size={14} aria-hidden="true" />}
                    onClick={() => {
                      const reminder = reminders.find(
                        (item) => item.id === selectedEvent.id,
                      );
                      setSelectedEvent(null);
                      if (reminder) openEditReminder(reminder);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      setDeleteReminderId(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(deleteReminderId)}
        title="Delete reminder?"
        description="This personal reminder will be removed from your browser calendar."
        onClose={() => setDeleteReminderId(null)}
      >
        <div className="flex justify-end gap-2 p-5 sm:p-7">
          <Button variant="secondary" onClick={() => setDeleteReminderId(null)}>
            Cancel
          </Button>
          <Button
            className="bg-rose-700 hover:bg-rose-800"
            leftIcon={<Trash2 size={14} aria-hidden="true" />}
            onClick={() =>
              deleteReminderId && deleteReminder(deleteReminderId)
            }
          >
            Delete reminder
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
