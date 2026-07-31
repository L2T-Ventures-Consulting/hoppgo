import { queryOptions } from "@tanstack/react-query";

import type { AiCreditsBalanceResponse } from "@/app/api/dashboard/ai-credits/route";

const AI_CREDITS_BALANCE_ENDPOINT = "/api/dashboard/ai-credits";

const fetchAiCreditsBalance = async (): Promise<AiCreditsBalanceResponse> => {
  const response = await fetch(AI_CREDITS_BALANCE_ENDPOINT);
  if (!response.ok) {
    throw new Error("ai_credits_balance_unavailable");
  }
  return (await response.json()) as AiCreditsBalanceResponse;
};

export const aiCreditsQueries = {
  balance: () =>
    queryOptions({
      queryKey: ["dashboard", "ai-credits", "balance"] as const,
      queryFn: fetchAiCreditsBalance,
      staleTime: 15_000,
      // Recharging can happen in another tab: pick the new balance up on return.
      refetchOnWindowFocus: true,
      // A missing balance must never block a spend flow: the credit UI simply hides.
      retry: 1,
    }),
};
