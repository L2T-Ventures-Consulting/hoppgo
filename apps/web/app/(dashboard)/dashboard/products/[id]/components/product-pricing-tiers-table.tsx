"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatCurrency } from "@louez/utils";

import { formatPeriodDuration } from "./util.product-pricing";

/** Rows kept on screen before the merchant asks for the whole grid. */
const COLLAPSED_ROW_COUNT = 5;

interface ProductPricingTiersTableTier {
  id: string;
  period: number | null;
  price: string | null;
}

interface ProductPricingTiersTableProps {
  tiers: ProductPricingTiersTableTier[];
  currency: string;
}

export const ProductPricingTiersTable = ({ tiers, currency }: ProductPricingTiersTableProps) => {
  const t = useTranslations("dashboard.products.detail.info");
  const tForm = useTranslations("dashboard.products.form");
  const [isExpanded, setIsExpanded] = useState(false);

  if (tiers.length === 0) return null;

  const hiddenCount = tiers.length - COLLAPSED_ROW_COUNT;
  // A grid that only overflows by a row is cheaper to read than to unfold.
  const isCollapsible = hiddenCount > 1;
  const visibleTiers = isCollapsible && !isExpanded ? tiers.slice(0, COLLAPSED_ROW_COUNT) : tiers;

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th className="px-3 py-2 text-left font-medium">
              {tForm("pricingTiers.fromDuration")}
            </th>
            <th className="px-3 py-2 text-right font-medium">{tForm("pricePerDay")}</th>
          </tr>
        </thead>
        <tbody>
          {visibleTiers.map((tier) => (
            <tr key={tier.id} className="border-t">
              <td className="px-3 py-2">{formatPeriodDuration(tier.period)}</td>
              <td className="px-3 py-2 text-right">
                {tier.price ? formatCurrency(parseFloat(tier.price), currency) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isCollapsible && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring flex w-full items-center justify-center gap-1.5 border-t px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {isExpanded ? (
            <>
              {t("ratesShowLess")}
              <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              {t("ratesShowMore", { count: tiers.length })}
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
