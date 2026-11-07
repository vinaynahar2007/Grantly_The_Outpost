import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Check,
  FileImage,
  FileText,
  Eye,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { useDocumentVault } from "@/context/DocumentVaultContext";
import { useStudentData } from "@/context/StudentDataContext";
import { useToast } from "@/context/ToastContext";
import { documentStorage } from "@/services/documentStorage";
import type { DocumentCategory, VaultDocument } from "@/types";
import {
  calculateDocumentMetrics,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  documentMatchesRequirement,
  effectiveDocumentStatus,
  formatFileSize,
  getApplicationDocumentReadiness,
  validateDocumentFile,
} from "@/utils/documentLogic";

type CategoryFilter = DocumentCategory | "all";

function categoryLabel(category: DocumentCategory): string {
  return (
    DOCUMENT_CATEGORIES.find((item) => item.id === category)?.label ??
    "Other supporting documents"
  );
}

function statusStyle(status: string): string {
  if (status === "verified")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pending-verification")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "expired")
    return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

export function DocumentsPage() {
  useDocumentTitle("Documents");
  const {
    documents,
    addDocument,
    replaceDocument,
    deleteDocument,
    updateDocument,
    setApplicationAssociation,
  } = useDocumentVault();
  const { applications, scholarships } = useStudentData();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<DocumentCategory>("transcript");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    document: VaultDocument;
    url: string;
  } | null>(null);
  const replaceInputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!preview) return;
    const url = preview.url;
    return () => URL.revokeObjectURL(url);
  }, [preview?.url]);

  const metrics = useMemo(() => calculateDocumentMetrics(documents), [documents]);
  const missingCategories = useMemo(
    () =>
      DOCUMENT_CATEGORIES.filter(
        (category) =>
          !documents.some(
            (document) =>
              document.category === category.id &&
              effectiveDocumentStatus(document) !== "expired",
          ),
      ),
    [documents],
  );
  const trackedApplications = useMemo(
    () =>
      applications.flatMap((application) => {
        const scholarship = scholarships.find(
          (item) => item.id === application.scholarshipId,
        );
        return scholarship ? [{ application, scholarship }] : [];
      }),
    [applications, scholarships],
  );
  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((document) => {
      const status = effectiveDocumentStatus(document);
      return (
        (categoryFilter === "all" || document.category === categoryFilter) &&
        (statusFilter === "all" || status === statusFilter) &&
        (!needle ||
          document.name.toLowerCase().includes(needle) ||
          categoryLabel(document.category).toLowerCase().includes(needle))
      );
    });
  }, [documents, query, categoryFilter, statusFilter]);

  const selectFile = (file?: File) => {
    if (!file) return;
    const error = validateDocumentFile(file);
    if (error) {
      setSelectedFile(null);
      setUploadError(error);
      setOperationError("");
      return;
    }
    setUploadError("");
    setOperationError("");
    setSelectedFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files[0]);
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile) {
      setUploadError("Choose a file before uploading.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      await addDocument(selectedFile, selectedCategory);
      showToast({
        title: "Document uploaded",
        description: `${selectedFile.name} is saved in this browser.`,
      });
      setSelectedFile(null);
      setAddOpen(false);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The document could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (document: VaultDocument) => {
    setOperationError("");
    try {
      const blob = await documentStorage.get(document.id);
      if (!blob) throw new Error("The file is missing from browser-local storage.");
      const url = URL.createObjectURL(blob);
      setPreview({ document, url });
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The file preview could not be opened.",
      );
    }
  };

  const closePreview = () => {
    setPreview(null);
  };

  const handleReplace = async (document: VaultDocument, file?: File) => {
    if (!file) return;
    const validationError = validateDocumentFile(file);
    if (validationError) {
      setOperationError(validationError);
      return;
    }
    setOperationError("");
    try {
      await replaceDocument(document.id, file);
      showToast({
        title: "Document replaced",
        description: `${file.name} is now saved in this browser.`,
      });
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The document could not be replaced.",
      );
    }
  };

  const handleDelete = async (document: VaultDocument) => {
    setOperationError("");
    try {
      await deleteDocument(document.id);
      setDeletingId(null);
      showToast({
        title: "Document deleted",
        description: `${document.name} was removed from this browser.`,
        tone: "info",
      });
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The document could not be deleted.",
      );
    }
  };

  const updateDocumentDetails = (
    documentId: string,
    updates: { status?: VaultDocument["status"]; expiresAt?: string | null },
  ) => {
    setOperationError("");
    try {
      updateDocument(documentId, updates);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Document details could not be saved.",
      );
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Document Vault"
        badgeText="Browser-local"
        description="Keep application files organized and ready to associate with tracked scholarships."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setUploadError("");
              setAddOpen(true);
            }}
          >
            Add document
          </Button>
        }
      />

      <div
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
        role="note"
      >
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs leading-relaxed">
          Files and details are stored only in this browser (files in IndexedDB;
          details in local storage). This is not secure cloud storage, encrypted
          backup, or a substitute for keeping your own copies.
        </p>
        <p className="mt-2 text-xs leading-relaxed">
          Verification labels are managed by you. GRANTLY does not check
          documents with a school or provider; “Verified” means you marked the
          status, not institutional verification.
        </p>
      </div>

      <section
        aria-label="Document statistics"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {[
          { label: "Total documents", value: metrics.total },
          { label: "Uploaded", value: metrics.uploaded },
          { label: "Missing categories", value: metrics.missing },
          { label: "Pending verification", value: metrics.pendingVerification },
          { label: "Completion", value: `${metrics.completion}%` },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs font-medium text-navy-500">{item.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-navy-900 tabular-nums">
              {item.value}
            </p>
            {item.label === "Completion" && (
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle"
                role="progressbar"
                aria-label="Document category completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={metrics.completion}
              >
                <div
                  className="h-full rounded-full bg-violet-700 transition-all"
                  style={{ width: `${metrics.completion}%` }}
                />
              </div>
            )}
          </Card>
        ))}
      </section>

      {missingCategories.length > 0 && (
        <section aria-labelledby="missing-categories-heading">
          <div className="mb-3">
            <h2
              id="missing-categories-heading"
              className="font-display text-base font-bold text-navy-900"
            >
              Missing document categories
            </h2>
            <p className="mt-1 text-xs text-navy-500">
              These categories have no current, non-expired files in your vault.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {missingCategories.map((category) => (
              <Card
                key={category.id}
                className="flex items-start justify-between gap-3 p-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-navy-800">
                    {category.label}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-navy-500">
                    {category.description}
                  </p>
                  <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                    Missing
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedFile(null);
                    setUploadError("");
                    setAddOpen(true);
                  }}
                  aria-label={`Add ${category.label}`}
                >
                  Add file
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="vault-documents-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="vault-documents-heading"
              className="font-display text-lg font-bold text-navy-900"
            >
              Your documents
            </h2>
            <p className="mt-1 text-xs text-navy-500">
              Add files, review statuses, and connect them to applications.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="sr-only" htmlFor="document-search">
              Search documents
            </label>
            <input
              id="document-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents"
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-navy-800 placeholder:text-navy-400 sm:w-56"
            />
            <label className="sr-only" htmlFor="document-status-filter">
              Filter by status
            </label>
            <select
              id="document-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-navy-700"
            >
              <option value="all">All statuses</option>
              {DOCUMENT_STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter documents by category"
          className="mb-4 flex gap-2 overflow-x-auto pb-2"
        >
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            aria-pressed={categoryFilter === "all"}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${categoryFilter === "all" ? "border-violet-700 bg-violet-50 text-violet-800" : "border-border bg-white text-navy-600 hover:bg-canvas"}`}
          >
            All categories
          </button>
          {DOCUMENT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryFilter(category.id)}
              aria-pressed={categoryFilter === category.id}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${categoryFilter === category.id ? "border-violet-700 bg-violet-50 text-violet-800" : "border-border bg-white text-navy-600 hover:bg-canvas"}`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {operationError && (
          <p
            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            role="alert"
          >
            {operationError}
          </p>
        )}

        {filteredDocuments.length === 0 ? (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-navy-900">
              {documents.length === 0
                ? "Your vault is ready for its first document"
                : "No documents match these filters"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-500">
              {documents.length === 0
                ? "Upload a transcript, certificate, or statement to start organizing your application materials."
                : "Try another search or category, or clear the current filters."}
            </p>
            {documents.length === 0 ? (
              <Button
                className="mt-5"
                onClick={() => setAddOpen(true)}
                leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
              >
                Upload a document
              </Button>
            ) : (
              <Button
                className="mt-5"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredDocuments.map((document) => {
              const status = effectiveDocumentStatus(document);
              const icon =
                document.mimeType === "application/pdf" ? FileText : FileImage;
              const Icon = icon;
              const availableApplications = trackedApplications.filter(
                ({ application }) =>
                  !document.associatedApplicationIds.includes(application.id),
              );
              return (
                <Card key={document.id} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-semibold text-navy-900">
                        {document.name}
                      </p>
                      <p className="mt-1 text-xs text-navy-500">
                        {categoryLabel(document.category)} ·{" "}
                        {formatFileSize(document.size)}
                      </p>
                      <p className="mt-1 text-[11px] text-navy-400">
                        Updated {new Date(document.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle(status)}`}
                    >
                      {DOCUMENT_STATUSES.find((item) => item.id === status)?.label}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`status-${document.id}`}
                        className="text-[11px] font-semibold text-navy-700"
                      >
                        Document status
                      </label>
                      <select
                        id={`status-${document.id}`}
                        value={status}
                        onChange={(event) =>
                          updateDocumentDetails(document.id, {
                            status: event.target.value as VaultDocument["status"],
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-border bg-white px-2.5 text-xs text-navy-700"
                      >
                        {DOCUMENT_STATUSES.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`expiry-${document.id}`}
                        className="text-[11px] font-semibold text-navy-700"
                      >
                        Expiration date (optional)
                      </label>
                      <input
                        id={`expiry-${document.id}`}
                        type="date"
                        value={document.expiresAt ?? ""}
                        onChange={(event) =>
                          updateDocumentDetails(document.id, {
                            expiresAt: event.target.value || null,
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-border bg-white px-2.5 text-xs text-navy-700"
                      />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <label
                      htmlFor={`associate-${document.id}`}
                      className="text-[11px] font-semibold text-navy-700"
                    >
                      Associate with application
                    </label>
                    <select
                      id={`associate-${document.id}`}
                      value=""
                      onChange={(event) => {
                        if (!event.target.value) return;
                        setOperationError("");
                        try {
                          setApplicationAssociation(
                            document.id,
                            event.target.value,
                            true,
                          );
                        } catch (error) {
                          setOperationError(
                            error instanceof Error
                              ? error.message
                              : "The application association could not be saved.",
                          );
                        }
                      }}
                      className="mt-1.5 h-9 w-full rounded-lg border border-border bg-white px-2.5 text-xs text-navy-700"
                    >
                      <option value="">
                        {availableApplications.length
                          ? "Choose an application"
                          : "No more applications available"}
                      </option>
                      {availableApplications.map(({ application, scholarship }) => (
                        <option key={application.id} value={application.id}>
                          {scholarship.title}
                        </option>
                      ))}
                    </select>
                    {document.associatedApplicationIds.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {document.associatedApplicationIds.map((applicationId) => {
                          const tracked = trackedApplications.find(
                            (item) => item.application.id === applicationId,
                          );
                          return (
                            <li
                              key={applicationId}
                              className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 py-1 pl-2.5 pr-1 text-[10px] font-medium text-violet-800"
                            >
                              <span className="truncate">
                                {tracked?.scholarship.title ?? "Application no longer tracked"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    setApplicationAssociation(
                                      document.id,
                                      applicationId,
                                      false,
                                    );
                                  } catch (error) {
                                    setOperationError(
                                      error instanceof Error
                                        ? error.message
                                        : "The application association could not be removed.",
                                    );
                                  }
                                }}
                                aria-label={`Remove ${tracked?.scholarship.title ?? "application"} association from ${document.name}`}
                                className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-violet-100"
                              >
                                <X size={12} aria-hidden="true" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => void openPreview(document)}
                    >
                      Preview
                    </Button>
                    <input
                      ref={(node) => {
                        if (node) replaceInputs.current.set(document.id, node);
                        else replaceInputs.current.delete(document.id);
                      }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="sr-only"
                      aria-label={`Choose replacement file for ${document.name}`}
                      onChange={(event) => {
                        void handleReplace(document, event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => replaceInputs.current.get(document.id)?.click()}
                    >
                      Replace
                    </Button>
                    {deletingId === document.id ? (
                      <>
                        <span className="text-[11px] text-rose-700">
                          Delete this file?
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-rose-700 hover:bg-rose-800"
                          onClick={() => void handleDelete(document)}
                        >
                          Confirm delete
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={() => setDeletingId(document.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="application-documents-heading">
        <div className="mb-4">
          <h2
            id="application-documents-heading"
            className="font-display text-lg font-bold text-navy-900"
          >
            Application requirements
          </h2>
          <p className="mt-1 text-xs text-navy-500">
            Required items come from each scholarship in your application tracker.
          </p>
        </div>
        {trackedApplications.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-navy-600">
              No applications are being tracked yet. Track a scholarship to see
              its required documents here.
            </p>
            <Link
              to="/applications"
              className="mt-3 inline-block text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
            >
              Open Application Tracker
            </Link>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {trackedApplications.map(({ application, scholarship }) => {
              const readiness = getApplicationDocumentReadiness(
                scholarship,
                documents,
                application.id,
              );
              return (
                <Card key={application.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-navy-900">
                        {scholarship.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-navy-500">
                        {readiness.ready.length} of{" "}
                        {scholarship.requiredDocuments.length} required documents
                        linked
                      </p>
                    </div>
                    <Link
                      to={`/applications?application=${encodeURIComponent(application.id)}`}
                      className="shrink-0 text-[11px] font-semibold text-violet-700 underline-offset-2 hover:underline"
                    >
                      View tracker
                    </Link>
                  </div>
                  {readiness.missing.length > 0 ? (
                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                      <AlertTriangle
                        size={14}
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        Missing documents: {readiness.missing.join(", ")}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
                      <Check size={14} aria-hidden="true" />
                      All listed requirements have linked, non-expired files.
                    </p>
                  )}
                  <ul className="mt-3 space-y-1.5">
                    {scholarship.requiredDocuments.map((required) => {
                      const matched = readiness.attached.filter((document) =>
                        documentMatchesRequirement(document, required),
                      );
                      return (
                        <li
                          key={required}
                          className="flex items-start gap-2 text-[11px] text-navy-600"
                        >
                          {matched.length > 0 ? (
                            <Check
                              size={13}
                              className="mt-0.5 shrink-0 text-emerald-700"
                              aria-hidden="true"
                            />
                          ) : (
                            <AlertTriangle
                              size={13}
                              className="mt-0.5 shrink-0 text-amber-700"
                              aria-hidden="true"
                            />
                          )}
                          <span>
                            <span className="font-medium text-navy-800">
                              {required}
                            </span>
                            {matched.length > 0 && (
                              <span className="text-navy-500">
                                {" "}
                                — {matched.map((document) => document.name).join(", ")}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={addOpen}
        title="Add a document"
        description="Choose a category and select a PDF or image to save in this browser."
        onClose={() => {
          if (!uploading) setAddOpen(false);
        }}
      >
        <div className="space-y-5 overflow-y-auto p-5 sm:p-7">
          <div>
            <label
              htmlFor="new-document-category"
              className="text-xs font-semibold text-navy-800"
            >
              Document category
            </label>
            <select
              id="new-document-category"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value as DocumentCategory)
              }
              className="mt-2 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-navy-700"
            >
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 ${dragActive ? "border-violet-600 bg-violet-50" : "border-border bg-canvas hover:border-violet-400 hover:bg-violet-50/50"}`}
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              aria-label="Choose a PDF, JPG, JPEG, or PNG document"
              onChange={(event) => selectFile(event.currentTarget.files?.[0])}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              disabled={uploading}
            />
            <span className="flex size-11 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-3 text-sm font-semibold text-navy-800">
              {selectedFile ? selectedFile.name : "Drop a file here or browse"}
            </span>
            <span className="mt-1 text-xs text-navy-500">
              PDF, JPG, JPEG, or PNG · up to 10 MB
            </span>
            {selectedFile && (
              <span className="mt-2 text-xs font-medium text-violet-700">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
          </label>
          {uploadError && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800"
            >
              {uploadError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setAddOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void uploadSelectedFile()}
              isLoading={uploading}
              leftIcon={!uploading ? <Upload size={15} aria-hidden="true" /> : undefined}
            >
              Upload document
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(preview)}
        title={preview?.document.name ?? "Document preview"}
        description={
          preview
            ? `${categoryLabel(preview.document.category)} · ${formatFileSize(preview.document.size)}`
            : undefined
        }
        onClose={closePreview}
        className="max-w-4xl"
      >
        {preview && (
          <div className="min-h-0 flex-1 overflow-auto bg-canvas p-3 sm:p-5">
            {preview.document.mimeType === "application/pdf" ? (
              <iframe
                src={preview.url}
                title={`Preview of ${preview.document.name}`}
                className="h-[65dvh] min-h-80 w-full rounded-lg border border-border bg-white"
              />
            ) : (
              <img
                src={preview.url}
                alt={`Preview of ${preview.document.name}`}
                className="mx-auto max-h-[65dvh] max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
