import {
  BookmarkCheck,
  RefreshCw,
  UserCheck,
  FileUp,
  History,
} from "lucide-react";
import type { ActivityItem, ActivityType } from "@/types";
import { Card } from "@/components/ui";
import { formatDisplayDate } from "@/utils/dashboardLogic";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { cn } from "@/utils/cn";

export interface RecentActivityProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const activityConfig: Record<
  ActivityType,
  {
    icon: typeof BookmarkCheck;
    iconClass: string;
  }
> = {
  scholarship_saved: {
    icon: BookmarkCheck,
    iconClass: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
  },
  application_status_changed: {
    icon: RefreshCw,
    iconClass: "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]",
  },
  profile_updated: {
    icon: UserCheck,
    iconClass: "border-[#E2E8F0] bg-[#F1F4F9] text-[#0F172A]",
  },
  document_uploaded: {
    icon: FileUp,
    iconClass: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  },
};

export function RecentActivity({ activities, maxItems = 5 }: RecentActivityProps) {
  const visibleActivities = activities.slice(0, maxItems);

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="recent-activity-heading">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2
            id="recent-activity-heading"
            className="font-display text-base font-semibold tracking-[-0.015em] text-[#0F172A]"
          >
            Recent Activity
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Latest updates across your saved grants, profile, and vault.
          </p>
        </div>
      </div>

      {visibleActivities.length === 0 ? (
        <div className="mt-4">
          <DashboardEmptyState
            icon={History}
            title="No Recent Activity"
            description="Your scholarship bookmarks, profile updates, and uploads will appear here."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3" aria-label="Recent student activity log">
          {visibleActivities.map((activity) => {
            const config = activityConfig[activity.type];
            const Icon = config.icon;

            return (
              <li
                key={activity.id}
                className="flex items-start gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8F9FC]/60 p-3"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                    config.iconClass
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-[#0F172A]">{activity.title}</p>
                    <time
                      dateTime={activity.timestamp}
                      className="shrink-0 text-[11px] text-[#64748B]"
                    >
                      {formatDisplayDate(activity.timestamp)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">
                    {activity.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
