import { Card, CardHeader, CardPanel, Skeleton } from "@louez/ui";

export const DashboardActivitySkeleton = () => {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }, (_, sectionIndex) => (
        <Card key={sectionIndex}>
          <CardHeader className="flex flex-row items-center gap-3 p-4 sm:p-5">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </CardHeader>
          <CardPanel className="space-y-2 p-4 sm:p-5">
            {Array.from({ length: 3 }, (_, rowIndex) => (
              <Skeleton key={rowIndex} className="h-12 w-full rounded-xl" />
            ))}
          </CardPanel>
        </Card>
      ))}
    </div>
  );
};
