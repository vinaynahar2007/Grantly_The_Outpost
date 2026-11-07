import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, Trash2, X, ArrowRight } from "lucide-react";
import type { EligibilityResult, Scholarship } from "@/types";
import { Button } from "@/components/ui";
import { evaluateDeadline, formatDisplayDate } from "@/utils/dashboardLogic";
import { formatAmountRange } from "@/utils/explorerLogic";
import { ScholarshipEmptyState } from "./ScholarshipEmptyState";
import { cn } from "@/utils/cn";

export interface CompareBarProps {
  scholarships: Scholarship[];
  onOpenCompare: () => void;
  onRemove: (scholarshipId: string) => void;
  onClear: () => void;
}

export function CompareBar({ scholarships, onOpenCompare, onRemove, onClear }: CompareBarProps) {
  if (scholarships.length === 0) return null;

  return (
    <div
      className="sticky bottom-4 z-30 mt-6 flex flex-col gap-3 rounded-2xl border border-[#DDD6FE] bg-white p-4 shadow-[0_16px_36px_-12px_rgb(76_29_149/0.25)] sm:flex-row sm:items-center sm:justify-between"
      aria-label="Scholarship comparison tray"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
          <Scale className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
          Compare ({scholarships.length}/3)
        </span>
        {scholarships.map((scholarship) => (
          <span
            key={scholarship.id}
            className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8F9FC] py-1 pr-1.5 pl-3 text-xs font-medium text-[#334155]"
          >
            <span className="truncate">{scholarship.title}</span>
            <button
              type="button"
              onClick={() => onRemove(scholarship.id)}
              aria-label={`Remove ${scholarship.title} from comparison`}
              className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button variant="primary" size="sm" onClick={onOpenCompare}>
          Compare Now
        </Button>
      </div>
    </div>
  );
}

export interface CompareScholarshipsProps {
  isOpen: boolean;
  scholarships: Scholarship[];
  eligibilityById: Map<string, EligibilityResult>;
  onClose: () => void;
  onRemove: (scholarshipId: string) => void;
  onClear: () => void;
}

interface CompareRow {
  label: string;
  render: (scholarship: Scholarship) => React.ReactNode;
}

export function CompareScholarships({
  isOpen,
  scholarships,
  eligibilityById,
  onClose,
  onRemove,
  onClear,
}: CompareScholarshipsProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rows: CompareRow[] = [
    { label: "Award amount", render: (s) => formatAmountRange(s) },
    {
      label: "Deadline",
      render: (s) => {
        const info = evaluateDeadline(s.deadline);
        return `${info.formattedDate} (${info.remainingDays < 0 ? "Closed" : `${info.remainingDays} days left`})`;
      },
    },
    { label: "Education level", render: (s) => s.educationLevels.join(" / ") },
    {
      label: "Eligibility",
      render: (s) => {
        const result = eligibilityById.get(s.id);
        return result ? `${result.percentage}% · ${result.status}` : "Not calculated";
      },
    },
    { label: "Required documents", render: (s) => `${s.requiredDocuments.length} documents` },
    { label: "Location", render: (s) => s.location },
    { label: "Scholarship category", render: (s) => s.category },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Compare scholarships"
    >
      <div
        className="fixed inset-0 bg-[#0F172A]/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#EEF2F6] p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Compare Scholarships
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Side-by-side comparison of up to three demonstration scholarships.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F4F9] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {scholarships.length === 0 ? (
            <ScholarshipEmptyState
              icon={Scale}
              title="No Comparison Selections"
              description="Select Compare on up to three scholarship cards to review them side by side here."
              action={
                <Button variant="primary" size="md" onClick={onClose}>
                  Explore Scholarships
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="w-[160px] p-3 text-xs text-[#64748B]">
                        Criteria
                      </th>
                      {scholarships.map((scholarship) => (
                        <th key={scholarship.id} scope="col" className="min-w-[180px] p-3 align-top">
                          <div className="font-display text-sm font-semibold text-[#0F172A]">
                            {scholarship.title}
                          </div>
                          <div className="mt-0.5 text-xs font-normal text-[#64748B]">
                            {scholarship.provider}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Link to={`/scholarships/${scholarship.id}`} onClick={onClose}>
                              <Button variant="subtle" size="sm">
                                View Details
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemove(scholarship.id)}
                              leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            >
                              Remove
                            </Button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={row.label}
                        className={cn(index % 2 === 0 ? "bg-[#F8F9FC]" : "bg-white")}
                      >
                        <th scope="row" className="p-3 text-xs font-semibold text-[#334155]">
                          {row.label}
                        </th>
                        {scholarships.map((scholarship) => (
                          <td key={scholarship.id} className="p-3 text-xs text-[#0F172A]">
                            {row.label === "Required documents" ? (
                              <div>
                                <div className="font-medium">{row.render(scholarship)}</div>
                                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[#64748B]">
                                  {scholarship.requiredDocuments.map((doc) => (
                                    <li key={doc}>{doc}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              row.render(scholarship)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="p-3 text-xs font-semibold text-[#334155]">
                        Record added
                      </th>
                      {scholarships.map((scholarship) => (
                        <td key={scholarship.id} className="p-3 text-xs text-[#64748B]">
                          {formatDisplayDate(scholarship.dateAdded)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked comparison */}
              <div className="space-y-4 md:hidden">
                {scholarships.map((scholarship) => (
                  <article
                    key={scholarship.id}
                    className="rounded-2xl border border-[#E2E8F0] p-4"
                    aria-label={`Comparison details for ${scholarship.title}`}
                  >
                    <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                      {scholarship.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#64748B]">{scholarship.provider}</p>
                    <dl className="mt-3 space-y-2">
                      {rows.map((row) => (
                        <div key={row.label} className="flex justify-between gap-3 text-xs">
                          <dt className="font-medium text-[#64748B]">{row.label}</dt>
                          <dd className="text-right font-medium text-[#0F172A]">
                            {row.label === "Required documents"
                              ? scholarship.requiredDocuments.join(", ")
                              : row.render(scholarship)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex gap-2 border-t border-[#EEF2F6] pt-3">
                      <Link to={`/scholarships/${scholarship.id}`} onClick={onClose} className="flex-1">
                        <Button variant="subtle" size="sm" fullWidth>
                          View Details
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(scholarship.id)}
                        leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-4">
                <p className="inline-flex items-center gap-1.5 text-xs text-[#64748B]">
                  Comparing {scholarships.length} of 3 scholarships
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  selections persist in your browser
                </p>
                <Button variant="secondary" size="sm" onClick={onClear}>
                  Clear Comparison
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
