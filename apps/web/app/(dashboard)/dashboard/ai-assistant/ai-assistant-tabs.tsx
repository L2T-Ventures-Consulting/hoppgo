"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

import { History, MessagesSquare, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@louez/ui";

import { AI_ASSISTANT_TABS, type AiAssistantTab } from "./ai-assistant-tab";

const TAB_ICONS = {
  advisor: MessagesSquare,
  voice: PhoneCall,
  conversations: History,
} as const;

/** Lets anything rendered inside the tabs (the hero CTAs) jump to a tab. */
const SelectTabContext = createContext<((tab: AiAssistantTab) => void) | null>(null);

export const useSelectAiAssistantTab = () => useContext(SelectTabContext);

interface AiAssistantTabsProps {
  /** Server-resolved tab, used as the default when `?tab=` is absent. */
  initialTab: AiAssistantTab;
  /** Marketing hero, shown above the tabs while nothing is enabled yet. */
  hero?: ReactNode;
  advisor: ReactNode;
  voice: ReactNode;
  conversations: ReactNode;
}

/**
 * Splits the assistant into the two things it is configured for (web advisor,
 * voice agent) and the one thing it produces (conversations), so the daily
 * read is not buried under settings that are touched once.
 *
 * The active tab lives in `?tab=` and is written shallowly — switching tabs
 * never refetches the page, but the URL stays shareable. Both configuration
 * panels stay mounted so half-filled forms survive a detour through the
 * conversations list; the conversations panel does not, so its query only
 * fires once the merchant actually asks for it.
 */
export const AiAssistantTabs = ({
  initialTab,
  hero,
  advisor,
  voice,
  conversations,
}: AiAssistantTabsProps) => {
  const t = useTranslations("dashboard.aiAssistant.tabs");

  const [{ tab }, setParams] = useQueryStates(
    {
      tab: parseAsStringLiteral(AI_ASSISTANT_TABS).withDefault(initialTab),
      conversation: parseAsString,
    },
    { history: "replace", shallow: true, clearOnDefault: false },
  );

  const selectTab = useCallback(
    (next: AiAssistantTab) => {
      // Leaving the conversations tab drops the deep link that opened it,
      // otherwise coming back would reopen a sheet the merchant just closed.
      void setParams({ tab: next, conversation: null });
    },
    [setParams],
  );

  const handleValueChange = useCallback(
    (value: unknown) => {
      if (
        typeof value === "string" &&
        (AI_ASSISTANT_TABS as readonly string[]).includes(value) &&
        value !== tab
      ) {
        selectTab(value as AiAssistantTab);
      }
    },
    [selectTab, tab],
  );

  return (
    <SelectTabContext.Provider value={selectTab}>
      <div className="space-y-4 sm:space-y-6">
        {hero}

        <Tabs value={tab} onValueChange={handleValueChange} className="gap-4 sm:gap-6">
          {/* Full-width and scrollable on phones: the three labels are worth
              more than making them fit by truncating them. */}
          <TabsList
            className="w-full max-w-full overflow-x-auto [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden"
            aria-label={t("label")}
          >
            {AI_ASSISTANT_TABS.map((value) => {
              const Icon = TAB_ICONS[value];
              return (
                <TabsTab key={value} value={value}>
                  <Icon />
                  {t(value)}
                </TabsTab>
              );
            })}
          </TabsList>

          <TabsPanel value="advisor" keepMounted>
            {advisor}
          </TabsPanel>
          <TabsPanel value="voice" keepMounted>
            {voice}
          </TabsPanel>
          <TabsPanel value="conversations">{conversations}</TabsPanel>
        </Tabs>
      </div>
    </SelectTabContext.Provider>
  );
};
