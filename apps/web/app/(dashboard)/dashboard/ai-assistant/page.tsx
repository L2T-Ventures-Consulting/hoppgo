import { redirect } from "next/navigation";

import { and, eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { db, storePhoneNumbers } from "@louez/db";

import { env } from "@/env";
import { getAiCreditsInfo, microToCredits } from "@/lib/ai/advisor/credits";
import { hasNumberRentalFunds } from "@/lib/ai/phone/number-billing";
import { isVoiceAgentConfigured } from "@/lib/ai/phone/eligibility";
import { getNumberRentalCredits, getPhoneCreditsPerMinute } from "@/lib/ai/pricing";
import { isAIChatConfigured } from "@/lib/ai/provider";
import { getStorePlan } from "@/lib/plan-limits";
import { areAiCreditsEnabled, getAiCreditPackages } from "@/lib/plans";
import { getCurrentStore } from "@/lib/store-context";
import type { AiCreditPackage } from "@/lib/plans";

import { LOW_BALANCE_CREDITS } from "../ai-credits/credits-format";
import { AiAdvisorForm } from "./ai-advisor-form";
import { AiAssistantHeader } from "./ai-assistant-header";
import { AiAssistantHero } from "./ai-assistant-hero";
import { resolveAiAssistantTab } from "./ai-assistant-tab";
import { AiAssistantTabs } from "./ai-assistant-tabs";
import { AdvisorConversationsSection } from "./conversations-section";
import { VoiceAgentForm } from "./voice-agent-form";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * The AI assistant's home: three tabs — the two faces it is configured for
 * (web advisor, voice agent) and the conversations they produce — with the
 * credit balance pinned in the sticky header. When nothing is enabled yet, a
 * marketing hero shows what the assistant can do above the tabs.
 *
 * The wallet itself (history, auto-recharge, usage ledger) lives on
 * `/dashboard/ai-credits`; only the balance and the recharge modal stay here,
 * because credits are spent from this page.
 */
export default async function AiAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; tab?: string; topup?: string }>;
}) {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const [{ conversation, tab: tabParam, topup }, t, plan] = await Promise.all([
    searchParams,
    getTranslations("dashboard.aiCredits"),
    getStorePlan(store.id),
  ]);

  const tab = resolveAiAssistantTab(tabParam, conversation);

  // Commercial voice tariffs (env-driven; 0 ⇒ not configured / free).
  const numberRentalCredits = getNumberRentalCredits();
  const voiceCreditsPerMinute = getPhoneCreditsPerMinute();

  // Credit layer is a cloud-only commercial add-on: only load and render it
  // when the operator has enabled it via env (self-host never sees it).
  let headerCredits: { totalCredits: number | null; low: boolean } | null = null;
  let packages: AiCreditPackage[] = [];
  if (areAiCreditsEnabled()) {
    const info = await getAiCreditsInfo(store.id, plan);
    packages = getAiCreditPackages();
    const totalCredits =
      info.monthlyRemainingMicro === null
        ? null
        : microToCredits(info.monthlyRemainingMicro + info.prepaidBalanceMicro);
    headerCredits = {
      totalCredits,
      low: totalCredits !== null && totalCredits < LOW_BALANCE_CREDITS,
    };
  }

  const [phoneBinding, rentalFundsOk] = await Promise.all([
    db.query.storePhoneNumbers.findFirst({
      where: and(eq(storePhoneNumbers.storeId, store.id), eq(storePhoneNumbers.status, "active")),
      columns: { e164: true, providerNumberId: true },
    }),
    hasNumberRentalFunds(store.id, plan),
  ]);

  const advisorEnabled = store.aiAdvisorSettings?.enabled === true;
  const voiceEnabled = store.aiPhoneSettings?.enabled === true;
  const showHero = !advisorEnabled && !voiceEnabled;

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <AiAssistantHeader
        credits={headerCredits}
        packages={packages}
        voiceCreditsPerMinute={voiceCreditsPerMinute > 0 ? voiceCreditsPerMinute : null}
        numberRentalCredits={numberRentalCredits > 0 ? numberRentalCredits : null}
      />

      <div className="space-y-4 py-4 sm:space-y-6 sm:py-6">
        {/* Stripe hands the merchant back here when the checkout started from
            this page — the credits section that used to say so is gone. */}
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

        <AiAssistantTabs
          initialTab={tab}
          hero={
            showHero ? (
              <AiAssistantHero
                hasAdvisorAccess={plan.features.aiAdvisor}
                hasVoiceAccess={plan.features.aiPhone}
              />
            ) : null
          }
          advisor={
            <AiAdvisorForm
              store={{ id: store.id, aiAdvisorSettings: store.aiAdvisorSettings }}
              hasFeatureAccess={plan.features.aiAdvisor}
              aiConfigured={isAIChatConfigured()}
            />
          }
          voice={
            <VoiceAgentForm
              store={{ id: store.id, aiPhoneSettings: store.aiPhoneSettings }}
              hasFeatureAccess={plan.features.aiPhone}
              phoneConfigured={isVoiceAgentConfigured()}
              boundNumber={phoneBinding?.e164 ?? null}
              isProvisioned={Boolean(phoneBinding?.providerNumberId)}
              webhookUrl={`${env.NEXT_PUBLIC_APP_URL}/api/voice/incoming`}
              defaultCountry="FR"
              numberRentalCredits={numberRentalCredits > 0 ? numberRentalCredits : null}
              voiceCreditsPerMinute={voiceCreditsPerMinute > 0 ? voiceCreditsPerMinute : null}
              hasRentalFunds={rentalFundsOk}
            />
          }
          conversations={<AdvisorConversationsSection />}
        />
      </div>
    </div>
  );
}
