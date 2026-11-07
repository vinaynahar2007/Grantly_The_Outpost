import { Link } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  GraduationCap,
  MapPin,
  ArrowRight,
  Scale,
  CircleAlert,
} from "lucide-react";
import type { EligibilityResult, Scholarship } from "@/types";
import { Card, Badge, Button } from "@/components/ui";
import { evaluateDeadline, formatINR } from "@/utils/dashboardLogic";
import { formatAmountRange, getScholarshipBadges } from "@/utils/explorerLogic";
import { cn } from "@/utils/cn";
import { TrackScholarshipAction } from "@/components/applications/TrackScholarshipAction";

export interface ScholarshipCardProps {
  scholarship: Scholarship;
  eligibility: EligibilityResult;
  isSaved: boolean;
  isCompared: boolean;
  onToggleSave: (scholarshipId: string) => void;
  onToggleCompare: (scholarshipId: string) => void;
}

const eligibilityStyles: Record<EligibilityResult["status"], string> = {
  Eligible: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  "Potential Match": "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  "Not Eligible": "border-[#E2E8F0] bg-[#F1F4F9] text-[#64748B]",
};

const badgeStyles: Record<string, string> = {
  "Best Match": "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  "Closing Soon": "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C]",
  "High Value": "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
  Government: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
  International: "border-[#E2E8F0] bg-white text-[#334155]",
};

export function ScholarshipCard({
  scholarship,
  eligibility,
  isSaved,
  isCompared,
  onToggleSave,
  onToggleCompare,
}: ScholarshipCardProps) {
  const deadlineInfo = evaluateDeadline(scholarship.deadline);
  const badges = getScholarshipBadges(scholarship, eligibility);

  const countdownLabel =
    deadlineInfo.remainingDays < 0
      ? "Closed"
      : deadlineInfo.remainingDays === 0
        ? "Due today"
        : `${deadlineInfo.remainingDays}d left`;

  return (
    <Card interactive className="flex flex-col justify-between p-5">
      <div>
        {/* Badges + Save */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="violet">{scholarship.category}</Badge>
            {badges.map((badge) => (
              <span
                key={badge}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  badgeStyles[badge],
                )}
              >
                {badge}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#F8F9FC] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#64748B] uppercase">
              Demo
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleSave(scholarship.id)}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `Remove ${scholarship.title} from saved scholarships`
                : `Save ${scholarship.title}`
            }
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
              isSaved
                ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE]"
                : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8F9FC] hover:text-[#0F172A]",
            )}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Title / Provider / Description */}
        <div className="mt-3.5">
          <h3 className="font-display text-base font-semibold leading-snug text-[#0F172A]">
            <Link
              to={`/scholarships/${scholarship.id}`}
              className="hover:text-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            >
              {scholarship.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs font-medium text-[#64748B]">
            {scholarship.provider}
          </p>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#475569]">
            {scholarship.eligibilitySummary}
          </p>
        </div>

        {/* Eligibility */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums",
              eligibilityStyles[eligibility.status],
            )}
          >
            {eligibility.percentage}% · {eligibility.status}
          </span>
          {eligibility.missingProfileInfo.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B45309]">
              <CircleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
              Missing: {eligibility.missingProfileInfo.join(", ")}
            </span>
          )}
        </div>

        {/* Facts */}
        <div className="mt-4 rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-[#64748B]">
              Award Value
            </span>
            <span className="font-display text-base font-bold text-[#0F172A] tabular-nums">
              {formatAmountRange(scholarship)}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-1.5 border-t border-[#E2E8F0]/70 pt-2.5 text-xs text-[#475569] sm:grid-cols-3">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap
                className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]"
                aria-hidden="true"
              />
              <span className="truncate">
                {scholarship.educationLevels.join(" / ")}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin
                className="h-3.5 w-3.5 shrink-0 text-[#059669]"
                aria-hidden="true"
              />
              <span>{scholarship.location}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock
                className="h-3.5 w-3.5 shrink-0 text-[#64748B]"
                aria-hidden="true"
              />
              <span>
                {deadlineInfo.formattedDate} · {countdownLabel}
              </span>
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#64748B]">
            Max award {formatINR(scholarship.amount)} ·{" "}
            {scholarship.renewable ? "Renewable" : "One-time"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3">
        <button
          type="button"
          onClick={() => onToggleCompare(scholarship.id)}
          aria-pressed={isCompared}
          aria-label={
            isCompared
              ? `Remove ${scholarship.title} from comparison`
              : `Add ${scholarship.title} to comparison`
          }
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[9px] border px-3 text-xs font-medium transition-colors",
            isCompared
              ? "border-[#6D28D9] bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
              : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8F9FC] hover:text-[#0F172A]",
          )}
        >
          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
          {isCompared ? "Comparing" : "Compare"}
        </button>

        <Link to={`/scholarships/${scholarship.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#6D28D9] hover:bg-[#F5F3FF] hover:text-[#5B21B6]"
            rightIcon={
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            }
          >
            View Details
          </Button>
        </Link>
      </div>
      <TrackScholarshipAction scholarship={scholarship} />
    </Card>
  );
}
