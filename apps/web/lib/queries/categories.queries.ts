import { orpc } from "@/lib/orpc/react";

export const categoriesQueries = {
  list: () =>
    orpc.dashboard.categories.list.queryOptions({
      // Categories rarely change while browsing the catalog
      staleTime: 60_000,
    }),
};
