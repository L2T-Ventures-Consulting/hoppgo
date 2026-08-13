import { redirect } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { getCurrentStore } from "@/lib/store-context";

import { AdvisorConversationsSection } from "../conversations-section";
import { AiAssistantSettingsChrome } from "../settings-chrome";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * What the customer-facing agents produced: every web chat and phone call, with
 * the ones that turned into a reservation called out.
 *
 * The `?conversation=<id>` deep link (voice callback emails, credit usage
 * ledger) is read client-side by the section, which opens that transcript.
 */
export default async function AiConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; topup?: string }>;
}) {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const [{ topup }, t] = await Promise.all([
    searchParams,
    getTranslations("dashboard.aiAssistant.pages"),
  ]);

  return (
    <AiAssistantSettingsChrome
      topup={topup}
      title={t("conversations.title")}
      description={t("conversations.description")}
    >
      <AdvisorConversationsSection />
    </AiAssistantSettingsChrome>
  );
}
