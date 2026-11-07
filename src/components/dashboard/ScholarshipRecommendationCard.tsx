import { Link } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Scholarship } from "@/types";
import { Card, Badge, Button } from "@/components/ui";
import { evaluateDeadline, formatINR } from "@/utils/dashboardLogic";
import { cn } from "@/utils/cn";

export interface ScholarshipRecommendationCardProps {
  scholarship: Scholarship;
  isSaved: boolean;
  onToggleSave: (scholarshipId: string) => void;
}

export function ScholarshipRecommendationCard({
  scholarship,
  isSaved,
  onToggleSave,
}: ScholarshipRecommendationCardProps) {
  const deadlineInfo = evaluateDeadline(scholarship.deadline);

  const urgencyBadgeStyles = {
    urgent: "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C]",
    attention: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
    normal: "border-[#E2E8F0] bg-[#F8F9FC] text-[#475569]",
    closed: "border-[#E2E8F0] bg-[#F1F4F9] text-[#64748B]",
  }[deadlineInfo.urgency];

  const countdownLabel =
    deadlineInfo.remainingDays < 0
      ? "Closed"
      : deadlineInfo.remainingDays === 0
        ? "Due today"
        : `${deadlineInfo.remainingDays}d left`;

  return (
    <Card
      interactive
      className="flex flex-col justify-between p-5 transition-all duration-200"
    >
      <div>
        {/* Top Row: Category, Match Score, Demo Indicator & Save Toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="violet">{scholarship.category}</Badge>
            <Badge variant="emerald" className="gap-1">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {scholarship.matchScore}% Match
            </Badge>
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

        {/* Title & Organization */}
        <div className="mt-3.5">
          <h3 className="font-display text-base font-semibold leading-snug text-[#0F172A]">
            <Link
              to={`/scholarships/${scholarship.id}`}
              className="hover:text-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            >
              {scholarship.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs font-medium text-[#64748B]">{scholarship.provider}</p>
        </div>

        {/* Award Amount & Metadata */}
        <div className="mt-4 rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-[#64748B]">Award Value</span>
            <span className="font-display text-lg font-bold text-[#0F172A] tabular-nums">
              {formatINR(scholarship.amountMax)}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0]/70 pt-2.5 text-xs text-[#475569]">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-[#6D28D9]" aria-hidden="true" />
              <span>{scholarship.educationLevel}</span>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
              <span>{deadlineInfo.formattedDate}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-[#EEF2F6]">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tabular-nums",
            urgencyBadgeStyles
          )}
        >
          {countdownLabel}
        </span>

        <Link to={`/scholarships/${scholarship.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#6D28D9] hover:bg-[#F5F3FF] hover:text-[#5B21B6]"
            rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}
