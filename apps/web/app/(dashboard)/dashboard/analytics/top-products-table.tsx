"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@louez/ui";
import { ProductSolidIcon } from "@louez/ui/icons";
import { formatCurrency } from "@louez/utils";

import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";

interface TopProduct {
  productId: string | null;
  productName: string;
  totalQuantity: number;
  totalRevenue: string;
  reservationCount: number;
}

interface TopProductsTableProps {
  products: TopProduct[];
}

/** Gold / silver / bronze for the podium, muted numbers below. */
const RANK_VARIANTS = ["review", "expired", "pending"] as const;

export const TopProductsTable = ({ products }: TopProductsTableProps) => {
  const t = useTranslations("dashboard.statistics");

  if (products.length === 0) {
    return <DashboardEmptyState icon={ProductSolidIcon} description={t("noRentalData")} />;
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12.5">#</TableHead>
            <TableHead>{t("topProducts.product")}</TableHead>
            <TableHead className="text-center">{t("topProducts.rentals")}</TableHead>
            <TableHead className="hidden text-center md:table-cell">
              {t("topProducts.totalQuantity")}
            </TableHead>
            <TableHead className="text-right">{t("topProducts.revenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => (
            <TableRow key={product.productId}>
              <TableCell className="font-medium">
                {index < RANK_VARIANTS.length ? (
                  <Badge variant={RANK_VARIANTS[index]} className="tabular-nums">
                    {index + 1}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                )}
              </TableCell>
              <TableCell className="max-w-55">
                <Link
                  href={`/dashboard/products/${product.productId}`}
                  className="block truncate font-medium hover:underline"
                >
                  {product.productName}
                </Link>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="expired" className="tabular-nums">
                  {product.reservationCount}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-center md:table-cell">
                {t("topProducts.units", { count: product.totalQuantity })}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                {formatCurrency(parseFloat(product.totalRevenue))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
