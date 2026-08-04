/**
 * Calendar utility functions
 *
 * This module provides pure functions for date calculations and
 * reservation positioning in calendar views.
 */

import type { Reservation, TimelineConfig } from "./types";

// =============================================================================
// Date Utilities
// =============================================================================

/**
 * Returns the start of day (midnight) for a given date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Returns the end of day (23:59:59.999) for a given date
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Returns Monday of the week containing the given date
 */
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return startOfDay(result);
}

/**
 * Returns Sunday of the week containing the given date
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(weekStart.getDate() + 6);
  return endOfDay(result);
}

// =============================================================================
// Reservation Filtering
// =============================================================================

/**
 * Checks if a reservation includes a specific day
 */
export function reservationIncludesDay(reservation: Reservation, day: Date): boolean {
  const resStart = startOfDay(new Date(reservation.startDate));
  const resEnd = endOfDay(new Date(reservation.endDate));
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return resStart <= dayEnd && resEnd >= dayStart;
}
// =============================================================================
// Timeline Configuration Helpers
// =============================================================================

/**
 * Creates a timeline config for two weeks (14 days)
 */
export function createTwoWeekConfig(date: Date): TimelineConfig {
  const startDate = getWeekStart(date);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 13);
  return {
    startDate,
    endDate: endOfDay(endDate),
    daysCount: 14,
    zoom: "week",
  };
}

/**
 * Creates a timeline config for a month
 */
export function createMonthConfig(date: Date): TimelineConfig {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const daysCount = endDate.getDate();

  return {
    startDate: startOfDay(startDate),
    endDate: endOfDay(endDate),
    daysCount,
    zoom: "month",
  };
}

// Products are displayed in catalog order (displayOrder, then name) — see
// `getCalendarProducts`. No client-side re-sorting: the timeline rows, the
// product filter and the reservation product pickers all share that order.
