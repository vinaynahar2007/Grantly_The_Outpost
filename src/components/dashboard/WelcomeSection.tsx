import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, UserPen, ArrowUpRight } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { formatWelcomeDate, getScholarFirstName } from "@/utils/dashboardLogic";

export interface WelcomeSectionProps {
  fullName: string;
  completionPercentage: number;
  currentDate?: Date;
}

export function WelcomeSection({
  fullName,
  completionPercentage,
  currentDate = new Date(),
}: WelcomeSectionProps) {
  const firstName = getScholarFirstName(fullName);
  const formattedDate = formatWelcomeDate(currentDate);

  return (
    <section
      aria-labelledby="welcome-heading"
      className="mb-7 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04)] sm:p-7"
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        {/* Left Editorial Greeting */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[#64748B]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8F9FC] px-3 py-1 text-[#334155]">
              <Calendar className="h-3.5 w-3.5 text-[#6D28D9]" aria-hidden="true" />
              <time dateTime={currentDate.toISOString().slice(0, 10)}>{formattedDate}</time>
            </span>

            <Badge
              variant={completionPercentage === 100 ? "emerald" : "violet"}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Profile {completionPercentage}% Complete
            </Badge>
          </div>

          <h1
            id="welcome-heading"
            className="font-display text-2xl font-bold tracking-[-0.025em] text-[#0F172A] sm:text-[30px] sm:leading-tight"
          >
            Good morning, {firstName}
          </h1>

          <p className="text-sm text-[#64748B] sm:text-[15px]">
            Here is your scholarship journey at a glance.
          </p>
        </div>

        {/* Right Actions & Quick Profile Progress */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="hidden min-w-[168px] rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] px-3.5 py-2.5 xl:block">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#475569]">Readiness</span>
              <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                {completionPercentage}%
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]"
              role="progressbar"
              aria-valuenow={completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile readiness progress"
            >
              <div
                className="h-full rounded-full bg-[#6D28D9] transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <Link to="/profile">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<UserPen className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />}
            >
              Edit Profile
            </Button>
          </Link>

          <Link to="/explore">
            <Button
              variant="primary"
              size="md"
              rightIcon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            >
              Explore Grants
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
