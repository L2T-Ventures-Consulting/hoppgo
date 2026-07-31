export const AI_ASSISTANT_TABS = ["advisor", "voice", "conversations"] as const;
export type AiAssistantTab = (typeof AI_ASSISTANT_TABS)[number];

/**
 * Resolves the tab a request lands on: an explicit `?tab=` wins, then the
 * `?conversation=<id>` deep link used by the callback emails and the credit
 * usage ledger (which must open the conversations tab without saying so).
 *
 * Lives outside the client tabs component so the server page can call it.
 */
export const resolveAiAssistantTab = (
  tabParam: string | undefined,
  conversationParam: string | undefined,
): AiAssistantTab => {
  if ((AI_ASSISTANT_TABS as readonly string[]).includes(tabParam ?? "")) {
    return tabParam as AiAssistantTab;
  }
  return conversationParam ? "conversations" : "advisor";
};
