import { Link } from "react-router-dom";
import { Bookmark, Compass } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useStudentData } from "@/context/StudentDataContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ScholarshipCard } from "@/components/scholarships/ScholarshipCard";
import { ScholarshipEmptyState } from "@/components/scholarships/ScholarshipEmptyState";
import { Button } from "@/components/ui";

export function SavedPage() {
  useDocumentTitle("Saved Grants");
  const {
    savedScholarships,
    eligibilityById,
    toggleSaveScholarship,
    toggleCompareScholarship,
    isScholarshipSaved,
    isInCompare,
  } = useStudentData();

  return (
    <div>
      <PageHeader
        title="Saved Scholarships"
        badgeText={`${savedScholarships.length} Saved`}
        description="Your bookmarked grants and fellowships organized for side-by-side comparison."
        actions={
          <Link to="/explore">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Compass className="h-4 w-4" aria-hidden="true" />}
            >
              Browse Opportunities
            </Button>
          </Link>
        }
      />

      {savedScholarships.length === 0 ? (
        <ScholarshipEmptyState
          icon={Bookmark}
          title="No Saved Scholarships Yet"
          description="Opportunities bookmarked from the Dashboard or Explore catalog will appear here for quick review and application conversion."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/explore">
                <Button variant="primary" size="md">
                  Explore Scholarships
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="secondary" size="md">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {savedScholarships.map((scholarship) => {
            const eligibility = eligibilityById.get(scholarship.id);
            if (!eligibility) return null;
            return (
              <ScholarshipCard
                key={scholarship.id}
                scholarship={scholarship}
                eligibility={eligibility}
                isSaved={isScholarshipSaved(scholarship.id)}
                isCompared={isInCompare(scholarship.id)}
                onToggleSave={toggleSaveScholarship}
                onToggleCompare={toggleCompareScholarship}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
