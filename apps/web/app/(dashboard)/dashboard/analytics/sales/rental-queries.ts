import { endOfDay } from "date-fns";
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@louez/db";
import { products, reservationItems, reservations } from "@louez/db";

import type { Period } from "../period";
import { getWindowStart } from "./queries";

type ReservationStatus = (typeof reservations.status.enumValues)[number];

/** Reservations that actually mobilise units — quotes and cancellations excluded. */
const OCCUPYING_STATUSES: ReservationStatus[] = ["confirmed", "ongoing", "completed"];

/** Reservations that count as booked activity, whatever their outcome so far. */
const BOOKED_STATUSES: ReservationStatus[] = ["pending", "confirmed", "ongoing", "completed"];

const MINUTES_PER_DAY = 1440;
const MS_PER_DAY = MINUTES_PER_DAY * 60_000;

/** Same rolling window as the receipts queries, bounded on both ends. */
const getWindow = (period: Period) => {
  const now = new Date();
  const start = getWindowStart(period, now);
  const end = endOfDay(now);

  return { start, end, days: (end.getTime() - start.getTime()) / MS_PER_DAY };
};

export interface OccupancyStats {
  /** Occupied unit-days over available unit-days, in percent. */
  rate: number;
  /** Units the active catalog offers — the denominator's fleet size. */
  availableUnits: number;
}

/**
 * How much of the fleet was actually out over the window: every reservation
 * item contributes `quantity × days` for the part of its stay that falls inside
 * the window, measured against the unit-days the active catalog could offer.
 */
export async function getOccupancyStats(storeId: string, period: Period): Promise<OccupancyStats> {
  const { start, end, days } = getWindow(period);

  const [occupied, fleet] = await Promise.all([
    db
      .select({
        unitDays: sql<string>`COALESCE(SUM(${reservationItems.quantity} * GREATEST(TIMESTAMPDIFF(MINUTE, GREATEST(${reservations.startDate}, ${start}), LEAST(${reservations.endDate}, ${end})), 0) / ${MINUTES_PER_DAY}), 0)`,
      })
      .from(reservationItems)
      .innerJoin(reservations, eq(reservationItems.reservationId, reservations.id))
      .where(
        and(
          eq(reservations.storeId, storeId),
          inArray(reservations.status, OCCUPYING_STATUSES),
          // Only the stays overlapping the window can contribute unit-days.
          lte(reservations.startDate, end),
          gte(reservations.endDate, start),
        ),
      ),
    db
      .select({ units: sql<string>`COALESCE(SUM(${products.quantity}), 0)` })
      .from(products)
      .where(and(eq(products.storeId, storeId), eq(products.status, "active"))),
  ]);

  const availableUnits = Number(fleet[0]?.units || 0);
  const availableUnitDays = availableUnits * days;
  const occupiedUnitDays = parseFloat(occupied[0]?.unitDays || "0");

  return {
    rate: availableUnitDays > 0 ? (occupiedUnitDays / availableUnitDays) * 100 : 0,
    availableUnits,
  };
}

export interface UpcomingRevenueStats {
  revenue: number;
  reservationCount: number;
}

/**
 * Everything already booked ahead: confirmed reservations starting from now on,
 * with no window bound — this is the order book, not a period metric.
 */
export async function getUpcomingRevenue(storeId: string): Promise<UpcomingRevenueStats> {
  const rows = await db
    .select({
      total: sql<string>`COALESCE(SUM(${reservations.totalAmount}), 0)`,
      reservationCount: count(),
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.storeId, storeId),
        eq(reservations.status, "confirmed"),
        gte(reservations.startDate, new Date()),
      ),
    );

  return {
    revenue: parseFloat(rows[0]?.total || "0"),
    reservationCount: rows[0]?.reservationCount || 0,
  };
}

export interface AverageRentalDurationStats {
  /** `null` when no reservation started over the window. */
  avgMinutes: number | null;
  reservationCount: number;
}

/** Average stay length of the reservations that started over the window. */
export async function getAverageRentalDuration(
  storeId: string,
  period: Period,
): Promise<AverageRentalDurationStats> {
  const { start, end } = getWindow(period);

  const rows = await db
    .select({
      avgMinutes: sql<
        string | null
      >`AVG(TIMESTAMPDIFF(MINUTE, ${reservations.startDate}, ${reservations.endDate}))`,
      reservationCount: count(),
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.storeId, storeId),
        inArray(reservations.status, OCCUPYING_STATUSES),
        gte(reservations.startDate, start),
        lte(reservations.startDate, end),
      ),
    );

  const avgMinutes = rows[0]?.avgMinutes;

  return {
    avgMinutes: avgMinutes === null || avgMinutes === undefined ? null : Number(avgMinutes),
    reservationCount: rows[0]?.reservationCount || 0,
  };
}

export interface PeriodReservationStats {
  reservationCount: number;
  growth: number;
}

/**
 * Reservations starting over the window, compared with the window of the same
 * length right before it.
 */
export async function getPeriodReservationStats(
  storeId: string,
  period: Period,
): Promise<PeriodReservationStats> {
  const { start, end } = getWindow(period);
  // The previous window stops just short of the current one, whose bounds are inclusive.
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

  const countStartingBetween = (from: Date, to: Date) =>
    db
      .select({ reservationCount: count() })
      .from(reservations)
      .where(
        and(
          eq(reservations.storeId, storeId),
          inArray(reservations.status, BOOKED_STATUSES),
          gte(reservations.startDate, from),
          lte(reservations.startDate, to),
        ),
      );

  const [current, previous] = await Promise.all([
    countStartingBetween(start, end),
    countStartingBetween(previousStart, previousEnd),
  ]);

  const reservationCount = current[0]?.reservationCount || 0;
  const previousCount = previous[0]?.reservationCount || 0;

  return {
    reservationCount,
    growth: previousCount > 0 ? ((reservationCount - previousCount) / previousCount) * 100 : 0,
  };
}
