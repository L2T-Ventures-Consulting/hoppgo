import { Card, CardPanel, Skeleton } from "@louez/ui";

/** Same rhythm as the home KPIs: two columns on phones, four from `lg`. */
export const STATS_GRID_CLASS_NAME = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4";

function StatCardSkeleton() {
  return (
    <Card>
      <CardPanel className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardPanel>
    </Card>
  );
}

/** Suspense fallback of both analytics KPI rows (sales and traffic). */
export function StatsGridSkeleton() {
  return (
    <div className={STATS_GRID_CLASS_NAME}>
      {Array.from({ length: 4 }, (_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}
