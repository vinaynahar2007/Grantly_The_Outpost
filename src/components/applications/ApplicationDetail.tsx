import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  History,
  Info,
  Save,
  Trash2,
  Undo2,
  FileText,
  CircleCheck,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { useStudentData } from "@/context/StudentDataContext";
import { useDocumentVault } from "@/context/DocumentVaultContext";
import {
  APPLICATION_STATUSES,
  KANBAN_STATUSES,
  isActiveApplication,
} from "@/data/applicationStatuses";
import { localDateValue } from "@/utils/applicationLogic";
import { formatDisplayDate, formatINR } from "@/utils/dashboardLogic";
import { cn } from "@/utils/cn";
import type { ApplicationStatus, TrackedApplication } from "@/types";
import {
  effectiveDocumentStatus,
  getApplicationDocumentReadiness,
} from "@/utils/documentLogic";
import { StatusSelect } from "./ApplicationStatus";
import { ApplicationDeadline } from "./ApplicationDeadline";
import { ScholarshipMonogram } from "./ApplicationList";

export function ApplicationDetail({
  record,
  now,
  onClose,
  edit = false,
}: {
  record: TrackedApplication;
  now: Date;
  onClose: () => void;
  edit?: boolean;
}) {
  const { updateApplication, deleteApplication, eligibilityById } =
    useStudentData();
  const { documents: vaultDocuments } = useDocumentVault();
  const { application: app, scholarship } = record;
  const [status, setStatus] = useState<ApplicationStatus>(app.status);
  const [notes, setNotes] = useState(app.notes);
  const [submittedAt, setSubmittedAt] = useState(app.submittedAt ?? "");
  const [reminderDate, setReminderDate] = useState(app.reminderDate ?? "");
  const [documents, setDocuments] = useState(app.completedDocuments);
  const [tab, setTab] = useState<"details" | "history">("details");
  const [confirmation, setConfirmation] = useState<
    "delete" | "withdraw" | "discard" | null
  >(null);
  const [error, setError] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const dirty =
    status !== app.status ||
    notes !== app.notes ||
    submittedAt !== (app.submittedAt ?? "") ||
    reminderDate !== (app.reminderDate ?? "") ||
    JSON.stringify(documents) !== JSON.stringify(app.completedDocuments);
  const eligibility = eligibilityById.get(scholarship.id);
  const documentReadiness = getApplicationDocumentReadiness(
    scholarship,
    vaultDocuments,
    app.id,
  );
  useEffect(() => {
    if (edit) {
      const timer = window.setTimeout(() => noteRef.current?.focus(), 100);
      return () => window.clearTimeout(timer);
    }
  }, [edit]);
  const close = () => (dirty ? setConfirmation("discard") : onClose());
  const save = (event: FormEvent) => {
    event.preventDefault();
    const ok = updateApplication(app.id, {
      status,
      notes,
      submittedAt: submittedAt || null,
      reminderDate: reminderDate || null,
      completedDocuments: documents,
    });
    if (ok) {
      setError("");
      onClose();
    } else
      setError(
        "Your changes could not be saved. Check the notification for details.",
      );
  };
  const officialUrl =
    scholarship.officialUrl && /^https:\/\//.test(scholarship.officialUrl)
      ? scholarship.officialUrl
      : null;

  return (
    <Dialog
      open
      title="Application details"
      description={`Record ${app.id}`}
      onClose={close}
      drawer
    >
      <div className="shrink-0 px-5 pt-5 sm:px-7">
        <div className="flex items-start gap-3">
          <ScholarshipMonogram title={scholarship.title} />
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold leading-snug text-navy-900">
              {scholarship.title}
            </h3>
            <p className="mt-1 text-xs text-navy-500">{scholarship.provider}</p>
            <p className="mt-2 text-sm font-semibold text-violet-700">
              {formatINR(scholarship.amount)}{" "}
              <span className="text-[11px] font-normal text-navy-500">
                potential award · demo record
              </span>
            </p>
          </div>
        </div>
        <div
          className="mt-5 flex gap-6 border-b border-border-subtle"
          role="group"
          aria-label="Application detail view"
        >
          {[
            { id: "details" as const, label: "Overview" },
            {
              id: "history" as const,
              label: `History (${app.history.length})`,
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={cn(
                "relative pb-3 text-xs font-semibold",
                tab === item.id
                  ? "text-violet-700 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-violet-700"
                  : "text-navy-500 hover:text-navy-900",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {confirmation && (
            <div
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4"
              role="alert"
            >
              <p className="text-sm font-semibold text-rose-800">
                {confirmation === "delete"
                  ? "Delete this application?"
                  : confirmation === "withdraw"
                    ? "Withdraw this application?"
                    : "Discard your unsaved changes?"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-rose-700">
                {confirmation === "delete"
                  ? "This permanently removes its notes and history. The scholarship and your bookmarks will stay."
                  : confirmation === "withdraw"
                    ? "It will move to completed applications. Its notes and history will be kept."
                    : "Only saved changes are kept in your browser."}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirmation(null)}
                >
                  Keep editing
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmation === "delete") {
                      deleteApplication(app.id);
                      onClose();
                    } else if (confirmation === "withdraw") {
                      if (updateApplication(app.id, { status: "withdrawn" }))
                        onClose();
                    } else onClose();
                  }}
                  className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"
                >
                  {confirmation === "delete"
                    ? "Delete application"
                    : confirmation === "withdraw"
                      ? "Confirm withdrawal"
                      : "Discard changes"}
                </button>
              </div>
            </div>
          )}

          {tab === "details" ? (
            <div className="space-y-6">
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label
                    htmlFor="application-detail-status"
                    className="text-xs font-semibold text-navy-800"
                  >
                    Current status
                  </label>
                  <StatusSelect
                    id="application-detail-status"
                    status={status}
                    label="Application status"
                    onChange={setStatus}
                  />
                </div>
                <div
                  className="mt-4 flex items-center gap-1.5"
                  aria-label="Application journey stages"
                >
                  {KANBAN_STATUSES.map((key) => (
                    <span
                      key={key}
                      title={APPLICATION_STATUSES[key].label}
                      className="h-1.5 flex-1 rounded-full"
                      style={{
                        background:
                          APPLICATION_STATUSES[status].progress >=
                            APPLICATION_STATUSES[key].progress &&
                          status !== "rejected" &&
                          status !== "withdrawn"
                            ? APPLICATION_STATUSES[status].color
                            : "#EEF2F6",
                      }}
                    />
                  ))}
                </div>
              </section>
              <dl className="grid grid-cols-2 gap-4 rounded-xl bg-canvas p-4">
                <div>
                  <dt className="mb-1.5 text-[10px] font-semibold tracking-wide text-navy-500 uppercase">
                    Application deadline
                  </dt>
                  <dd>
                    <ApplicationDeadline record={record} now={now} />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1.5 text-[10px] font-semibold tracking-wide text-navy-500 uppercase">
                    Date added
                  </dt>
                  <dd className="text-xs text-navy-700">
                    {app.createdAt
                      ? formatDisplayDate(app.createdAt)
                      : "Not recorded (legacy)"}
                  </dd>
                  <dt className="mt-3 text-[10px] text-navy-500">
                    Last updated
                  </dt>
                  <dd className="mt-1 text-xs text-navy-700">
                    {formatDisplayDate(app.updatedAt)}
                  </dd>
                </div>
              </dl>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="application-submission"
                    className="text-xs font-semibold text-navy-800"
                  >
                    Submission date
                  </label>
                  <input
                    id="application-submission"
                    type="date"
                    value={submittedAt}
                    max={localDateValue(now)}
                    onChange={(event) => setSubmittedAt(event.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm text-navy-700"
                  />
                  <p className="mt-1.5 text-[10px] leading-relaxed text-navy-500">
                    Record the actual date. Changing status does not invent one.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="application-reminder"
                    className="text-xs font-semibold text-navy-800"
                  >
                    Personal reminder date
                  </label>
                  <input
                    id="application-reminder"
                    type="date"
                    value={reminderDate}
                    onChange={(event) => setReminderDate(event.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm text-navy-700"
                  />
                  <p className="mt-1.5 text-[10px] leading-relaxed text-navy-500">
                    Stored in your tracker; no notifications are sent.
                  </p>
                </div>
              </div>
              <div>
                <div className="flex justify-between gap-2">
                  <label
                    htmlFor="application-notes"
                    className="text-xs font-semibold text-navy-800"
                  >
                    Personal notes
                  </label>
                  <span className="text-[10px] text-navy-500 tabular-nums">
                    {notes.length}/5,000
                  </span>
                </div>
                <textarea
                  ref={noteRef}
                  id="application-notes"
                  value={notes}
                  maxLength={5000}
                  rows={4}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Essay ideas, conversations, things to remember..."
                  className="mt-2 w-full resize-y rounded-xl border border-border p-3 text-sm leading-relaxed text-navy-700 placeholder:text-navy-500 focus:border-violet-400 focus:outline-none"
                />
              </div>
              <fieldset>
                <legend className="mb-3 flex w-full items-center justify-between text-xs font-semibold text-navy-800">
                  <span>Required documents</span>
                  <span className="text-[10px] font-medium text-navy-500">
                    {documents.length}/{scholarship.requiredDocuments.length}{" "}
                    ready
                  </span>
                </legend>
                <div className="space-y-2">
                  {scholarship.requiredDocuments.map((doc) => (
                    <label
                      key={doc}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-subtle px-3 py-3 text-xs text-navy-600 hover:bg-canvas"
                    >
                      <input
                        type="checkbox"
                        checked={documents.includes(doc)}
                        onChange={() =>
                          setDocuments((prev) =>
                            prev.includes(doc)
                              ? prev.filter((item) => item !== doc)
                              : [...prev, doc],
                          )
                        }
                        className="size-4 rounded accent-violet-700"
                      />
                      <FileText
                        size={14}
                        className="shrink-0 text-navy-500"
                        aria-hidden="true"
                      />
                      <span>{doc}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-navy-500">
                  A personal readiness checklist, not a document upload or
                  verification.
                </p>
              </fieldset>
              <section
                aria-label="Document vault readiness"
                className="rounded-xl border border-border-subtle bg-canvas p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-navy-800">
                      Document vault
                    </h4>
                    <p className="mt-1 text-[11px] text-navy-500">
                      {documentReadiness.ready.length} of{" "}
                      {scholarship.requiredDocuments.length} required items
                      linked to files.
                    </p>
                  </div>
                  <Link
                    to="/documents"
                    className="text-[11px] font-semibold text-violet-700 underline-offset-2 hover:underline"
                  >
                    Manage documents
                  </Link>
                </div>
                {documentReadiness.missing.length > 0 && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    Missing vault documents:{" "}
                    {documentReadiness.missing.join(", ")}.
                  </p>
                )}
                {documentReadiness.attached.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {documentReadiness.attached.map((document) => (
                      <li
                        key={document.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="min-w-0 truncate font-medium text-navy-700">
                          {document.name}
                        </span>
                        <span className="text-navy-500">
                          {effectiveDocumentStatus(document) ===
                          "pending-verification"
                            ? "Pending Verification"
                            : effectiveDocumentStatus(document) === "verified"
                              ? "Verified"
                              : "Uploaded"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {eligibility && (
                <div className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-[11px] leading-relaxed text-violet-800">
                  <CircleCheck
                    size={15}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    {eligibility.percentage}% profile fit in Explorer.{" "}
                    <Link
                      to="/eligibility"
                      className="font-semibold underline underline-offset-2"
                    >
                      Review Smart Match
                    </Link>{" "}
                    for the full rule breakdown.
                  </p>
                </div>
              )}
              <section className="border-t border-border-subtle pt-4">
                <h4 className="text-xs font-semibold text-navy-800">
                  Application information
                </h4>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    to={`/scholarships/${scholarship.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
                  >
                    Scholarship details{" "}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                  {officialUrl ? (
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
                    >
                      Official application{" "}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-navy-500">
                      <Info size={12} aria-hidden="true" />
                      Official application URL unavailable for this demo.
                    </span>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <section aria-label="Application history">
              <div className="mb-5 flex items-center gap-2">
                <History
                  size={16}
                  className="text-violet-600"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-navy-800">
                  Your application, step by step
                </h3>
              </div>
              {app.history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Clock3
                    className="mx-auto mb-3 size-7 text-navy-500"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-navy-800">
                    History starts with your next change
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-navy-500">
                    This existing record has no earlier recorded events. GRANTLY
                    will not invent a past timeline.
                  </p>
                </div>
              ) : (
                <ol className="ml-2 border-l border-violet-200">
                  {app.history.map((event, index) => (
                    <li key={event.id} className="relative pb-6 pl-6 last:pb-0">
                      <span
                        className={cn(
                          "absolute top-0.5 -left-[5px] size-[9px] rounded-full ring-4 ring-white",
                          index === app.history.length - 1
                            ? "bg-violet-600"
                            : "bg-violet-200",
                        )}
                      />
                      <p className="text-xs font-semibold leading-relaxed text-navy-800">
                        {event.description}
                      </p>
                      <time
                        dateTime={event.timestamp}
                        className="mt-1 block text-[10px] text-navy-500"
                      >
                        {new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(event.timestamp))}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
            {isActiveApplication(app.status) && (
              <button
                type="button"
                onClick={() => setConfirmation("withdraw")}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-navy-500 hover:text-rose-700"
              >
                <Undo2 size={13} aria-hidden="true" />
                Withdraw application
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmation("delete")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-700 hover:text-rose-800"
            >
              <Trash2 size={13} aria-hidden="true" />
              Delete application
            </button>
          </div>
          {error && (
            <p className="mt-4 text-xs text-rose-700" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-canvas/50 px-5 py-4 sm:px-7">
          <span className="inline-flex items-center gap-1 text-[10px] text-navy-500">
            <CalendarDays size={12} aria-hidden="true" />
            {dirty ? "Unsaved changes" : "Saved in this browser"}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Button
              type="submit"
              leftIcon={<Save size={15} aria-hidden="true" />}
            >
              Save changes
            </Button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
