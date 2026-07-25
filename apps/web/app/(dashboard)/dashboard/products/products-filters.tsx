"use client";

import { useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsList,
  TabsTab,
} from "@louez/ui";
import { cn } from "@louez/utils";

export const PRODUCT_STATUS_FILTERS = ["all", "active", "draft", "archived"] as const;

export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number];

interface Category {
  id: string;
  name: string;
  productCount?: number;
}

interface ProductCounts {
  all: number;
  active: number;
  draft: number;
  archived: number;
}

/**
 * Products list filters, kept in the URL so links stay shareable.
 *
 * `category` holds a comma-separated list of ids (nuqs' array format), which
 * keeps older single-category links (`?category=<id>`) working.
 * Navigation is shallow: the list itself is refetched by React Query.
 */
export function useProductsFilters() {
  return useQueryStates(
    {
      status: parseAsStringLiteral(PRODUCT_STATUS_FILTERS).withDefault("all"),
      category: parseAsArrayOf(parseAsString).withDefault([]),
    },
    { history: "push", shallow: true, clearOnDefault: true },
  );
}

interface ProductsFiltersProps {
  categories: Category[];
  counts: ProductCounts;
  isLoadingCategories?: boolean;
}

export function ProductsFilters({
  categories,
  counts,
  isLoadingCategories = false,
}: ProductsFiltersProps) {
  const t = useTranslations("dashboard.products");
  const [{ status, category: selectedCategoryIds }, setFilters] = useProductsFilters();

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
        <Tabs
          value={status}
          onValueChange={(value) => void setFilters({ status: value as ProductStatusFilter })}
        >
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

      {(categories.length > 0 || selectedCategoryIds.length > 0) && (
        <CategoryFilterCombobox
          categories={categories}
          isLoading={isLoadingCategories}
          selectedCategoryIds={selectedCategoryIds}
          onChange={(categoryIds) => void setFilters({ category: categoryIds })}
        />
      )}
    </div>
  );
}

function CategoryFilterCombobox({
  categories,
  isLoading,
  selectedCategoryIds,
  onChange,
}: {
  categories: Category[];
  isLoading: boolean;
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
}) {
  const t = useTranslations("dashboard.products");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedIds = new Set(selectedCategoryIds);
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const toggleCategory = (categoryId: string) => {
    const next = new Set(selectedIds);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    // Keep the category order so the URL stays stable across toggles
    onChange(categories.filter((category) => next.has(category.id)).map((category) => category.id));
  };

  const selectedCategories = categories.filter((category) => selectedIds.has(category.id));
  const triggerLabel =
    selectedIds.size === 0
      ? t("allCategories")
      : selectedCategories.length === 1
        ? selectedCategories[0].name
        : t("categoriesSelected", { count: selectedIds.size });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t("filterByCategory")}
            disabled={isLoading && categories.length === 0}
            className="group w-full justify-between sm:w-50 [&>span]:min-w-0 [&>span]:first:w-full"
          />
        }
      >
        <span className="flex-1 truncate text-start">{triggerLabel}</span>
        <ChevronsUpDown
          data-slot="icon"
          className="size-4 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0 pt-1 *:p-0">
        <Command open items={filteredCategories} filter={null}>
          <CommandInput
            placeholder={t("searchCategories")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <CommandEmpty>{t("noCategoriesFound")}</CommandEmpty>
          <CommandList className="max-h-80 not-empty:pt-0">
            <CommandGroup>
              {filteredCategories.map((category) => {
                const isSelected = selectedIds.has(category.id);

                return (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    {category.productCount !== undefined && (
                      <Badge variant="expired" className="tabular-nums">
                        {category.productCount}
                      </Badge>
                    )}
                    <Check className={cn("size-4 shrink-0", !isSelected && "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {selectedIds.size > 0 && (
          <div className="border-t p-1">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
              {t("allCategories")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
