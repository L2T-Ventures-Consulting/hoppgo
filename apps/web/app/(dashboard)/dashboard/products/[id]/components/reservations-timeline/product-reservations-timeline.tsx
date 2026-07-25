"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, UIEvent } from "react";

import { useRouter } from "next/navigation";

import { CalendarIcon, ChevronLeft, ChevronRight, ListFilter, Wrench } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { parseAsArrayOf, parseAsStringLiteral, useQueryStates } from "nuqs";

import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from "@louez/ui";
import { cn, formatDateShort } from "@louez/utils";

import { EmptyState } from "@/components/ui/empty-state";

import {
  type ProductTimelineDowntime,
  type ProductTimelineReservation,
  fetchProductReservationTimeline,
} from "../../reservation-timeline-actions";
import {
  getStatusDotClass,
  getTimelineStatus,
  TimelineReservationBar,
} from "@/components/dashboard/reservations-timeline/timeline-reservation-bar";
import {
  type TimelineLane,
  addDays,
  computeDailyAvailability,
  computeMonthSegments,
  diffInDays,
  getMondayOf,
  isWeekend,
  placeDowntimes,
  placeReservations,
  stackReservations,
} from "@/components/dashboard/reservations-timeline/timeline-utils";

// =============================================================================
// Constants
// =============================================================================

const TIMELINE_ZOOMS = ["week", "twoWeeks", "month"] as const;
type TimelineZoom = (typeof TIMELINE_ZOOMS)[number];

const DAY_WIDTHS: Record<TimelineZoom, number> = {
  week: 96,
  twoWeeks: 60,
  month: 38,
};

/** Days scrolled per arrow click */
const NAV_DAYS: Record<TimelineZoom, number> = {
  week: 7,
  twoWeeks: 14,
  month: 30,
};

const ALL_STATUSES = [
  "pending",
  "confirmed",
  "ongoing",
  "completed",
  "quote",
  "cancelled",
  "rejected",
  "declined",
] as const;

/** Terminal/negative statuses hidden by default to reduce noise */
const DEFAULT_HIDDEN_STATUSES = new Set(["cancelled", "rejected", "declined"]);
const DEFAULT_VISIBLE_STATUSES = ALL_STATUSES.filter(
  (status) => !DEFAULT_HIDDEN_STATUSES.has(status),
);

const MONTH_ROW_HEIGHT = 26;
const DAY_ROW_HEIGHT = 42;
const AVAILABILITY_ROW_HEIGHT = 22;
const HEADER_HEIGHT = MONTH_ROW_HEIGHT + DAY_ROW_HEIGHT + AVAILABILITY_ROW_HEIGHT;
const ROW_HEIGHT = 44;
const BAR_HEIGHT = 30;
const MAX_BODY_HEIGHT = 440;

/**
 * Untracked products with more stock than this switch to an aggregated view:
 * reservations are stacked into as few rows as needed instead of one lane per
 * unit (200 chairs should not render 200 rows).
 */
const AGGREGATE_THRESHOLD = 12;
/** Minimum rows in aggregated mode so there's room to drag-create */
const MIN_AGGREGATE_ROWS = 2;

/** Prefilled times for drag-created reservations */
const DRAG_CREATE_START_HOUR = 9;
const DRAG_CREATE_END_HOUR = 18;
/** Prevent a click or tiny pointer jitter from starting a reservation */
const DRAG_START_THRESHOLD_PX = 4;

/** Days loaded initially before today (Monday aligned) */
const INITIAL_PAST_DAYS = 28;
const INITIAL_DAYS_COUNT = 84;
/** Days added per infinite-scroll extension (multiple of 7 keeps Monday alignment) */
const EXTEND_CHUNK_DAYS = 28;
/** Distance from an edge (px) that triggers an extension */
const EXTEND_THRESHOLD_PX = 320;
/** Hard cap on the loaded window to keep the DOM bounded */
const MAX_DAYS_COUNT = 560;

// =============================================================================
// Component
// =============================================================================

interface TimelineRow {
  key: string;
  /** Null in aggregated mode (stacked rows have no unit identity) */
  label: string | null;
}

interface DragSelection {
  rowIndex: number;
  startIndex: number;
  endIndex: number;
}

interface DragAnchor {
  rowIndex: number;
  dayIndex: number;
  clientX: number;
  clientY: number;
}

interface ProductReservationsTimelineProps {
  productId: string;
  currency: string;
  trackUnits: boolean;
  /** Active tracked units (empty for simple-quantity products) */
  units: { id: string; identifier: string }[];
  /** Stock quantity for simple-quantity products */
  quantity: number;
}

export function ProductReservationsTimeline({
  productId,
  currency,
  trackUnits,
  units,
  quantity,
}: ProductReservationsTimelineProps) {
  const t = useTranslations("dashboard.products.detail.reservations.timeline");
  const tCalendar = useTranslations("dashboard.calendar");
  const tDowntime = useTranslations("dashboard.inventory.downtimeReasons");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // URL-persisted view state (zoom + status filter) — shareable links
  // ---------------------------------------------------------------------------

  const [urlState, setUrlState] = useQueryStates(
    {
      resaZoom: parseAsStringLiteral(TIMELINE_ZOOMS).withDefault("week"),
      resaStatus: parseAsArrayOf(parseAsStringLiteral(ALL_STATUSES)).withDefault(
        DEFAULT_VISIBLE_STATUSES,
      ),
    },
    { history: "replace" },
  );

  const zoom = urlState.resaZoom;
  const dayWidth = DAY_WIDTHS[zoom];

  const hiddenStatuses = useMemo(
    () => new Set<string>(ALL_STATUSES.filter((status) => !urlState.resaStatus.includes(status))),
    [urlState.resaStatus],
  );

  // Keep canonical status order so nuqs' clearOnDefault recognizes the
  // default set and drops the param from the URL.
  const setVisibleStatuses = (visible: Set<string>) => {
    void setUrlState({
      resaStatus: ALL_STATUSES.filter((status) => visible.has(status)),
    });
  };

  const toggleStatus = (status: string) => {
    const visible = new Set<string>(urlState.resaStatus);
    if (visible.has(status)) {
      visible.delete(status);
    } else {
      visible.add(status);
    }
    setVisibleStatuses(visible);
  };

  // ---------------------------------------------------------------------------
  // Window state (infinite horizontal scroll)
  // ---------------------------------------------------------------------------

  const [windowStart, setWindowStart] = useState(() =>
    getMondayOf(addDays(new Date(), -INITIAL_PAST_DAYS)),
  );
  const [daysCount, setDaysCount] = useState(INITIAL_DAYS_COUNT);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingPrependRef = useRef(0);
  const appendLockRef = useRef(false);
  const zoomAnchorRef = useRef<number | null>(null);
  const didInitialScrollRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const [reservationsById, setReservationsById] = useState<Map<string, ProductTimelineReservation>>(
    () => new Map(),
  );
  const [downtimesById, setDowntimesById] = useState<Map<string, ProductTimelineDowntime>>(
    () => new Map(),
  );
  const [isFetching, setIsFetching] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const coverageRef = useRef<{ start: number; end: number } | null>(null);
  const pendingFetchesRef = useRef(0);

  // NOTE: no cleanup/cancellation here on purpose. Coverage is claimed before
  // fetching so overlapping effect runs don't refetch the same range; if a run
  // discarded its results on re-render (infinite-scroll extension, StrictMode
  // double-mount), the range would stay claimed but empty forever. Merging is
  // idempotent (Maps keyed by id), so late results are always safe to apply.
  useEffect(() => {
    const winStart = windowStart;
    const winEnd = addDays(windowStart, daysCount - 1);
    winEnd.setHours(23, 59, 59, 999);

    const coverage = coverageRef.current;
    const gaps: Array<[Date, Date]> = [];

    if (!coverage) {
      gaps.push([winStart, winEnd]);
    } else {
      if (winStart.getTime() < coverage.start) {
        gaps.push([winStart, new Date(coverage.start)]);
      }
      if (winEnd.getTime() > coverage.end) {
        gaps.push([new Date(coverage.end), winEnd]);
      }
    }

    if (gaps.length === 0) return;

    // Claimed before fetching; rolled back on failure so a retry refetches.
    const previousCoverage = coverage;
    coverageRef.current = {
      start: Math.min(winStart.getTime(), coverage?.start ?? Infinity),
      end: Math.max(winEnd.getTime(), coverage?.end ?? -Infinity),
    };

    pendingFetchesRef.current += 1;
    setIsFetching(true);
    setError(null);

    void Promise.all(
      gaps.map(([start, end]) =>
        fetchProductReservationTimeline({
          productId,
          startDateISO: start.toISOString(),
          endDateISO: end.toISOString(),
        }),
      ),
    )
      .then((results) => {
        const failed = results.find((result) => "error" in result);
        if (failed && "error" in failed) {
          coverageRef.current = previousCoverage;
          setError(failed.error);
          return;
        }

        setReservationsById((previous) => {
          const next = new Map(previous);
          for (const result of results) {
            if (!("data" in result)) continue;
            for (const reservation of result.data.reservations) {
              next.set(reservation.id, reservation);
            }
          }
          return next;
        });
        setDowntimesById((previous) => {
          const next = new Map(previous);
          for (const result of results) {
            if (!("data" in result)) continue;
            for (const downtime of result.data.downtimes) {
              next.set(downtime.id, downtime);
            }
          }
          return next;
        });
        setHasLoadedOnce(true);
      })
      .catch(() => {
        coverageRef.current = previousCoverage;
        setError("errors.generic");
      })
      .finally(() => {
        pendingFetchesRef.current -= 1;
        if (pendingFetchesRef.current === 0) setIsFetching(false);
      });
  }, [productId, windowStart, daysCount, retryToken]);

  // ---------------------------------------------------------------------------
  // Derived layout data
  // ---------------------------------------------------------------------------

  /** High-quantity untracked stock renders stacked, not one lane per unit */
  const isAggregated = !trackUnits && quantity > AGGREGATE_THRESHOLD;

  const lanes = useMemo((): TimelineLane[] => {
    if (trackUnits) {
      return units.map((unit) => ({
        key: unit.id,
        unitId: unit.id,
        label: unit.identifier,
      }));
    }

    if (isAggregated) return [];

    return Array.from({ length: Math.max(1, quantity) }, (_, index) => ({
      key: `slot-${index}`,
      unitId: null,
      label: `#${index + 1}`,
    }));
  }, [trackUnits, units, quantity, isAggregated]);

  const totalUnits = trackUnits ? lanes.length : Math.max(1, quantity);
  const unitColumnWidth = trackUnits ? 132 : 84;

  const days = useMemo(
    () => Array.from({ length: daysCount }, (_, index) => addDays(windowStart, index)),
    [windowStart, daysCount],
  );

  const allReservations = useMemo(() => Array.from(reservationsById.values()), [reservationsById]);

  const visibleReservations = useMemo(
    () =>
      allReservations.filter(
        (reservation) => !hiddenStatuses.has(getTimelineStatus(reservation.status)),
      ),
    [allReservations, hiddenStatuses],
  );

  const placedDowntimes = useMemo(
    () =>
      placeDowntimes({
        downtimes: Array.from(downtimesById.values()),
        lanes,
        windowStart,
        daysCount,
      }),
    [downtimesById, lanes, windowStart, daysCount],
  );

  const { placedReservations, rows } = useMemo((): {
    placedReservations: ReturnType<typeof placeReservations>;
    rows: TimelineRow[];
  } => {
    if (isAggregated) {
      const { placed, laneCount } = stackReservations({
        reservations: visibleReservations,
        windowStart,
      });
      const rowCount = Math.max(laneCount, MIN_AGGREGATE_ROWS);
      return {
        placedReservations: placed,
        rows: Array.from({ length: rowCount }, (_, index) => ({
          key: `stack-${index}`,
          label: null,
        })),
      };
    }

    return {
      placedReservations: placeReservations({
        reservations: visibleReservations,
        lanes,
        placedDowntimes,
        windowStart,
      }),
      rows: lanes.map((lane) => ({ key: lane.key, label: lane.label })),
    };
  }, [isAggregated, visibleReservations, lanes, placedDowntimes, windowStart]);

  // Availability always reflects real stock pressure (independent of the
  // status filter): blocking reservations + downtimes.
  const availability = useMemo(
    () =>
      computeDailyAvailability({
        reservations: allReservations,
        placedDowntimes,
        totalUnits,
        windowStart,
        daysCount,
      }),
    [allReservations, placedDowntimes, totalUnits, windowStart, daysCount],
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

  const [visibleMonthLabel, setVisibleMonthLabel] = useState(() => formatMonthLabel(new Date()));

  // ---------------------------------------------------------------------------
  // Scrolling: initial position, label sync, infinite extension
  // ---------------------------------------------------------------------------

  const updateVisibleLabel = (element: HTMLDivElement) => {
    const centerOffset = element.scrollLeft + (element.clientWidth - unitColumnWidth) / 2;
    const index = Math.max(0, Math.min(daysCount - 1, Math.floor(centerOffset / dayWidth)));
    const label = formatMonthLabel(addDays(windowStart, index));
    setVisibleMonthLabel((previous) => (previous === label ? previous : label));
  };

  // Center today on first mount
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;

    const target = todayIndex * dayWidth - Math.max(0, (element.clientWidth - unitColumnWidth) / 3);
    element.scrollLeft = Math.max(0, target);
    updateVisibleLabel(element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const target = todayIndex * dayWidth - Math.max(0, (element.clientWidth - unitColumnWidth) / 3);
    element.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  };

  const handleZoomChange = (value: string | null) => {
    if (value === null) return;
    const element = scrollerRef.current;
    if (element) {
      zoomAnchorRef.current = element.scrollLeft / dayWidth;
    }
    void setUrlState({ resaZoom: value as TimelineZoom });
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

  const handleLanePointerDown = (rowIndex: number, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    // Ignore presses on reservation bars — those are links.
    if ((event.target as HTMLElement).closest("a")) return;

    const index = dayIndexFromPointer(event);
    dragAnchorRef.current = {
      rowIndex,
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
      rowIndex: anchor.rowIndex,
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
      source: "product_timeline",
      productId,
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

  if (trackUnits && lanes.length === 0) {
    return <EmptyState icon={CalendarIcon} title={t("noUnits")} />;
  }

  const timelineWidth = daysCount * dayWidth;
  const bodyHeight = rows.length * ROW_HEIGHT;

  return (
    <div className="space-y-2">
      {/* Toolbar — compact, single row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("previous")}
            onClick={() => scrollByDays(-NAV_DAYS[zoom])}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("next")}
            onClick={() => scrollByDays(NAV_DAYS[zoom])}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {tCalendar("today")}
          </Button>
        </div>

        <span className="text-sm font-medium first-letter:uppercase">{visibleMonthLabel}</span>

        {isFetching && hasLoadedOnce && <Spinner className="text-muted-foreground size-3.5" />}

        <div className="ml-auto flex items-center gap-1">
          <Popover>
            <PopoverTrigger
              render={<Button variant="outline" size="sm" aria-label={t("statusFilter")} />}
            >
              <ListFilter />
              {hiddenStatuses.size > 0 && (
                <span className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold">
                  {ALL_STATUSES.length - hiddenStatuses.size}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52">
              <div className="space-y-0.5 p-1">
                {ALL_STATUSES.map((status) => (
                  <Label
                    key={status}
                    className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal"
                  >
                    <Checkbox
                      checked={!hiddenStatuses.has(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", getStatusDotClass(status))}
                    />
                    <span className="flex-1">{tCalendar(`status.${status}`)}</span>
                  </Label>
                ))}
                {hiddenStatuses.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 w-full"
                    onClick={() => setVisibleStatuses(new Set(ALL_STATUSES))}
                  >
                    {t("showAll")}
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={zoom} onValueChange={handleZoomChange}>
            <SelectTrigger size="sm" className="w-36">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              <SelectValue>{tCalendar(`periods.${zoom}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(["week", "twoWeeks", "month"] as const).map((period) => (
                <SelectItem key={period} value={period} label={tCalendar(`periods.${period}`)}>
                  {tCalendar(`periods.${period}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription className="flex items-center justify-between gap-3">
            {tErrors(error.startsWith("errors.") ? error.replace("errors.", "") : "generic")}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setRetryToken((token) => token + 1);
              }}
            >
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline grid */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="bg-card relative overflow-auto overscroll-x-contain rounded-lg border select-none"
        style={{ maxHeight: HEADER_HEIGHT + MAX_BODY_HEIGHT }}
      >
        <div className="relative" style={{ width: unitColumnWidth + timelineWidth }}>
          {/* Sticky header: months, days, availability */}
          <div className="bg-card sticky top-0 z-30 border-b" style={{ height: HEADER_HEIGHT }}>
            <div
              className="absolute top-0 bottom-0"
              style={{ left: unitColumnWidth, width: timelineWidth }}
            >
              {/* Month row — labels stay pinned until pushed by the next
                  month (overflow-clip keeps position:sticky working, unlike
                  overflow-hidden which creates a scroll container) */}
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
                    <span
                      className="text-muted-foreground sticky inline-block px-2 text-[11px] font-medium"
                      style={{ left: unitColumnWidth }}
                    >
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

              {/* Availability row */}
              <div
                className="bg-muted/30 flex border-t"
                style={{ height: AVAILABILITY_ROW_HEIGHT }}
              >
                {availability.map((free, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex shrink-0 items-center justify-center text-[10px] leading-none tabular-nums",
                      free === 0 ? "text-destructive font-semibold" : "text-muted-foreground",
                    )}
                    style={{ width: dayWidth }}
                    title={t("availableOn", {
                      count: free,
                      date: formatDateShort(days[index]),
                    })}
                  >
                    {hasLoadedOnce ? free : "·"}
                  </div>
                ))}
              </div>
            </div>

            {/* Corner cell */}
            <div
              className="bg-card sticky left-0 z-40 flex h-full items-end border-r px-3 pb-1.5"
              style={{ width: unitColumnWidth }}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className="text-muted-foreground text-xs font-medium">{t("stock")}</span>
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium tabular-nums">
                  {totalUnits}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative" style={{ height: bodyHeight }}>
            {/* Background: weekends + day grid lines + today */}
            <div
              aria-hidden
              className="absolute inset-y-0"
              style={{
                left: unitColumnWidth,
                width: timelineWidth,
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
            {!hasLoadedOnce && !error && (
              <div
                className="bg-muted/40 absolute inset-y-0 animate-pulse"
                style={{ left: unitColumnWidth, width: timelineWidth }}
              />
            )}

            {/* Unit lanes */}
            {rows.map((row, rowIndex) => (
              <div
                key={row.key}
                className="relative flex border-b last:border-b-0"
                style={{ height: ROW_HEIGHT }}
              >
                <div
                  className="bg-card sticky left-0 z-20 flex shrink-0 items-center border-r px-3"
                  style={{ width: unitColumnWidth }}
                >
                  {row.label !== null && (
                    <span
                      className={cn(
                        "truncate text-xs",
                        trackUnits ? "text-foreground font-medium" : "text-muted-foreground",
                      )}
                      title={row.label}
                    >
                      {row.label}
                    </span>
                  )}
                </div>

                <div
                  className="relative cursor-crosshair"
                  style={{ width: timelineWidth }}
                  onPointerDown={(event) => handleLanePointerDown(rowIndex, event)}
                  onPointerMove={handleLanePointerMove}
                  onPointerUp={handleLanePointerUp}
                  onPointerCancel={handleLanePointerCancel}
                >
                  {/* Drag-to-create selection */}
                  {dragSelection?.rowIndex === rowIndex && (
                    <div
                      className="border-primary/60 bg-primary/10 pointer-events-none absolute inset-y-1 z-6 rounded-md border-2 border-dashed"
                      style={{
                        left: dragSelection.startIndex * dayWidth + 1,
                        width:
                          (dragSelection.endIndex - dragSelection.startIndex + 1) * dayWidth - 2,
                      }}
                    />
                  )}

                  {/* Downtimes */}
                  {placedDowntimes
                    .filter((placed) => placed.laneIndex === rowIndex)
                    .map((placed) => {
                      const from = Math.max(0, placed.startIndex);
                      const to = Math.min(daysCount - 1, placed.endIndex);
                      if (to < from) return null;

                      return (
                        <div
                          key={placed.downtime.id}
                          className="text-muted-foreground absolute z-4 flex items-center gap-1 overflow-hidden rounded-md border border-dashed px-2 text-[11px]"
                          style={{
                            left: from * dayWidth + 2,
                            width: (to - from + 1) * dayWidth - 4,
                            top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                            height: BAR_HEIGHT,
                            backgroundImage:
                              "repeating-linear-gradient(45deg, transparent 0, transparent 5px, color-mix(in srgb, var(--color-muted-foreground) 14%, transparent) 5px, color-mix(in srgb, var(--color-muted-foreground) 14%, transparent) 7px)",
                          }}
                          title={`${tDowntime(placed.downtime.reason)} · ${formatDateShort(placed.downtime.startsAt)}${
                            placed.downtime.endsAt
                              ? ` – ${formatDateShort(placed.downtime.endsAt)}`
                              : ""
                          }`}
                        >
                          <Wrench className="h-3 w-3 shrink-0" />
                          <span className="truncate">{tDowntime(placed.downtime.reason)}</span>
                        </div>
                      );
                    })}

                  {/* Reservations */}
                  {placedReservations
                    .filter((placed) => placed.laneIndex === rowIndex)
                    .map((placed) => {
                      const from = Math.max(0, placed.startIndex);
                      const to = Math.min(daysCount - 1, placed.endIndex);
                      if (to < from) return null;

                      return (
                        <TimelineReservationBar
                          key={`${placed.reservation.id}-${rowIndex}`}
                          reservation={placed.reservation}
                          currency={currency}
                          isConflict={placed.isConflict}
                          style={{
                            left: from * dayWidth + 2,
                            width: (to - from + 1) * dayWidth - 4,
                            top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                            height: BAR_HEIGHT,
                          }}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">{t("dragHint")}</p>
    </div>
  );
}
