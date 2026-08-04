import { Card, CardPanel, Skeleton } from "@louez/ui";

export const DashboardStatsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardPanel className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardPanel>
        </Card>
      ))}
    </div>
  );
};
