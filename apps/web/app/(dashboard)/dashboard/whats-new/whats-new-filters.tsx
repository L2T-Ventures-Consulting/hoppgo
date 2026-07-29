"use client";

import { useTranslations } from "next-intl";

import { Badge, Tabs, TabsList, TabsTab } from "@louez/ui";

import { WHATS_NEW_CATEGORIES } from "@/lib/whats-new.constants";

import { isWhatsNewFilter, WHATS_NEW_FILTERS, type WhatsNewFilter } from "./util.whats-new-page";

interface WhatsNewFiltersProps {
  counts: Record<WhatsNewFilter, number>;
  onValueChange: (value: WhatsNewFilter) => void;
  value: WhatsNewFilter;
}

/** Underlined tabs: the filter narrows the feed rather than relaying it out. */
export const WhatsNewFilters = ({ counts, onValueChange, value }: WhatsNewFiltersProps) => {
  const t = useTranslations("dashboard.whatsNew");

  return (
    <div className="-mx-1 max-w-full min-w-0 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Tabs
        onValueChange={(next) => {
          if (isWhatsNewFilter(next)) onValueChange(next);
        }}
        value={value}
      >
        <TabsList variant="underline">
          {WHATS_NEW_FILTERS.map((filter) => (
            <TabsTab key={filter} value={filter}>
              {filter === "all" ? t("filters.all") : t(WHATS_NEW_CATEGORIES[filter].labelKey)}
              <Badge size="sm" variant={value === filter ? "progress" : "expired"}>
                {counts[filter]}
              </Badge>
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};
