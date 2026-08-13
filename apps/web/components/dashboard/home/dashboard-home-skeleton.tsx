import { Skeleton } from "@louez/ui";

import { DashboardActivitySkeleton } from "./dashboard-activity-skeleton";
import { DashboardStatsSkeleton } from "./dashboard-stats-skeleton";

export const DashboardHomeSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-full sm:w-40" />
      </div>
      <DashboardStatsSkeleton />
      <DashboardActivitySkeleton />
    </div>
  );
};
