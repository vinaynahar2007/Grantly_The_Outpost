import { Link } from "react-router-dom";
import { ArrowRight, Lightbulb, ShieldCheck } from "lucide-react";
import type { MatcherProfileCompleteness, ProfileImprovement } from "@/types";
import { Card } from "@/components/ui";
import { MATCHER_FIELD_LABELS } from "@/services/matchingEngine";

export interface ImproveYourMatchProps {
  improvements: ProfileImprovement[];
  completeness: MatcherProfileCompleteness;
}

export function ImproveYourMatch({ improvements, completeness }: ImproveYourMatchProps) {
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="improve-match-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="improve-match-heading"
            className="flex items-center gap-2 font-display text-lg font-semibold tracking-[-0.015em] text-[#0F172A]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            Improve Your Match
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#64748B]">
            These suggestions only ask you to supply information you have not recorded yet.
            GRANTLY never asks you to change a factual answer to raise a score.
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] px-3.5 py-2 text-right">
          <p className="font-display text-lg font-bold text-[#0F172A] tabular-nums">
            {completeness.completedCount}/{completeness.totalCount}
          </p>
          <p className="text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">
            fields recorded
          </p>
        </div>
      </div>

      {improvements.length === 0 ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-sm text-[#047857]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Your profile is complete for every rule in the current dataset. Nothing further is
            needed to confirm these results.
          </span>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {improvements.map((improvement) => (
            <li key={improvement.id}>
              <Link
                to={`/profile#${improvement.profileSection}`}
                className="group flex h-full flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:border-[#C4B5FD] hover:bg-[#F5F3FF]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-sm font-semibold text-[#0F172A]">
                      {improvement.title}
                    </p>
                    {improvement.affectedScholarships > 0 && (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-0.5 text-[10px] font-bold text-[#6D28D9] tabular-nums">
                        {improvement.affectedScholarships} affected
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#64748B]">
                    {improvement.rationale}
                  </p>
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D28D9]">
                  {improvement.action}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {completeness.missingFields.length > 0 && (
        <p className="mt-4 border-t border-[#EEF2F6] pt-3 text-[11px] text-[#64748B]">
          Still blank on your profile:{" "}
          <span className="font-medium text-[#475569]">
            {completeness.missingFields.map((field) => MATCHER_FIELD_LABELS[field]).join(" · ")}
          </span>
        </p>
      )}
    </Card>
  );
}
