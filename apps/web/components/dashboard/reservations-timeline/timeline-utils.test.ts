import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareByDisplayOrder,
  computeDailyAvailability,
  computeMonthSegments,
  diffInDays,
  getMondayOf,
  placeDowntimes,
  placeReservations,
  stackReservations,
  type TimelineLane,
  type TimelineDowntime,
  type TimelineReservation,
} from "./timeline-utils";

const WINDOW_START = new Date(2026, 6, 6); // Monday, July 6 2026

function makeReservation(
  overrides: Partial<TimelineReservation> & { id: string },
): TimelineReservation {
  return {
    number: overrides.id,
    status: "confirmed",
    startDate: new Date(2026, 6, 7),
    endDate: new Date(2026, 6, 9),
    customerId: "customer-1",
    customerName: "Test Client",
    totalAmount: "100.00",
    quantity: 1,
    assignedUnitIds: [],
    ...overrides,
  };
}

function makeLanes(count: number, tracked = false): TimelineLane[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `lane-${i}`,
    unitId: tracked ? `unit-${i}` : null,
    label: `#${i + 1}`,
  }));
}

test("compareByDisplayOrder sorts by catalog order, then alphabetically", () => {
  const items = [
    { name: "Zodiac", displayOrder: 1 },
    { name: "Kayak", displayOrder: null },
    { name: "Paddle", displayOrder: 0 },
    { name: "Combinaison", displayOrder: 2 },
  ];

  assert.deepEqual(
    [...items].sort(compareByDisplayOrder).map((item) => item.name),
    ["Kayak", "Paddle", "Zodiac", "Combinaison"],
  );
});

test("getMondayOf returns the Monday of the week at midnight", () => {
  const sunday = new Date(2026, 6, 12, 15, 30);
  const monday = getMondayOf(sunday);
  assert.equal(monday.getDay(), 1);
  assert.equal(diffInDays(WINDOW_START, monday), 0);
  assert.equal(monday.getHours(), 0);
});

test("overlapping reservations land on different lanes", () => {
  const placed = placeReservations({
    reservations: [
      makeReservation({
        id: "a",
        startDate: new Date(2026, 6, 7),
        endDate: new Date(2026, 6, 9),
      }),
      makeReservation({
        id: "b",
        startDate: new Date(2026, 6, 8),
        endDate: new Date(2026, 6, 10),
      }),
    ],
    lanes: makeLanes(2),
    placedDowntimes: [],
    windowStart: WINDOW_START,
  });

  assert.equal(placed.length, 2);
  const lanes = placed.map((p) => p.laneIndex).sort();
  assert.deepEqual(lanes, [0, 1]);
  assert.ok(placed.every((p) => !p.isConflict));
});

test("non-overlapping reservations reuse the first lane", () => {
  const placed = placeReservations({
    reservations: [
      makeReservation({
        id: "a",
        startDate: new Date(2026, 6, 7),
        endDate: new Date(2026, 6, 8),
      }),
      makeReservation({
        id: "b",
        startDate: new Date(2026, 6, 10),
        endDate: new Date(2026, 6, 11),
      }),
    ],
    lanes: makeLanes(2),
    placedDowntimes: [],
    windowStart: WINDOW_START,
  });

  assert.deepEqual(
    placed.map((p) => p.laneIndex),
    [0, 0],
  );
});

test("explicit unit assignments win over greedy packing", () => {
  const placed = placeReservations({
    reservations: [makeReservation({ id: "a", assignedUnitIds: ["unit-1"] })],
    lanes: makeLanes(3, true),
    placedDowntimes: [],
    windowStart: WINDOW_START,
  });

  assert.equal(placed.length, 1);
  assert.equal(placed[0].laneIndex, 1);
});

test("quantity > 1 spreads across lanes", () => {
  const placed = placeReservations({
    reservations: [makeReservation({ id: "a", quantity: 2 })],
    lanes: makeLanes(3),
    placedDowntimes: [],
    windowStart: WINDOW_START,
  });

  assert.equal(placed.length, 2);
  assert.deepEqual(placed.map((p) => p.laneIndex).sort(), [0, 1]);
});

test("overbooking is force placed and flagged as conflict", () => {
  const placed = placeReservations({
    reservations: [makeReservation({ id: "a" }), makeReservation({ id: "b" })],
    lanes: makeLanes(1),
    placedDowntimes: [],
    windowStart: WINDOW_START,
  });

  assert.equal(placed.length, 2);
  assert.equal(placed.filter((p) => p.isConflict).length, 1);
});

test("greedy packing avoids lanes blocked by a downtime", () => {
  const downtime: TimelineDowntime = {
    id: "d1",
    unitId: "unit-0",
    reason: "maintenance",
    startsAt: new Date(2026, 6, 6),
    endsAt: new Date(2026, 6, 12),
  };
  const lanes = makeLanes(2, true);
  const placedDowntimes = placeDowntimes({
    downtimes: [downtime],
    lanes,
    windowStart: WINDOW_START,
    daysCount: 28,
  });

  const placed = placeReservations({
    reservations: [makeReservation({ id: "a" })],
    lanes,
    placedDowntimes,
    windowStart: WINDOW_START,
  });

  assert.equal(placed[0].laneIndex, 1);
});

test("open-ended downtimes clip to the window end", () => {
  const placed = placeDowntimes({
    downtimes: [
      {
        id: "d1",
        unitId: "unit-0",
        reason: "repair",
        startsAt: new Date(2026, 6, 10),
        endsAt: null,
      },
    ],
    lanes: makeLanes(1, true),
    windowStart: WINDOW_START,
    daysCount: 14,
  });

  assert.equal(placed.length, 1);
  assert.equal(placed[0].endIndex, 13);
  assert.ok(placed[0].isOpenEnded);
});

test("daily availability subtracts blocking reservations and downtimes", () => {
  const lanes = makeLanes(3, true);
  const placedDowntimes = placeDowntimes({
    downtimes: [
      {
        id: "d1",
        unitId: "unit-2",
        reason: "maintenance",
        startsAt: new Date(2026, 6, 8),
        endsAt: new Date(2026, 6, 8),
      },
    ],
    lanes,
    windowStart: WINDOW_START,
    daysCount: 7,
  });

  const availability = computeDailyAvailability({
    reservations: [
      makeReservation({
        id: "a",
        startDate: new Date(2026, 6, 7),
        endDate: new Date(2026, 6, 8),
      }),
      makeReservation({
        id: "cancelled",
        status: "cancelled",
        startDate: new Date(2026, 6, 7),
        endDate: new Date(2026, 6, 8),
      }),
    ],
    placedDowntimes,
    totalUnits: 3,
    windowStart: WINDOW_START,
    daysCount: 7,
  });

  // Mon: nothing → 3, Tue: 1 reservation → 2, Wed: reservation + downtime → 1
  assert.deepEqual(availability.slice(0, 4), [3, 2, 1, 3]);
});

test("stacking uses as few rows as concurrent overlaps require", () => {
  const { placed, laneCount } = stackReservations({
    reservations: [
      makeReservation({
        id: "a",
        quantity: 50,
        startDate: new Date(2026, 6, 7),
        endDate: new Date(2026, 6, 9),
      }),
      makeReservation({
        id: "b",
        quantity: 30,
        startDate: new Date(2026, 6, 8),
        endDate: new Date(2026, 6, 10),
      }),
      makeReservation({
        id: "c",
        quantity: 10,
        startDate: new Date(2026, 6, 12),
        endDate: new Date(2026, 6, 13),
      }),
    ],
    windowStart: WINDOW_START,
  });

  // Quantity never multiplies rows: 2 overlapping reservations → 2 rows,
  // and the third reuses row 0.
  assert.equal(laneCount, 2);
  assert.equal(placed.length, 3);
  assert.equal(placed.find((p) => p.reservation.id === "c")?.laneIndex, 0);
});

test("stacking an empty list still yields one row", () => {
  const { laneCount, placed } = stackReservations({
    reservations: [],
    windowStart: WINDOW_START,
  });
  assert.equal(laneCount, 1);
  assert.equal(placed.length, 0);
});

test("month segments cover the whole window without gaps", () => {
  const segments = computeMonthSegments(new Date(2026, 6, 25), 20);

  assert.equal(segments.length, 2);
  assert.equal(segments[0].days + segments[1].days, 20);
  assert.equal(segments[1].startIndex, segments[0].days);
  assert.equal(segments[1].date.getMonth(), 7); // August
});
