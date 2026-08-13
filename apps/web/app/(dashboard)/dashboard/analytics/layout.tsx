import { getTranslations } from "next-intl/server";

import { UnifiedPeriodFilter } from "./unified-period-filter";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Header shared by the analytics sub-pages (sales, traffic): the title and the
 * period filter stay put while only the section below swaps.
 */
export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("dashboard.analytics");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t("description")}</p>
        </div>
        <UnifiedPeriodFilter className="shrink-0" />
      </div>

      {children}
    </div>
  );
}
