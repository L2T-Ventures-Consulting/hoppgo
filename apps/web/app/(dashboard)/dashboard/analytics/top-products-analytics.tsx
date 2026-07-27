"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { Badge } from "@louez/ui";
import { CartSolidIcon, EyeIcon, ProductSolidIcon } from "@louez/ui/icons";

import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";

export interface TopProductData {
  productId: string;
  productName: string;
  views: number;
  cartAdditions: number;
  conversions: number;
}

interface TopProductsAnalyticsProps {
  products: TopProductData[];
}

export const TopProductsAnalytics = ({ products }: TopProductsAnalyticsProps) => {
  const t = useTranslations("dashboard.analytics");

  if (products.length === 0) {
    return <DashboardEmptyState icon={ProductSolidIcon} description={t("noProducts")} />;
  }

  const maxViews = Math.max(...products.map((product) => product.views), 1);

  return (
    <div className="space-y-2">
      {products.map((product, index) => {
        const viewsPercentage = (product.views / maxViews) * 100;
        const conversionRate =
          product.views > 0 ? ((product.conversions / product.views) * 100).toFixed(1) : "0";

        return (
          <div key={product.productId} className="relative overflow-hidden rounded-xl border p-3">
            {/* Relative-volume bar behind the row */}
            <div
              aria-hidden="true"
              className="bg-primary/5 absolute inset-y-0 left-0"
              style={{ width: `${viewsPercentage}%` }}
            />

            <div className="relative flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <Badge
                  variant="expired"
                  className="size-6 shrink-0 justify-center rounded-full tabular-nums"
                >
                  {index + 1}
                </Badge>
                <Link
                  href={`/dashboard/products/${product.productId}`}
                  className="truncate font-medium hover:underline"
                >
                  {product.productName}
                </Link>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-sm max-sm:pl-8.5">
                <span className="text-muted-foreground flex items-center gap-1">
                  <EyeIcon className="size-4" />
                  <span className="tabular-nums">{product.views.toLocaleString()}</span>
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <CartSolidIcon className="size-4" />
                  <span className="tabular-nums">{product.cartAdditions.toLocaleString()}</span>
                </span>
                <Badge variant="expired" className="tabular-nums">
                  {conversionRate}%
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
