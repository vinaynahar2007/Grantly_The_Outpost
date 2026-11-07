import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, UserCheck, ArrowRight } from "lucide-react";
import type { ProfileCompletionResult } from "@/types";
import { Card, Button, Badge } from "@/components/ui";

export interface ProfileCompletionCardProps {
  completion: ProfileCompletionResult;
}

export function ProfileCompletionCard({ completion }: ProfileCompletionCardProps) {
  const isComplete = completion.percentage === 100;

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="profile-completion-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="profile-completion-heading"
            className="font-display text-base font-semibold tracking-[-0.015em] text-[#0F172A]"
          >
            Profile Completion
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B]">
            {completion.completedCount} of {completion.totalCount} profile sections verified
          </p>
        </div>

        <Badge variant={isComplete ? "emerald" : "violet"} className="font-mono tabular-nums">
          {completion.percentage}%
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[#EEF2F6]"
          role="progressbar"
          aria-valuenow={completion.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Scholar profile completion percentage"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6D28D9] to-[#059669] transition-all duration-300"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
      </div>

      {/* Completed Sections */}
      {completion.completedSections.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-[0.04em] text-[#64748B] uppercase">
            Completed Sections
          </p>
          <ul className="mt-2 space-y-1.5" aria-label="Completed profile sections">
            {completion.completedSections.map((section) => (
              <li
                key={section.id}
                className="flex items-center gap-2 text-xs font-medium text-[#334155]"
              >
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0 text-[#059669]"
                  aria-hidden="true"
                />
                <span>{section.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Information */}
      {completion.missingSections.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#DDD6FE]/70 bg-[#F5F3FF]/60 p-3.5">
          <p className="text-[11px] font-semibold tracking-[0.04em] text-[#5B21B6] uppercase">
            Missing Information
          </p>
          <ul className="mt-2 space-y-2" aria-label="Missing profile information">
            {completion.missingSections.map((section) => (
              <li key={section.id} className="flex items-start gap-2 text-xs text-[#334155]">
                <CircleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6D28D9]"
                  aria-hidden="true"
                />
                <div>
                  <span className="font-semibold text-[#0F172A]">{section.label}:</span>{" "}
                  <span className="text-[#475569]">{section.missingHint}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3 text-xs font-medium text-[#047857]">
          <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>All scholar profile sections are complete for full grant matching.</span>
        </div>
      )}

      {/* Complete Profile Action */}
      <div className="mt-5">
        <Link to="/profile" className="block">
          <Button
            variant={isComplete ? "secondary" : "primary"}
            size="md"
            fullWidth
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            {isComplete ? "Review Profile" : "Complete Profile"}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
