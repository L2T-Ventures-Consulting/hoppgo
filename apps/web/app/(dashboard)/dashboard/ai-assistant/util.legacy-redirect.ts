/** The three assistant sections, which used to be `?tab=` on a single page. */
const AI_ASSISTANT_ROUTES = {
  advisor: "/dashboard/ai-assistant/advisor",
  conversations: "/dashboard/ai-assistant/conversations",
  voice: "/dashboard/ai-assistant/voice",
} as const;

export type AiAssistantSearchParams = Record<string, string | string[] | undefined>;

const toQuery = (params: AiAssistantSearchParams) => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    }
  }

  return query;
};

/** Rebuilds the target URL, minus the `?tab=` the path now encodes. */
const withQuery = (path: string, query: URLSearchParams) => {
  query.delete("tab");
  const suffix = query.toString();

  return suffix ? `${path}?${suffix}` : path;
};

const routeForTab = (tab: string | null) =>
  tab === "advisor" || tab === "voice" || tab === "conversations" ? AI_ASSISTANT_ROUTES[tab] : null;

/**
 * The assistant was one page with `?tab=`; its three sections are real routes
 * now. Emails, the credit usage ledger and Stripe's checkout return still hand
 * merchants the old URLs, so the assistant home forwards them — query string
 * included — before rendering anything.
 *
 * Kept out of the page so phase 2 (the full-page chat) inherits the forwarding
 * untouched.
 *
 * Returns `null` for a plain visit to the assistant home, which is a page of
 * its own and not a legacy link.
 */
export const resolveAiAssistantLegacyRedirect = (
  params: AiAssistantSearchParams,
): string | null => {
  const query = toQuery(params);

  const tabRoute = routeForTab(query.get("tab"));
  if (tabRoute) {
    return withQuery(tabRoute, query);
  }

  // `?conversation=<id>` (voice callback emails, credit usage ledger) used to
  // select the conversations tab without naming it.
  if (query.get("conversation")) {
    return withQuery(AI_ASSISTANT_ROUTES.conversations, query);
  }

  // Stripe hands the merchant back with `?topup=…`, the renewal emails with
  // `?recharge=1`: both need the credit header, which now lives on the
  // configuration pages rather than on the chat home.
  const topup = query.get("topup");
  if (topup === "success" || topup === "cancelled" || query.get("recharge") === "1") {
    return withQuery(AI_ASSISTANT_ROUTES.advisor, query);
  }

  return null;
};

/**
 * `/dashboard/settings/ai-advisor` predates the assistant page: it *was* the
 * advisor's configuration, so anything not recognised as a deep link lands on
 * the advisor page rather than on the assistant home.
 */
export const resolveAiAdvisorSettingsRedirect = (params: AiAssistantSearchParams): string =>
  resolveAiAssistantLegacyRedirect(params) ??
  withQuery(AI_ASSISTANT_ROUTES.advisor, toQuery(params));
