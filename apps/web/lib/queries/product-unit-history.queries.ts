import { orpc } from "@/lib/orpc/react";

export const productUnitHistoryQueries = {
  detail: (unitId: string) =>
    orpc.dashboard.products.unitHistory.queryOptions({
      input: { unitId },
      staleTime: 30_000,
    }),
};
