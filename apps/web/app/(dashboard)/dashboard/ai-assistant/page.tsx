import { redirect } from "next/navigation";

import { ChatPage } from "@/components/dashboard/ai-chat/chat-page";
import type { ChatDiscovery } from "@/components/dashboard/ai-chat/chat-empty-state";
import { isAIChatConfigured } from "@/lib/ai/provider";
import { getStorePlan } from "@/lib/plan-limits";
import { getCurrentStore } from "@/lib/store-context";

import {
  resolveAiAssistantLegacyRedirect,
  type AiAssistantSearchParams,
} from "./util.legacy-redirect";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Whether the empty state should advertise a customer-facing surface: hidden
 * once the merchant enabled it, otherwise gated the way the old hero was —
 * plans with the feature get an "activate" pointer, others an upgrade one.
 */
const resolveDiscovery = (enabled: boolean | undefined, hasAccess: boolean): ChatDiscovery =>
  enabled ? "hidden" : hasAccess ? "activate" : "upgrade";

/**
 * The assistant's home: the merchant copilot as a full-page chat. Still
 * forwards the retired `?tab=` / `?conversation=` / `?topup=` deep links to
 * the sections that became real routes before rendering anything.
 */
export default async function AiAssistantPage({
  searchParams,
}: {
  searchParams: Promise<AiAssistantSearchParams>;
}) {
  // Before anything is loaded or rendered: an old link is not a visit to this
  // page, it is a visit to one of its sections.
  const legacyRedirect = resolveAiAssistantLegacyRedirect(await searchParams);

  if (legacyRedirect) {
    redirect(legacyRedirect);
  }

  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  // Same gate as the layout's Cmd+Shift+K entry: a self-hosted deployment
  // without an AI key must never land on a dead chat, so the assistant's home
  // falls back to the advisor configuration.
  if (!isAIChatConfigured()) {
    redirect("/dashboard/ai-assistant/advisor");
  }

  const plan = await getStorePlan(store.id);

  return (
    <ChatPage
      advisorDiscovery={resolveDiscovery(store.aiAdvisorSettings?.enabled, plan.features.aiAdvisor)}
      voiceDiscovery={resolveDiscovery(store.aiPhoneSettings?.enabled, plan.features.aiPhone)}
    />
  );
}
