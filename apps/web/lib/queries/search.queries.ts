import { orpc } from "@/lib/orpc/react";

export const searchQueries = {
  global: (query: string) => orpc.dashboard.search.global.queryOptions({ input: { query } }),
};
