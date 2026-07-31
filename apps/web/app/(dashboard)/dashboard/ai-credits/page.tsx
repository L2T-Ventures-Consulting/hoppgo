import { redirect } from "next/navigation";

import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  getAiCreditDebitHistory,
  getAiCreditHistory,
  getAiCreditUsageSummary,
  getAiCreditsInfo,
  microToCredits,
} from "@/lib/ai/advisor/credits";
import { getNumberRentalCredits, getPhoneCreditsPerMinute } from "@/lib/ai/pricing";
import { getStorePlan } from "@/lib/plan-limits";
import { areAiCreditsEnabled, getAiCreditPackages } from "@/lib/plans";
import { getImageFiles } from "@/lib/storage/files";
import { getCurrentStore } from "@/lib/store-context";

import { AiCreditsAutoTopup } from "./ai-credits-auto-topup";
import { AiCreditsHeader } from "./ai-credits-header";
import { AiCreditsHistory, type AiCreditsHistoryTab } from "./ai-credits-history";
import { AiCreditsOverview } from "./ai-credits-overview";
import { AiCreditsValue } from "./ai-credits-value";
import { LOW_BALANCE_CREDITS } from "./credits-format";

const USAGE_PAGE_SIZE = 20;
/** Enough purchase rows to both fill the tab and tell a newcomer from a customer. */
const PURCHASE_HISTORY_LIMIT = 30;

/**
 * The AI wallet's own page: one balance, one recharge button, and the two
 * ledgers behind them. Extracted from the assistant page because credits are
 * shared by every AI surface (storefront advisor, voice agent, number rental,
 * product-image enhancement) — not by the assistant alone.
 *
 * Cloud-only: when the operator has not enabled the paid credit layer, the page
 * does not exist and sends the merchant back to the assistant.
 */
export default async function AiCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; topup?: string }>;
}) {
  if (!areAiCreditsEnabled()) {
    redirect("/dashboard/ai-assistant");
  }

  const store = await getCurrentStore();
  if (!store) {
    redirect("/onboarding");
  }

  const [{ page: pageParam, tab: tabParam, topup }, t] = await Promise.all([
    searchParams,
    getTranslations("dashboard.aiCredits"),
  ]);

  const parsedPage = Number(pageParam);
  const page = Number.isFinite(parsedPage) && parsedPage > 1 ? Math.trunc(parsedPage) : 1;
  const tab: AiCreditsHistoryTab = tabParam === "purchases" ? "purchases" : "usage";

  const plan = await getStorePlan(store.id);
  const [info, purchases, debits, summary] = await Promise.all([
    getAiCreditsInfo(store.id, plan),
    getAiCreditHistory(store.id, PURCHASE_HISTORY_LIMIT),
    getAiCreditDebitHistory(store.id, { page, pageSize: USAGE_PAGE_SIZE }),
    getAiCreditUsageSummary(store.id),
  ]);

  const packages = getAiCreditPackages();
  const voiceCreditsPerMinute = getPhoneCreditsPerMinute();
  const numberRentalCredits = getNumberRentalCredits();

  const monthlyIncludedCredits =
    info.monthlyIncludedMicro === null ? null : microToCredits(info.monthlyIncludedMicro);
  const monthlyRemainingCredits =
    info.monthlyRemainingMicro === null ? null : microToCredits(info.monthlyRemainingMicro);
  const prepaidCredits = microToCredits(info.prepaidBalanceMicro);
  const totalCredits =
    monthlyRemainingCredits === null ? null : monthlyRemainingCredits + prepaidCredits;

  // A merchant who has never bought a pack AND never burned a credit gets the
  // pitch instead of an empty receipt.
  const hasPurchased = purchases.some((row) => row.type === "topup" || row.type === "auto_topup");
  const isNewcomer = !hasPurchased && debits.total === 0;
  const imageFiles = getImageFiles();
  const usageRows = await Promise.all(
    debits.rows.map(async (row) => ({
      id: row.id,
      kind: row.kind,
      conversationId: row.conversationId,
      imageUrl: row.imageKey ? await imageFiles.url(row.imageKey) : null,
      credits: microToCredits(row.creditsMicro),
      audioSeconds: row.audioSeconds,
      createdAt: row.createdAt.toISOString(),
    })),
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <AiCreditsHeader
        totalCredits={totalCredits}
        low={totalCredits !== null && totalCredits < LOW_BALANCE_CREDITS}
        packages={packages}
        voiceCreditsPerMinute={voiceCreditsPerMinute > 0 ? voiceCreditsPerMinute : null}
        numberRentalCredits={numberRentalCredits > 0 ? numberRentalCredits : null}
      />

      <div className="space-y-4 py-4 sm:space-y-6 sm:py-6">
        {topup === "success" && (
          <div className="bg-badge-success-background/60 text-badge-success-foreground ring-badge-success-foreground/15 flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm ring-1 ring-inset">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("topupSuccess")}
          </div>
        )}
        {topup === "cancelled" && (
          <div className="bg-muted/40 text-muted-foreground rounded-xl px-3.5 py-3 text-sm">
            {t("topupCancelled")}
          </div>
        )}

        <AiCreditsOverview
          monthlyIncludedCredits={monthlyIncludedCredits}
          monthlyRemainingCredits={monthlyRemainingCredits}
          prepaidCredits={prepaidCredits}
          canTopup={packages.length > 0}
        />

        <AiCreditsValue
          isNewcomer={isNewcomer}
          canTopup={packages.length > 0}
          summary={{
            conversations: summary.conversations,
            calls: summary.calls,
            callSeconds: summary.callSeconds,
            images: summary.images,
            credits: microToCredits(summary.creditsMicro),
          }}
        />

        {packages.length > 0 && (
          <AiCreditsAutoTopup
            enabled={info.autoTopupEnabled}
            thresholdCredits={
              info.autoTopupThresholdMicro ? microToCredits(info.autoTopupThresholdMicro) : 0
            }
            packIndex={packages.findIndex(
              (pack) =>
                pack.credits === info.autoTopupCredits &&
                pack.priceCents === info.autoTopupPriceCents,
            )}
            packages={packages}
          />
        )}

        <AiCreditsHistory
          tab={tab}
          page={page}
          pageSize={USAGE_PAGE_SIZE}
          usageTotal={debits.total}
          usage={usageRows}
          purchases={purchases.map((row) => ({
            id: row.id,
            type: row.type,
            credits: microToCredits(row.creditsMicro),
            amountCents: row.amountCents,
            currency: row.currency,
            status: row.status,
            createdAt: row.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
