"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, UIEvent } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useQueries } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@louez/utils";

import {
  getTimelineStatus,
  TimelineReservationBar,
} from "@/components/dashboard/reservations-timeline/timeline-reservation-bar";
import {
  type TimelineReservation,
  type TimelineReservationItem,
  addDays,
  compareByDisplayOrder,
  computeMonthSegments,
  diffInDays,
  formatDeliveryAddress,
  getMondayOf,
  isWeekend,
  stackReservations,
} from "@/components/dashboard/reservations-timeline/timeline-utils";

import { fetchReservationsForPeriod } from "./actions";
import {
  type CalendarRange,
  matchesTodayOperation,
  parseCalendarDateParam,
} from "./calendar-query";
import { TimelineToolbar, useTimelineFilters } from "./timeline-toolbar";
import type { Product, Reservation } from "./types";

// =============================================================================
// Constants — mirror the planning timeline so both views feel identical
// =============================================================================

const DAY_WIDTHS: Record<CalendarRange, number> = {
  week: 96,
  twoWeeks: 60,
  month: 38,
};

/** Days scrolled per arrow click */
const NAV_DAYS: Record<CalendarRange, number> = {
  week: 7,
  twoWeeks: 14,
  month: 30,
};

const MONTH_ROW_HEIGHT = 26;
const DAY_ROW_HEIGHT = 42;
const HEADER_HEIGHT = MONTH_ROW_HEIGHT + DAY_ROW_HEIGHT;
const ROW_HEIGHT = 34;
const BAR_HEIGHT = 30;
/** Minimum stacked lanes so an empty period still shows a usable grid */
const MIN_LANES = 5;

/** Prefilled times for drag-created reservations */
const DRAG_CREATE_START_HOUR = 9;
const DRAG_CREATE_END_HOUR = 18;
/** Prevent a click or tiny pointer jitter from starting a reservation */
const DRAG_START_THRESHOLD_PX = 4;

/** Days loaded initially before the anchor date (Monday aligned) */
const INITIAL_PAST_DAYS = 28;
const INITIAL_DAYS_COUNT = 84;
/** Days added per infinite-scroll extension (multiple of 7 keeps Monday alignment) */
const EXTEND_CHUNK_DAYS = 28;
/** Distance from an edge (px) that triggers an extension */
const EXTEND_THRESHOLD_PX = 320;
/** Hard cap on the loaded window to keep the DOM bounded */
const MAX_DAYS_COUNT = 560;

// React Query chunking: time is split into fixed 28-day pages aligned on a
// fixed epoch Monday, so every visit hits the same cache keys.
const CHUNK_DAYS = 28;
const CHUNK_EPOCH = new Date(2024, 0, 1); // Monday, Jan 1 2024

// =============================================================================
// Types
// =============================================================================

interface DragSelection {
  startIndex: number;
  endIndex: number;
}

interface DragAnchor {
  dayIndex: number;
  clientX: number;
  clientY: number;
}

interface ReservationsCalendarViewProps {
  products: Product[];
  currency: string;
  storeId: string;
}

// =============================================================================
// Component
// =============================================================================

export function ReservationsCalendarView({
  products,
  currency,
  storeId,
}: ReservationsCalendarViewProps) {
  const tTimeline = useTranslations("dashboard.calendar.timeline");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---------------------------------------------------------------------------
  // URL-persisted view state (zoom + status/product filters) — shareable links
  // ---------------------------------------------------------------------------

  const filters = useTimelineFilters(products, storeId);
  const { hiddenStatuses, selectedProductIds, todayOperation } = filters;

  const zoom = filters.range;
  const dayWidth = DAY_WIDTHS[zoom];

  // ---------------------------------------------------------------------------
  // Window state (infinite horizontal scroll)
  // ---------------------------------------------------------------------------

  // Anchor on the `date` param when present (legacy links)
  const anchorDateRef = useRef(
    parseCalendarDateParam(searchParams.get("date") ?? undefined) ?? new Date(),
  );

  const [windowStart, setWindowStart] = useState(() =>
    getMondayOf(addDays(anchorDateRef.current, -INITIAL_PAST_DAYS)),
  );
  const [daysCount, setDaysCount] = useState(INITIAL_DAYS_COUNT);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingPrependRef = useRef(0);
  const appendLockRef = useRef(false);
  const zoomAnchorRef = useRef<number | null>(null);
  const didInitialScrollRef = useRef(false);

  const handleZoomChange = (range: CalendarRange) => {
    const element = scrollerRef.current;
    if (element) {
      zoomAnchorRef.current = element.scrollLeft / dayWidth;
    }
    filters.setRange(range);
  };

  // ---------------------------------------------------------------------------
  // Data — React Query, one cached query per fixed 28-day chunk. Scrolling
  // mounts the next chunks; cached chunks render instantly, so navigating
  // through time never shows a loading state.
  // ---------------------------------------------------------------------------

  const chunkIndices = useMemo(() => {
    const first = Math.floor(diffInDays(CHUNK_EPOCH, windowStart) / CHUNK_DAYS);
    const last = Math.floor(
      diffInDays(CHUNK_EPOCH, addDays(windowStart, daysCount - 1)) / CHUNK_DAYS,
    );
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }, [windowStart, daysCount]);

  const { reservations, isFetching, hasLoadedOnce } = useQueries({
    queries: chunkIndices.map((index) => {
      const start = addDays(CHUNK_EPOCH, index * CHUNK_DAYS);
      const end = addDays(start, CHUNK_DAYS - 1);
      end.setHours(23, 59, 59, 999);

      return {
        queryKey: ["dashboard-calendar-reservations", index],
        queryFn: async () => {
          const result = await fetchReservationsForPeriod(start.toISOString(), end.toISOString());
          if ("error" in result) throw new Error(result.error);
          return result.data;
        },
        staleTime: 30_000,
      };
    }),
    combine: (results) => {
      const byId = new Map<string, Reservation>();
      for (const result of results) {
        for (const reservation of result.data ?? []) {
          byId.set(reservation.id, reservation as unknown as Reservation);
        }
      }
      return {
        reservations: Array.from(byId.values()),
        isFetching: results.some((result) => result.isFetching),
        hasLoadedOnce: results.some((result) => result.data !== undefined),
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Derived layout data
  // ---------------------------------------------------------------------------

  const timelineEntries = useMemo((): TimelineReservation[] => {
    return reservations
      .filter((reservation) => {
        if (!matchesTodayOperation(reservation, todayOperation)) {
          return false;
        }
        if (hiddenStatuses.has(getTimelineStatus(reservation.status))) {
          return false;
        }
        if (selectedProductIds.size === 0) return true;
        return reservation.items.some(
          (item) => item.product !== null && selectedProductIds.has(item.product.id),
        );
      })
      .map((reservation) => {
        // Aggregate line items per product for the tooltip, then order them
        // like the catalog so the same reservation always reads the same way.
        const linesByProduct = new Map<
          string,
          TimelineReservationItem & { displayOrder: number }
        >();
        for (const item of reservation.items) {
          const name = item.productSnapshot?.name || item.product?.name;
          if (!name) continue;

          // Custom items and deleted products have no live product to key on.
          const key = item.product?.id ?? `snapshot:${name}`;
          const existing = linesByProduct.get(key);
          if (existing) {
            existing.quantity += Math.max(1, item.quantity);
            continue;
          }

          linesByProduct.set(key, {
            productId: item.product?.id ?? null,
            name,
            quantity: Math.max(1, item.quantity),
            imageUrl: item.product?.images?.[0] ?? item.productSnapshot?.images?.[0] ?? null,
            displayOrder: item.product?.displayOrder ?? 0,
          });
        }

        return {
          id: reservation.id,
          number: reservation.number,
          status: reservation.status,
          startDate: new Date(reservation.startDate),
          endDate: new Date(reservation.endDate),
          customerId: reservation.customer?.id ?? null,
          customerName: reservation.customer
            ? [reservation.customer.firstName, reservation.customer.lastName]
                .filter(Boolean)
                .join(" ") || "—"
            : "—",
          totalAmount: reservation.totalAmount,
          quantity: reservation.items.reduce((sum, item) => sum + item.quantity, 0),
          assignedUnitIds: [],
          items: Array.from(linesByProduct.values())
            .sort(compareByDisplayOrder)
            .map(({ displayOrder: _displayOrder, ...item }) => item),
          outboundDeliveryAddress:
            reservation.outboundMethod === "address"
              ? formatDeliveryAddress({
                  address: reservation.deliveryAddress,
                  city: reservation.deliveryCity,
                  postalCode: reservation.deliveryPostalCode,
                  country: reservation.deliveryCountry,
                })
              : null,
          returnDeliveryAddress:
            reservation.returnMethod === "address"
              ? formatDeliveryAddress({
                  address: reservation.returnAddress,
                  city: reservation.returnCity,
                  postalCode: reservation.returnPostalCode,
                  country: reservation.returnCountry,
                })
              : null,
        };
      });
  }, [reservations, hiddenStatuses, selectedProductIds, todayOperation]);

  const { placed, laneCount } = useMemo(
    () => stackReservations({ reservations: timelineEntries, windowStart }),
    [timelineEntries, windowStart],
  );
  const lanes = Math.max(laneCount, MIN_LANES);

  const days = useMemo(
    () => Array.from({ length: daysCount }, (_, index) => addDays(windowStart, index)),
    [windowStart, daysCount],
  );

  const monthSegments = useMemo(
    () => computeMonthSegments(windowStart, daysCount),
    [windowStart, daysCount],
  );

  const todayIndex = diffInDays(windowStart, new Date());

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale],
  );
  const dayNameFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );

  const formatMonthLabel = (date: Date) => {
    const label = monthFormatter.format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const [visibleMonthLabel, setVisibleMonthLabel] = useState(() =>
    formatMonthLabel(anchorDateRef.current),
  );

  // ---------------------------------------------------------------------------
  // Scrolling: initial position, label sync, infinite extension
  // ---------------------------------------------------------------------------

  const updateVisibleLabel = (element: HTMLDivElement) => {
    const centerOffset = element.scrollLeft + element.clientWidth / 2;
    const index = Math.max(0, Math.min(daysCount - 1, Math.floor(centerOffset / dayWidth)));
    const label = formatMonthLabel(addDays(windowStart, index));
    setVisibleMonthLabel((previous) => (previous === label ? previous : label));
  };

  // Center the anchor date on first mount (and again after a window reset)
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;

    const anchorIndex = diffInDays(windowStart, anchorDateRef.current);
    const target = anchorIndex * dayWidth - Math.max(0, element.clientWidth / 3);
    element.scrollLeft = Math.max(0, target);
    updateVisibleLabel(element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart]);

  // Compensate scroll position after prepending days
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element || pendingPrependRef.current === 0) return;
    element.scrollLeft += pendingPrependRef.current * dayWidth;
    pendingPrependRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart]);

  // Keep the leftmost visible day stable across zoom changes
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element || zoomAnchorRef.current === null) return;
    element.scrollLeft = zoomAnchorRef.current * dayWidth;
    zoomAnchorRef.current = null;
    updateVisibleLabel(element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  useEffect(() => {
    appendLockRef.current = false;
  }, [daysCount]);

  useEffect(
    () => () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    },
    [],
  );

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateVisibleLabel(element);

      if (daysCount >= MAX_DAYS_COUNT) return;

      const maxScrollLeft = element.scrollWidth - element.clientWidth;

      if (element.scrollLeft < EXTEND_THRESHOLD_PX && pendingPrependRef.current === 0) {
        pendingPrependRef.current = EXTEND_CHUNK_DAYS;
        setWindowStart((previous) => addDays(previous, -EXTEND_CHUNK_DAYS));
        setDaysCount((previous) => previous + EXTEND_CHUNK_DAYS);
      } else if (
        maxScrollLeft - element.scrollLeft < EXTEND_THRESHOLD_PX &&
        !appendLockRef.current
      ) {
        appendLockRef.current = true;
        setDaysCount((previous) => previous + EXTEND_CHUNK_DAYS);
      }
    });
  };

  const scrollByDays = (dayCount: number) => {
    scrollerRef.current?.scrollBy({
      left: dayCount * dayWidth,
      behavior: "smooth",
    });
  };

  const goToToday = () => {
    const element = scrollerRef.current;
    if (!element) return;

    if (todayIndex >= 0 && todayIndex < daysCount) {
      const target = todayIndex * dayWidth - Math.max(0, element.clientWidth / 3);
      element.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
      return;
    }

    // Today fell outside the loaded window (anchored far away) — reset around it
    anchorDateRef.current = new Date();
    didInitialScrollRef.current = false;
    setWindowStart(getMondayOf(addDays(new Date(), -INITIAL_PAST_DAYS)));
    setDaysCount(INITIAL_DAYS_COUNT);
  };

  // ---------------------------------------------------------------------------
  // Drag-to-create (mouse only — touch keeps native scrolling)
  // ---------------------------------------------------------------------------

  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const dragSelectionRef = useRef<DragSelection | null>(null);
  const dragAnchorRef = useRef<DragAnchor | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || dragAnchorRef.current === null) return;

      event.preventDefault();
      dragAnchorRef.current = null;
      dragSelectionRef.current = null;
      setDragSelection(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const dayIndexFromPointer = (event: ReactPointerEvent<HTMLDivElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return Math.max(0, Math.min(daysCount - 1, Math.floor(x / dayWidth)));
  };

  const handleLanePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    // Ignore presses on reservation bars — those are links.
    if ((event.target as HTMLElement).closest("a")) return;

    const index = dayIndexFromPointer(event);
    dragAnchorRef.current = {
      dayIndex: index,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    dragSelectionRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLanePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const anchor = dragAnchorRef.current;
    if (!anchor) return;

    const distance = Math.hypot(event.clientX - anchor.clientX, event.clientY - anchor.clientY);
    if (dragSelectionRef.current === null && distance < DRAG_START_THRESHOLD_PX) return;

    const index = dayIndexFromPointer(event);
    const selection = {
      startIndex: Math.min(anchor.dayIndex, index),
      endIndex: Math.max(anchor.dayIndex, index),
    };
    dragSelectionRef.current = selection;
    setDragSelection(selection);
  };

  const handleLanePointerUp = () => {
    const selection = dragSelectionRef.current;
    dragAnchorRef.current = null;
    dragSelectionRef.current = null;
    setDragSelection(null);
    if (!selection) return;

    const start = addDays(windowStart, selection.startIndex);
    start.setHours(DRAG_CREATE_START_HOUR, 0, 0, 0);
    const end = addDays(windowStart, selection.endIndex);
    end.setHours(DRAG_CREATE_END_HOUR, 0, 0, 0);

    const params = new URLSearchParams({
      source: "calendar_timeline",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    router.push(`/dashboard/reservations/new?${params.toString()}`);
  };

  const handleLanePointerCancel = () => {
    dragAnchorRef.current = null;
    dragSelectionRef.current = null;
    setDragSelection(null);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const timelineWidth = daysCount * dayWidth;
  const bodyHeight = lanes * ROW_HEIGHT;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <TimelineToolbar
        products={products}
        filters={filters}
        monthLabel={visibleMonthLabel}
        isFetching={isFetching && hasLoadedOnce}
        onPrevious={() => scrollByDays(-NAV_DAYS[zoom])}
        onNext={() => scrollByDays(NAV_DAYS[zoom])}
        onToday={goToToday}
        onRangeChange={handleZoomChange}
      />

      {/* Timeline grid */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="bg-card relative min-h-0 flex-1 overflow-auto overscroll-x-contain rounded-lg border select-none"
      >
        <div className="relative flex min-h-full flex-col" style={{ width: timelineWidth }}>
          {/* Sticky header: months + days */}
          <div
            className="bg-card sticky top-0 z-30 shrink-0 border-b"
            style={{ height: HEADER_HEIGHT }}
          >
            {/* Month row — labels stay pinned until pushed by the next month */}
            <div className="relative border-b" style={{ height: MONTH_ROW_HEIGHT }}>
              {monthSegments.map((segment) => (
                <div
                  key={segment.startIndex}
                  className="absolute inset-y-0 flex items-center overflow-clip border-r whitespace-nowrap last:border-r-0"
                  style={{
                    left: segment.startIndex * dayWidth,
                    width: segment.days * dayWidth,
                  }}
                >
                  <span className="text-muted-foreground sticky left-0 inline-block px-2 text-[11px] font-medium">
                    {formatMonthLabel(segment.date)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day row */}
            <div className="flex" style={{ height: DAY_ROW_HEIGHT }}>
              {days.map((date, index) => {
                const isToday = index === todayIndex;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex shrink-0 flex-col items-center justify-center",
                      isWeekend(date) && "bg-muted/40",
                      isToday && "bg-primary/10",
                    )}
                    style={{ width: dayWidth }}
                  >
                    {zoom !== "month" && (
                      <span
                        className={cn(
                          "text-[10px] font-medium uppercase",
                          isToday ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {dayNameFormatter.format(date)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums",
                        isToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="relative flex-1" style={{ minHeight: bodyHeight }}>
            {/* Background: weekends + day grid lines + today */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage: [
                  // Weekend shading — windowStart is always Monday aligned
                  `repeating-linear-gradient(to right, transparent 0, transparent ${5 * dayWidth}px, color-mix(in srgb, var(--color-muted) 45%, transparent) ${5 * dayWidth}px, color-mix(in srgb, var(--color-muted) 45%, transparent) ${7 * dayWidth}px)`,
                  // Day grid lines
                  `repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${dayWidth}px)`,
                ].join(", "),
              }}
            >
              {/* Today column */}
              {todayIndex >= 0 && todayIndex < daysCount && (
                <div
                  className="bg-primary/5 absolute inset-y-0"
                  style={{ left: todayIndex * dayWidth, width: dayWidth }}
                />
              )}
            </div>

            {/* Initial loading shimmer */}
            {!hasLoadedOnce && <div className="bg-muted/40 absolute inset-0 animate-pulse" />}

            {/* Lane area: drag-to-create + stacked reservation bars */}
            <div
              className="absolute inset-0 cursor-crosshair"
              onPointerDown={handleLanePointerDown}
              onPointerMove={handleLanePointerMove}
              onPointerUp={handleLanePointerUp}
              onPointerCancel={handleLanePointerCancel}
            >
              {/* Drag-to-create selection */}
              {dragSelection && (
                <div
                  className="border-primary/60 bg-primary/10 pointer-events-none absolute inset-y-1 z-6 rounded-md border-2 border-dashed"
                  style={{
                    left: dragSelection.startIndex * dayWidth + 1,
                    width: (dragSelection.endIndex - dragSelection.startIndex + 1) * dayWidth - 2,
                  }}
                />
              )}

              {/* Reservations */}
              {placed.map((item) => {
                const from = Math.max(0, item.startIndex);
                const to = Math.min(daysCount - 1, item.endIndex);
                if (to < from) return null;

                return (
                  <TimelineReservationBar
                    key={item.reservation.id}
                    reservation={item.reservation}
                    currency={currency}
                    style={{
                      left: from * dayWidth + 4,
                      width: (to - from + 1) * dayWidth - 8,
                      top: item.laneIndex * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2,
                      height: BAR_HEIGHT,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground hidden text-xs sm:block">{tTimeline("dragHint")}</p>
    </div>
  );
}
