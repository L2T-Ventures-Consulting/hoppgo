"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Calendar as CalendarIcon,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ListFilter,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { z } from "zod";

import {
  Badge,
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from "@louez/ui";
import { cn } from "@louez/utils";

import { ProductImage } from "@/components/product/product-image";

import { getStatusDotClass } from "@/components/dashboard/reservations-timeline/timeline-reservation-bar";

import {
  CALENDAR_RANGES,
  type CalendarRange,
  DEFAULT_VISIBLE_STATUSES,
  RESERVATION_STATUSES,
  TODAY_OPERATIONS,
  type TodayOperation,
} from "./calendar-query";
import type { Product } from "./types";

// =============================================================================
// Shared filter state — planning and calendar read/write the same URL params
// =============================================================================

const timelineFiltersStorageSchema = z.object({
  range: z.enum(CALENDAR_RANGES),
  productIds: z.array(z.string().min(1)),
  statuses: z.array(z.enum(RESERVATION_STATUSES)),
  operation: z.enum(TODAY_OPERATIONS).nullable(),
});

const TIMELINE_FILTERS_STORAGE_PREFIX = "reservations-timeline-filters:v1";

export interface TimelineFilters {
  range: CalendarRange;
  hasActiveFilters: boolean;
  /** Empty means "all products" */
  selectedProductIds: Set<string>;
  selectedProducts: Product[];
  hiddenStatuses: Set<string>;
  todayOperation: TodayOperation | null;
  setRange: (range: CalendarRange) => void;
  setSelectedProductIds: (productIds: string[]) => void;
  toggleStatus: (status: string) => void;
  setVisibleStatuses: (visible: Set<string>) => void;
  setTodayOperation: (operation: TodayOperation | null) => void;
  resetFilters: () => void;
}

export function useTimelineFilters(products: Product[], storeId: string): TimelineFilters {
  const [state, setState] = useQueryStates(
    {
      range: parseAsStringLiteral(CALENDAR_RANGES).withDefault("week"),
      productIds: parseAsArrayOf(parseAsString).withDefault([]),
      // Legacy single-product links (old calendar page, month-view drill-downs)
      productId: parseAsString,
      operation: parseAsStringLiteral(TODAY_OPERATIONS),
      period: parseAsString,
      statuses: parseAsArrayOf(parseAsStringLiteral(RESERVATION_STATUSES)).withDefault(
        DEFAULT_VISIBLE_STATUSES,
      ),
    },
    { history: "replace" },
  );
  const didAttemptRestoreRef = useRef(false);
  const [hasRestoredFilters, setHasRestoredFilters] = useState(false);
  const storageKey = `${TIMELINE_FILTERS_STORAGE_PREFIX}:${storeId}`;

  const selectedProducts = useMemo(() => {
    const ids =
      state.productIds.length > 0
        ? state.productIds
        : state.productId && state.productId !== "all"
          ? [state.productId]
          : [];
    const idSet = new Set(ids);

    return products.filter((product) => idSet.has(product.id));
  }, [products, state.productId, state.productIds]);

  const selectedProductIds = useMemo(
    () => new Set(selectedProducts.map((product) => product.id)),
    [selectedProducts],
  );

  const hiddenStatuses = useMemo(
    () =>
      new Set<string>(RESERVATION_STATUSES.filter((status) => !state.statuses.includes(status))),
    [state.statuses],
  );

  const hasCustomStatuses =
    state.statuses.length !== DEFAULT_VISIBLE_STATUSES.length ||
    DEFAULT_VISIBLE_STATUSES.some((status) => !state.statuses.includes(status));
  const hasActiveFilters =
    selectedProductIds.size > 0 || state.operation !== null || hasCustomStatuses;

  // URL values win so shared links stay deterministic. Missing filters are
  // restored from storage after hydration, scoped to the active store.
  useEffect(() => {
    if (didAttemptRestoreRef.current) return;
    didAttemptRestoreRef.current = true;

    const restoreFilters = async () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return;

        const parsedJson: unknown = JSON.parse(raw);
        const parsed = timelineFiltersStorageSchema.safeParse(parsedJson);
        if (!parsed.success) return;

        const searchParams = new URLSearchParams(window.location.search);
        const hasProductFilter = searchParams.has("productIds") || searchParams.has("productId");
        const hasOperationFilter = searchParams.has("operation") || searchParams.has("period");
        const availableProductIds = new Set(products.map((product) => product.id));
        const restoredProductIds = parsed.data.productIds.filter((productId) =>
          availableProductIds.has(productId),
        );

        await setState({
          range: searchParams.has("range") ? state.range : parsed.data.range,
          productIds: hasProductFilter ? state.productIds : restoredProductIds,
          productId: hasProductFilter ? state.productId : null,
          statuses: searchParams.has("statuses") ? state.statuses : parsed.data.statuses,
          operation: hasOperationFilter ? state.operation : parsed.data.operation,
          period: hasOperationFilter ? state.period : parsed.data.operation ? "today" : null,
        });
      } catch {
        // Invalid or unavailable storage falls back to the URL/default state.
      } finally {
        setHasRestoredFilters(true);
      }
    };

    void restoreFilters();
  }, [
    products,
    setState,
    state.operation,
    state.period,
    state.productId,
    state.productIds,
    state.range,
    state.statuses,
    storageKey,
  ]);

  useEffect(() => {
    if (!hasRestoredFilters) return;

    const storedFilters = {
      range: state.range,
      productIds: Array.from(selectedProductIds),
      statuses: state.statuses,
      operation: state.operation,
    } satisfies z.infer<typeof timelineFiltersStorageSchema>;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(storedFilters));
    } catch {
      // Persistence is best-effort when storage is disabled or full.
    }
  }, [
    hasRestoredFilters,
    selectedProductIds,
    state.operation,
    state.range,
    state.statuses,
    storageKey,
  ]);

  // Keep canonical status order so nuqs' clearOnDefault recognizes the
  // default set and drops the param from the URL.
  const setVisibleStatuses = (visible: Set<string>) => {
    void setState({
      statuses: RESERVATION_STATUSES.filter((status) => visible.has(status)),
    });
  };

  return {
    range: state.range,
    hasActiveFilters,
    selectedProductIds,
    selectedProducts,
    hiddenStatuses,
    todayOperation: state.operation,
    setRange: (range) => void setState({ range }),
    setSelectedProductIds: (productIds) => void setState({ productIds, productId: null }),
    toggleStatus: (status) => {
      const visible = new Set<string>(state.statuses);
      if (visible.has(status)) {
        visible.delete(status);
      } else {
        visible.add(status);
      }
      setVisibleStatuses(visible);
    },
    setVisibleStatuses,
    setTodayOperation: (operation) =>
      void setState({
        operation,
        period: operation ? "today" : null,
      }),
    resetFilters: () =>
      void setState({
        productIds: [],
        productId: null,
        statuses: DEFAULT_VISIBLE_STATUSES,
        operation: null,
        period: null,
      }),
  };
}

// =============================================================================
// Product filter — same shape as the "Add item" picker on the edit page
// =============================================================================

function ProductFilterCombobox({
  products,
  selectedProductIds,
  onChange,
}: {
  products: Product[];
  selectedProductIds: Set<string>;
  onChange: (productIds: string[]) => void;
}) {
  const t = useTranslations("dashboard.calendar");
  const tTimeline = useTranslations("dashboard.calendar.timeline");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const toggleProduct = (productId: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    // Preserve the product order so the URL stays stable across toggles
    onChange(products.filter((product) => next.has(product.id)).map((product) => product.id));
  };

  const triggerLabel =
    selectedProductIds.size === 0
      ? t("allProducts")
      : selectedProductIds.size === 1
        ? (products.find((product) => selectedProductIds.has(product.id))?.name ?? t("allProducts"))
        : tTimeline("productsSelected", { count: selectedProductIds.size });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t("filterByProduct")}
            className="group w-44 justify-between [&>span]:min-w-0 [&>span]:first:w-full "
          />
        }
      >
        <span className=" flex-1 truncate text-start">{triggerLabel}</span>
        <ChevronsUpDown
          data-slot="icon"
          className="size-4 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 pt-1 sm:w-80 *:p-0">
        <Command open items={filteredProducts} filter={null}>
          <CommandInput
            placeholder={tTimeline("searchProductsPlaceholder", { count: products.length })}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <CommandEmpty>{tTimeline("noProductsFound")}</CommandEmpty>
          <CommandList className="max-h-[320px] not-empty:pt-0">
            <CommandGroup>
              {filteredProducts.map((product) => {
                const isSelected = selectedProductIds.has(product.id);

                return (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className="flex items-center gap-2"
                  >
                    <ProductImage
                      src={product.images?.[0]}
                      alt=""
                      sizes="32px"
                      containerClassName="w-8 shrink-0 rounded-md"
                    />
                    <span className="min-w-0 flex-1 truncate">{product.name}</span>
                    <Badge variant="expired" className="tabular-nums">
                      {t("productsView.units", { count: product.quantity })}
                    </Badge>
                    <Check className={cn("size-4 shrink-0", !isSelected && "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {selectedProductIds.size > 0 && (
          <div className="border-t p-1">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
              {t("allProducts")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Toolbar
// =============================================================================

interface TimelineToolbarProps {
  products: Product[];
  filters: TimelineFilters;
  /** Month currently centered in the scroller */
  monthLabel: string;
  isFetching: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  /** Views snapshot their scroll anchor before switching zoom */
  onRangeChange: (range: CalendarRange) => void;
}

export function TimelineToolbar({
  products,
  filters,
  monthLabel,
  isFetching,
  onPrevious,
  onNext,
  onToday,
  onRangeChange,
}: TimelineToolbarProps) {
  const t = useTranslations("dashboard.calendar");
  const tTimeline = useTranslations("dashboard.calendar.timeline");

  const { hiddenStatuses, range } = filters;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={tTimeline("previous")}
          onClick={onPrevious}
        >
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label={tTimeline("next")} onClick={onNext}>
          <ChevronRight />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          {t("today")}
        </Button>
      </div>

      <span className="text-sm font-medium first-letter:uppercase">{monthLabel}</span>

      {isFetching && <Spinner className="text-muted-foreground size-3.5" />}

      <ScrollArea
        orientation="horizontal"
        scrollFade
        className="h-auto w-full min-w-0 basis-full sm:ml-auto sm:w-auto sm:max-w-full sm:basis-auto"
      >
        <div className="flex w-max touch-pan-x items-center gap-1">
          <Select
            value={filters.todayOperation ?? "all"}
            onValueChange={(value: string | null) => {
              if (value === null) return;
              filters.setTodayOperation(value === "all" ? null : (value as TodayOperation));
              if (value !== "all") onToday();
            }}
          >
            <SelectTrigger className="w-44" aria-label={tTimeline("operationFilter")}>
              <CalendarClock data-slot="icon" className="size-4 shrink-0" />
              <SelectValue>
                {filters.todayOperation
                  ? tTimeline(
                      filters.todayOperation === "departure" ? "todaysDepartures" : "todaysReturns",
                    )
                  : tTimeline("allOperations")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label={tTimeline("allOperations")}>
                {tTimeline("allOperations")}
              </SelectItem>
              <SelectItem value="departure" label={tTimeline("todaysDepartures")}>
                {tTimeline("todaysDepartures")}
              </SelectItem>
              <SelectItem value="return" label={tTimeline("todaysReturns")}>
                {tTimeline("todaysReturns")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger
              render={<Button variant="outline" aria-label={tTimeline("statusFilter")} />}
            >
              <ListFilter />
              {hiddenStatuses.size > 0 && (
                <span className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold">
                  {RESERVATION_STATUSES.length - hiddenStatuses.size}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52">
              <div className="space-y-0.5 ">
                {RESERVATION_STATUSES.map((status) => (
                  <Label
                    key={status}
                    className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal"
                  >
                    <Checkbox
                      checked={!hiddenStatuses.has(status)}
                      onCheckedChange={() => filters.toggleStatus(status)}
                    />
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", getStatusDotClass(status))}
                    />
                    <span className="flex-1">{t(`status.${status}`)}</span>
                  </Label>
                ))}
                {hiddenStatuses.size > 0 && (
                  <Button
                    variant="tertiary"
                    className="mt-1 w-full"
                    onClick={() => filters.setVisibleStatuses(new Set(RESERVATION_STATUSES))}
                  >
                    {tTimeline("showAll")}
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Select
            value={range}
            onValueChange={(value: string | null) => {
              if (value !== null) onRangeChange(value as CalendarRange);
            }}
          >
            <SelectTrigger className="w-36">
              <CalendarIcon data-slot="icon" className=" size-4 shrink-0" />
              <SelectValue>{t(`periods.${range}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CALENDAR_RANGES.map((period) => (
                <SelectItem key={period} value={period} label={t(`periods.${period}`)}>
                  {t(`periods.${period}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ProductFilterCombobox
            products={products}
            selectedProductIds={filters.selectedProductIds}
            onChange={filters.setSelectedProductIds}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
