import { lazy } from "react";
import {
  Sparkles,
  Wallet,
  FolderKanban,
  CalendarClock,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useStudentData } from "@/context/StudentDataContext";
import {
  WelcomeSection,
  StatCard,
  RecommendedScholarships,
  UpcomingDeadlines,
  RecentActivity,
  ProfileCompletionCard,
} from "@/components/dashboard";
import { DeferredContent } from "@/components/ui/DeferredContent";
import { Card } from "@/components/ui";
import { formatINR } from "@/utils/dashboardLogic";

const ApplicationProgressChart = lazy(() =>
  import("@/components/dashboard/ApplicationProgressChart").then((module) => ({
    default: module.ApplicationProgressChart,
  })),
);

function formatTwoDigitCount(count: number): string {
  return String(count).padStart(2, "0");
}

export function DashboardPage() {
  useDocumentTitle("Dashboard");

  const {
    scholarships,
    savedIds,
    applications,
    profile,
    activities,
    metrics,
    profileCompletion,
    applicationProgress,
    upcomingDeadlines,
    toggleSaveScholarship,
  } = useStudentData();

  return (
    <div className="space-y-6">
      {/* A. Welcome Section */}
      <WelcomeSection
        fullName={profile.fullName}
        completionPercentage={profileCompletion.percentage}
      />

      {/* B. Key Statistics Row */}
      <section
        aria-label="Scholarship Journey Key Statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Matching Scholarships"
          value={`${formatTwoDigitCount(metrics.matchingCount)} matches`}
          description="Opportunities matching your profile."
          icon={Sparkles}
          accent="violet"
          indicatorText="Profile Fit"
        />

        <StatCard
          title="Potential Funding"
          value={formatINR(metrics.potentialFundingTotal)}
          description="Combined value of relevant opportunities."
          footnote="Estimated potential funding · Not guaranteed"
          icon={Wallet}
          accent="emerald"
          indicatorText="Potential Value"
        />

        <StatCard
          title="Active Applications"
          value={`${formatTwoDigitCount(metrics.activeApplicationsCount)} active`}
          description="Applications currently being tracked."
          icon={FolderKanban}
          accent="navy"
          indicatorText="In Pipeline"
        />

        <StatCard
          title="Upcoming Deadlines"
          value={`${formatTwoDigitCount(metrics.upcomingDeadlinesCount)} deadlines`}
          description="Deadlines within the next 30 days."
          icon={CalendarClock}
          accent="amber"
          indicatorText="Next 30 Days"
        />
      </section>

      {/* Main Content & Secondary Panels */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Primary Column: Recommended Scholarships & Application Progress */}
        <div className="space-y-6 xl:col-span-8">
          <RecommendedScholarships
            scholarships={scholarships}
            savedIds={savedIds}
            onToggleSave={toggleSaveScholarship}
          />

          <DeferredContent
            fallback={
              <Card
                className="min-h-[410px] p-5 sm:p-6"
                role="status"
                aria-label="Loading application progress chart"
              >
                <div className="h-6 w-48 animate-pulse rounded bg-[#F1F4F9]" />
                <div className="mt-4 h-4 max-w-xl animate-pulse rounded bg-[#F1F4F9]" />
                <div className="mt-8 h-[300px] animate-pulse rounded-xl bg-[#F8F9FC]" />
              </Card>
            }
          >
            <ApplicationProgressChart
              stages={applicationProgress}
              totalApplications={applications.length}
            />
          </DeferredContent>
        </div>

        {/* Secondary Column: Profile Completion, Upcoming Deadlines & Recent Activity */}
        <div className="space-y-6 xl:col-span-4">
          <ProfileCompletionCard completion={profileCompletion} />

          <UpcomingDeadlines deadlines={upcomingDeadlines} maxItems={5} />

          <RecentActivity activities={activities} maxItems={4} />
        </div>
      </div>
    </div>
  );
}
