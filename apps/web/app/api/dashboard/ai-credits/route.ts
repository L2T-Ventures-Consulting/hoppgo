import { NextResponse } from "next/server";

import { getAiCreditsInfo, microToCredits } from "@/lib/ai/advisor/credits";
import {
  getImageBgRemovalCredits,
  getImageEnhanceCredits,
} from "@/lib/ai/pricing";
import { auth } from "@/lib/auth";
import { getStorePlan } from "@/lib/plan-limits";
import { areAiCreditsEnabled } from "@/lib/plans";
import { getCurrentStore } from "@/lib/store-context";

/** Total balance under which the UI shows the low-credit warning state. */
const LOW_CREDITS_THRESHOLD = 5;

export type AiCreditsBalanceResponse = {
  enabled: boolean;
  /** null = unlimited monthly allowance. */
  totalCredits: number | null;
  monthlyIncludedCredits: number | null;
  monthlyRemainingCredits: number | null;
  prepaidCredits: number;
  low: boolean;
  /** Flat per-image tariffs (0 = free), so spend surfaces can price upfront. */
  imageEnhanceCredits: number;
  imageBgRemovalCredits: number;
};

/**
 * Live AI-credit balance for the current store. Read-only, member-scoped
 * (any store role can already see the balance on the AI-assistant page).
 * Lets client surfaces (header pill, product form) refresh after a spend
 * instead of waiting for the next server render.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const store = await getCurrentStore();
  if (!store) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }

  if (!areAiCreditsEnabled()) {
    const disabled: AiCreditsBalanceResponse = {
      enabled: false,
      totalCredits: null,
      monthlyIncludedCredits: null,
      monthlyRemainingCredits: null,
      prepaidCredits: 0,
      low: false,
      imageEnhanceCredits: 0,
      imageBgRemovalCredits: 0,
    };
    return NextResponse.json(disabled);
  }

  const plan = await getStorePlan(store.id);
  const info = await getAiCreditsInfo(store.id, plan);

  const totalCredits =
    info.monthlyRemainingMicro === null
      ? null
      : microToCredits(info.monthlyRemainingMicro + info.prepaidBalanceMicro);

  const body: AiCreditsBalanceResponse = {
    enabled: true,
    totalCredits,
    monthlyIncludedCredits:
      info.monthlyIncludedMicro === null
        ? null
        : microToCredits(info.monthlyIncludedMicro),
    monthlyRemainingCredits:
      info.monthlyRemainingMicro === null
        ? null
        : microToCredits(info.monthlyRemainingMicro),
    prepaidCredits: microToCredits(info.prepaidBalanceMicro),
    low: totalCredits !== null && totalCredits < LOW_CREDITS_THRESHOLD,
    imageEnhanceCredits: getImageEnhanceCredits(),
    imageBgRemovalCredits: getImageBgRemovalCredits(),
  };
  return NextResponse.json(body);
}
