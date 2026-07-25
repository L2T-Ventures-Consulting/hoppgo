"use client";

import { useMemo } from "react";

import { useTranslations } from "next-intl";
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { Badge, Tabs, TabsList, TabsTab } from "@louez/ui";

import {
  CategoryFilterCombobox,
  type CategoryFilterOption,
} from "./category-filter-combobox";
import {
  PRODUCT_STATUS_FILTERS,
  type ProductCounts,
  type ProductStatusFilter,
} from "./types";

/**
 * Products list filters, kept in the URL so links stay shareable.
 *
 * `category` holds a comma-separated list of ids (nuqs' array format), which
 * keeps older single-category links (`?category=<id>`) working.
 * Navigation is shallow: the list itself is refetched by React Query.
 */
export function useProductsFilters() {
  const [state, setFilters] = useQueryStates(
    {
      status: parseAsStringLiteral(PRODUCT_STATUS_FILTERS).withDefault("all"),
      category: parseAsArrayOf(parseAsString).withDefault([]),
    },
    { history: "push", shallow: true, clearOnDefault: true },
  );

  // `all` is the legacy "no category filter" value of the former single select
  const categoryIds = useMemo(
    () => state.category.filter((id) => id && id !== "all"),
    [state.category],
  );

  return {
    status: state.status,
    categoryIds,
    setStatus: (status: ProductStatusFilter) => void setFilters({ status }),
    setCategoryIds: (category: string[]) => void setFilters({ category }),
  };
}

interface ProductsFiltersProps {
  categories: CategoryFilterOption[];
  counts: ProductCounts;
  isLoadingCategories?: boolean;
}

export const ProductsFilters = ({
  categories,
  counts,
  isLoadingCategories = false,
}: ProductsFiltersProps) => {
  const t = useTranslations("dashboard.products");
  const { status, categoryIds, setStatus, setCategoryIds } = useProductsFilters();

  const statusOptions = [
    { value: "all", label: t("filters.all") },
    { value: "active", label: t("filters.active") },
    { value: "draft", label: t("filters.draft") },
    { value: "archived", label: t("filters.archived") },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
      {/* Status filter — same underlined tabs as the reservations page,
          horizontally scrollable when overflowing */}
      <div className="-mx-1 min-w-0 max-w-full overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Tabs value={status} onValueChange={(value) => setStatus(value as ProductStatusFilter)}>
          <TabsList variant="underline">
            {statusOptions.map((option) => {
              const isActive = status === option.value;

              return (
                <TabsTab key={option.value} value={option.value}>
                  {option.label}
                  <Badge variant={isActive ? "progress" : "expired"} size="sm">
                    {counts[option.value]}
                  </Badge>
                </TabsTab>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {(categories.length > 0 || categoryIds.length > 0) && (
        <CategoryFilterCombobox
          categories={categories}
          isLoading={isLoadingCategories}
          selectedCategoryIds={categoryIds}
          onChange={setCategoryIds}
        />
      )}
    </div>
  );
};
