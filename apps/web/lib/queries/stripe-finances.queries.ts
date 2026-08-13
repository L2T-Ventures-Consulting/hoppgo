import { infiniteQueryOptions } from "@tanstack/react-query";

import { loadStripePayoutPage } from "@/app/(dashboard)/dashboard/settings/payments/actions";
import type { ConnectedAccountPayoutPage } from "@/lib/stripe/connected-account-finances";

const INITIAL_PAYOUT_CURSOR: string | undefined = undefined;

export const stripeFinancesQueries = {
  payouts: (storeId: string, initialPage: ConnectedAccountPayoutPage) =>
    infiniteQueryOptions({
      queryKey: ["dashboard", "stripe-finances", "payouts", storeId],
      queryFn: async ({ pageParam }) => {
        const result = await loadStripePayoutPage(pageParam);
        if (result.status === "error") {
          throw new Error(result.error);
        }
        return result.page;
      },
      initialData: {
        pages: [initialPage],
        pageParams: [INITIAL_PAYOUT_CURSOR],
      },
      initialPageParam: INITIAL_PAYOUT_CURSOR,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 30_000,
    }),
};
