import { Link } from "react-router-dom";
import { Compass, Info, ArrowUpRight } from "lucide-react";
import type { Scholarship } from "@/types";
import { Card, Button } from "@/components/ui";
import { ScholarshipRecommendationCard } from "./ScholarshipRecommendationCard";
import { DashboardEmptyState } from "./DashboardEmptyState";

export interface RecommendedScholarshipsProps {
  scholarships: Scholarship[];
  savedIds: string[];
  onToggleSave: (scholarshipId: string) => void;
}

export function RecommendedScholarships({
  scholarships,
  savedIds,
  onToggleSave,
}: RecommendedScholarshipsProps) {
  const recommendedList = scholarships.slice(0, 6);
  const savedSet = new Set(savedIds);

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="recommended-scholarships-heading">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2
            id="recommended-scholarships-heading"
            className="font-display text-lg font-semibold tracking-[-0.015em] text-[#0F172A]"
          >
            Recommended Scholarships
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B]">
            High-alignment opportunities curated from your academic profile.
          </p>
        </div>

        <Link to="/explore">
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Explore All ({scholarships.length})
          </Button>
        </Link>
      </div>

      {/* Explicit Demonstration Data Disclosure */}
      <div
        role="note"
        className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#DDD6FE]/80 bg-[#F5F3FF]/70 px-3.5 py-2.5 text-xs text-[#4C1D95]"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6D28D9]" aria-hidden="true" />
        <span>
          <strong>Demonstration Data:</strong> Sample scholarship records are displayed for
          platform preview and are not verified active funding listings.
        </span>
      </div>

      {/* Recommendation Cards Grid */}
      {recommendedList.length === 0 ? (
        <div className="mt-5">
          <DashboardEmptyState
            icon={Compass}
            title="No Recommendations Available"
            description="Complete your academic profile to generate tailored scholarship recommendations."
            action={
              <Link to="/profile">
                <Button variant="primary" size="sm">
                  Update Profile
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {recommendedList.map((scholarship) => (
            <ScholarshipRecommendationCard
              key={scholarship.id}
              scholarship={scholarship}
              isSaved={savedSet.has(scholarship.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
