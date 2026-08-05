"use client";

import { useTranslations } from "next-intl";

import { CreditCardSolidIcon } from "@louez/ui/icons";
import { cn, formatCurrency } from "@louez/utils";

import {
  DASHBOARD_ACCENT_FILL,
  type DashboardAccent,
} from "@/components/dashboard/shared/dashboard-accent";
import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";

/** Mirrors the `payment_method` enum of the database. */
export type PaymentMethodKey = "stripe" | "cash" | "card" | "transfer" | "check" | "other";

export interface PaymentMethodTotal {
  method: PaymentMethodKey;
  amount: number;
  count: number;
}

const METHOD_ACCENTS: Record<PaymentMethodKey, DashboardAccent> = {
  stripe: "primary",
  cash: "success",
  card: "progress",
  transfer: "submitted",
  check: "pending",
  other: "neutral",
};

interface PaymentMethodsBreakdownProps {
  data: PaymentMethodTotal[];
  currency?: string;
  className?: string;
}

/** Share of the period's receipts per payment method, ordered by amount. */
export const PaymentMethodsBreakdown = ({
  data,
  currency = "EUR",
  className,
}: PaymentMethodsBreakdownProps) => {
  const t = useTranslations("dashboard.statistics");
  const total = data.reduce((sum, entry) => sum + entry.amount, 0);

  if (total === 0) {
    return (
      <DashboardEmptyState
        icon={CreditCardSolidIcon}
        description={t("noRevenueData")}
        className={className}
      />
    );
  }

  // A method that brought nothing over the period would only add an empty row.
  const methods = data
    .filter((entry) => entry.amount > 0)
    .map((entry) => ({
      ...entry,
      label: t(`paymentMethods.${entry.method}`),
      percentage: Math.round((entry.amount / total) * 100),
      accent: METHOD_ACCENTS[entry.method],
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
        {methods.map((method) => (
          <div
            key={method.method}
            className={cn(
              "h-full transition-all duration-500",
              DASHBOARD_ACCENT_FILL[method.accent],
            )}
            style={{ width: `${method.percentage}%` }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {methods.map((method) => (
          <div key={method.method} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  DASHBOARD_ACCENT_FILL[method.accent],
                )}
              />
              <span className="truncate text-sm">{method.label}</span>
              <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                {t("paymentsCount", { count: method.count })}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm">
              <span className="font-medium tabular-nums">
                {formatCurrency(method.amount, currency)}
              </span>
              <span className="text-muted-foreground tabular-nums">({method.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
