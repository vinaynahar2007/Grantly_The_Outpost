import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  CircleAlert,
  ListChecks,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ScholarshipMatch } from "@/types";
import { Card } from "@/components/ui";
import { evaluateDeadline, formatINR } from "@/utils/dashboardLogic";
import { MATCHER_FIELD_LABELS } from "@/services/matchingEngine";
import { MatchRing } from "./MatchRing";
import { MATCH_CATEGORY_TOKENS } from "./matchTokens";
import { cn } from "@/utils/cn";

export interface MatchCardProps {
  match: ScholarshipMatch;
  isSaved: boolean;
  onToggleSave: (scholarshipId: string) => void;
  onOpenBreakdown: (scholarshipId: string) => void;
  index?: number;
}

function CriterionChips({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "met" | "missing" | "failed";
}) {
  const toneClasses = {
    met: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
    missing: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
    failed: "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C]",
  }[tone];

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.06em] text-[#64748B] uppercase">
        {label} · <span className="tabular-nums">{items.length}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {items.length === 0 ? (
          <span className="text-[11px] text-[#94A3B8]">None</span>
        ) : (
          <>
            {items.slice(0, 2).map((item) => (
              <span
                key={item}
                className={cn(
                  "inline-flex max-w-full items-center truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  toneClasses
                )}
              >
                {item}
              </span>
            ))}
            {items.length > 2 && (
              <span className="inline-flex items-center rounded-md border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#64748B] tabular-nums">
                +{items.length - 2}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function MatchCard({
  match,
  isSaved,
  onToggleSave,
  onOpenBreakdown,
  index = 0,
}: MatchCardProps) {
  const reduceMotion = useReducedMotion();
  const token = MATCH_CATEGORY_TOKENS[match.category];
  const CategoryIcon = token.icon;
  const deadline = evaluateDeadline(match.scholarship.deadline);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.28) }}
    >
      <Card
        interactive
        className="flex h-full flex-col p-5"
        style={{ borderLeft: `3px solid ${token.color}` }}
      >
        <div className="flex items-start gap-4">
          <MatchRing score={match.score} category={match.category} size={64} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-[15px] leading-snug font-semibold text-[#0F172A]">
                <Link
                  to={`/scholarships/${match.scholarship.id}`}
                  className="hover:text-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                >
                  {match.scholarship.title}
                </Link>
              </h3>
              <button
                type="button"
                onClick={() => onToggleSave(match.scholarship.id)}
                aria-pressed={isSaved}
                aria-label={
                  isSaved
                    ? `Remove ${match.scholarship.title} from saved scholarships`
                    : `Save ${match.scholarship.title}`
                }
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  isSaved
                    ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE]"
                    : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8F9FC] hover:text-[#0F172A]"
                )}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Bookmark className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-[#64748B]">
              {match.scholarship.provider}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  token.soft,
                  token.border,
                  token.text
                )}
              >
                <CategoryIcon className="h-3 w-3" aria-hidden="true" />
                {token.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#F8F9FC] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
                {match.eligibilityStatus}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#64748B] uppercase">
                Demo
              </span>
            </div>
          </div>
        </div>

        {/* Facts */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] px-3 py-2.5">
          <span className="font-display text-base font-bold text-[#0F172A] tabular-nums">
            {formatINR(match.scholarship.amount)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#475569]">
            <CalendarClock className="h-3.5 w-3.5 text-[#6D28D9]" aria-hidden="true" />
            {deadline.formattedDate} ·{" "}
            {deadline.remainingDays < 0 ? "Closed" : `${deadline.remainingDays}d left`}
          </span>
        </div>

        {/* Explanation */}
        <p className="mt-3 text-xs leading-relaxed text-[#475569]">{match.explanation}</p>

        {/* Criteria summary */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#EEF2F6] pt-3">
          <CriterionChips
            label="Met"
            items={match.matched.map((c) => c.label)}
            tone="met"
          />
          <CriterionChips
            label="Missing"
            items={match.criteria
              .filter((c) => c.state === "needs-information")
              .map((c) => c.label)}
            tone="missing"
          />
          <CriterionChips
            label="Failed"
            items={match.criteria.filter((c) => c.state === "failed").map((c) => c.label)}
            tone="failed"
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3">
          <button
            type="button"
            onClick={() => onOpenBreakdown(match.scholarship.id)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#DDD6FE] bg-[#F5F3FF] px-3 text-xs font-semibold text-[#6D28D9] transition-colors hover:bg-[#EDE9FE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            aria-label={`View match breakdown for ${match.scholarship.title}`}
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            View breakdown
          </button>

          <Link
            to={`/scholarships/${match.scholarship.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F1F4F9] hover:text-[#0F172A]"
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {match.category === "strong" && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#047857]">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            All mandatory rules verified against your profile
          </p>
        )}

        {match.category === "not-eligible" && (
          <p className="mt-2.5 inline-flex items-start gap-1.5 text-[11px] font-medium text-[#BE123C]">
            <XCircle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            Mandatory rule failed — the {match.score}% score is informational and cannot override
            it
          </p>
        )}

        {match.category === "potential" && match.missingFields.length > 0 && (
          <p className="mt-2.5 inline-flex items-start gap-1.5 text-[11px] font-medium text-[#B45309]">
            <CircleAlert className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            Add {match.missingFields.map((field) => MATCHER_FIELD_LABELS[field].toLowerCase()).join(", ")}{" "}
            to confirm this result
          </p>
        )}
      </Card>
    </motion.div>
  );
}
