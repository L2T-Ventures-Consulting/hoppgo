import { AlertTriangle, CalendarClock, PiggyBank, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DashboardStatCard } from "@/components/dashboard/shared/dashboard-stat-card";

import { formatCredits, LOW_BALANCE_CREDITS } from "./credits-format";
import { RechargeButton } from "./recharge-button";

interface AiCreditsOverviewProps {
  /** null = unlimited monthly allowance (the plan never runs out). */
  monthlyIncludedCredits: number | null;
  monthlyRemainingCredits: number | null;
  prepaidCredits: number;
  canTopup: boolean;
}

/**
 * The wallet at a glance: what is left in total, what the plan still includes
 * this month, and what was bought on top. The two pockets are shown separately
 * because they behave differently — the monthly one resets, the prepaid one
 * never expires.
 */
export const AiCreditsOverview = async ({
  monthlyIncludedCredits,
  monthlyRemainingCredits,
  prepaidCredits,
  canTopup,
}: AiCreditsOverviewProps) => {
  const t = await getTranslations("dashboard.aiCredits");

  const isUnlimited = monthlyRemainingCredits === null;
  const totalCredits = isUnlimited ? null : monthlyRemainingCredits + prepaidCredits;
  const isLow = totalCredits !== null && totalCredits < LOW_BALANCE_CREDITS;
  const monthlyUsed =
    monthlyIncludedCredits !== null && monthlyRemainingCredits !== null
      ? Math.max(0, monthlyIncludedCredits - monthlyRemainingCredits)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardStatCard
          title={t("page.totalTitle")}
          value={totalCredits === null ? t("unlimited") : formatCredits(totalCredits)}
          icon={Wallet}
          accent={isLow ? "pending" : "primary"}
          badge={isLow ? t("lowBalance") : undefined}
          subtitle={
            totalCredits === null
              ? t("page.totalUnlimitedHint")
              : t("conversationsHint", { count: Math.floor(totalCredits) })
          }
        />
        <DashboardStatCard
          title={t("page.monthlyTitle")}
          value={
            monthlyRemainingCredits === null
              ? t("unlimited")
              : formatCredits(monthlyRemainingCredits)
          }
          icon={CalendarClock}
          accent="submitted"
          subtitle={
            monthlyIncludedCredits === null
              ? t("page.monthlyUnlimitedHint")
              : monthlyIncludedCredits === 0
                ? t("page.monthlyNoneHint")
                : t("page.monthlyUsedHint", {
                    used: formatCredits(monthlyUsed),
                    included: formatCredits(monthlyIncludedCredits),
                  })
          }
        />
        <DashboardStatCard
          title={t("page.prepaidTitle")}
          value={formatCredits(prepaidCredits)}
          icon={PiggyBank}
          accent="success"
          subtitle={t("page.prepaidHint")}
        />
      </div>

      {isLow && (
        <div className="bg-badge-warning-background/60 ring-badge-warning-foreground/15 flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-3 ring-1 ring-inset">
          <AlertTriangle className="text-badge-warning-foreground h-4 w-4 shrink-0" />
          <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-relaxed">
            {t("lowBalanceHint")}
          </p>
          {canTopup && <RechargeButton size="sm" label={t("recharge")} />}
        </div>
      )}
    </div>
  );
};
