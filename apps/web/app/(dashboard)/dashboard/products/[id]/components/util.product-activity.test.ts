import assert from "node:assert/strict";
import { test } from "node:test";

import type { ProductUnitActivityItem } from "@louez/api/services";
import { groupReservationActivity } from "./util.product-activity";

const makeAssignment = ({
  id,
  identifier,
  reservationId,
  createdAt,
}: {
  id: string;
  identifier: string;
  reservationId: string;
  createdAt: string;
}): ProductUnitActivityItem => ({
  id,
  productUnitId: id,
  identifierSnapshot: identifier,
  type: "assigned",
  actorUserId: null,
  payload: { reservationId },
  createdAt,
});

test("groups assignments from the same reservation across different timestamps", () => {
  const activity = [
    makeAssignment({
      id: "event-4",
      identifier: "NB04",
      reservationId: "reservation-1",
      createdAt: "2026-07-18T12:01:00.000Z",
    }),
    makeAssignment({
      id: "event-3",
      identifier: "NB03",
      reservationId: "reservation-1",
      createdAt: "2026-07-18T12:00:00.000Z",
    }),
    makeAssignment({
      id: "event-2",
      identifier: "NB02",
      reservationId: "reservation-1",
      createdAt: "2026-07-18T12:00:00.000Z",
    }),
    makeAssignment({
      id: "event-1",
      identifier: "NB01",
      reservationId: "reservation-1",
      createdAt: "2026-07-18T12:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    groupReservationActivity(activity).map((group) => group.identifiers),
    [["NB04", "NB03", "NB02", "NB01"]],
  );
});

test("keeps different reservations in separate groups", () => {
  const activity = [
    makeAssignment({
      id: "event-2",
      identifier: "NB02",
      reservationId: "reservation-2",
      createdAt: "2026-07-18T12:00:00.000Z",
    }),
    makeAssignment({
      id: "event-1",
      identifier: "NB01",
      reservationId: "reservation-1",
      createdAt: "2026-07-18T12:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    groupReservationActivity(activity).map((group) => group.identifiers),
    [["NB02"], ["NB01"]],
  );
});
