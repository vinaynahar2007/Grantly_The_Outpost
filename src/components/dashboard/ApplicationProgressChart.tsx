import { Link } from "react-router-dom";
import { FolderKanban, ArrowUpRight } from "lucide-react";
import type { ApplicationStageSummary } from "@/types";
import { Card, Button, Badge } from "@/components/ui";
import { DashboardEmptyState } from "./DashboardEmptyState";

export interface ApplicationProgressChartProps {
  stages: ApplicationStageSummary[];
  totalApplications: number;
}

export function ApplicationProgressChart({
  stages,
  totalApplications,
}: ApplicationProgressChartProps) {
  const maxCount = Math.max(1, ...stages.map((stage) => stage.count));

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="application-progress-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="application-progress-heading"
              className="font-display text-lg font-semibold tracking-[-0.015em] text-[#0F172A]"
            >
              Application Progress
            </h2>
            <Badge variant="neutral" className="tabular-nums">
              {totalApplications} Total
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Distribution of tracked applications across submission milestones.
          </p>
        </div>

        <Link to="/applications">
          <Button
            variant="secondary"
            size="sm"
            rightIcon={
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            }
          >
            View Pipeline
          </Button>
        </Link>
      </div>

      {totalApplications === 0 ? (
        <div className="mt-5">
          <DashboardEmptyState
            icon={FolderKanban}
            title="No Active Applications"
            description="Start an application from any recommended scholarship to track your progress."
            action={
              <Link to="/explore">
                <Button variant="primary" size="sm">
                  Find Scholarships
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-12 lg:items-center">
          <div
            className="flex min-h-[300px] min-w-0 flex-col justify-center gap-3 lg:col-span-7"
            aria-hidden="true"
          >
            {stages.map((stage) => (
              <div key={stage.status} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-right text-[11px] text-[#64748B]">
                  {stage.status}
                </span>
                <span className="h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-[#F1F4F9]">
                  <span
                    className="block h-full rounded-md"
                    style={{
                      width: `${(stage.count / maxCount) * 100}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>

          {/* Accessible Stage Breakdown Summary List */}
          <ul
            aria-label="Application stage counts"
            className="space-y-2.5 lg:col-span-5"
          >
            {stages.map((stage) => (
              <li
                key={stage.status}
                className="flex items-center justify-between rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-[#334155]">
                    {stage.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[#0F172A] tabular-nums">
                    {stage.count}
                  </span>
                  <span className="text-[11px] text-[#64748B] tabular-nums">
                    ({stage.percentage}%)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
