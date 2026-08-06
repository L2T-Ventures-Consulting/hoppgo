import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileReservationQuickActions,
  hasMobileReservationQuickActions,
} from "./util.mobile-reservation-quick-actions";

test("offers payment then pickup for an unpaid confirmed reservation", () => {
  assert.deepEqual(
    getMobileReservationQuickActions({
      status: "confirmed",
      rentalRemaining: 132,
      hasOnlinePaymentPending: false,
    }),
    { showPaymentAction: true, statusAction: "pickup" },
  );
});

test("keeps only the status action once the rental is paid", () => {
  assert.deepEqual(
    getMobileReservationQuickActions({
      status: "ongoing",
      rentalRemaining: 0,
      hasOnlinePaymentPending: false,
    }),
    { showPaymentAction: false, statusAction: "return" },
  );
});

test("does not offer a duplicate manual payment while an online payment is pending", () => {
  assert.deepEqual(
    getMobileReservationQuickActions({
      status: "confirmed",
      rentalRemaining: 132,
      hasOnlinePaymentPending: true,
    }),
    { showPaymentAction: false, statusAction: "pickup" },
  );
});

test("offers accepting a pending request, without a payment shortcut", () => {
  assert.deepEqual(
    getMobileReservationQuickActions({
      status: "pending",
      rentalRemaining: 132,
      hasOnlinePaymentPending: false,
    }),
    { showPaymentAction: false, statusAction: "confirm" },
  );
});

test("stays out of the way while a pending request awaits its online payment", () => {
  assert.deepEqual(
    getMobileReservationQuickActions({
      status: "pending",
      rentalRemaining: 132,
      hasOnlinePaymentPending: true,
    }),
    { showPaymentAction: false, statusAction: null },
  );
});

test("hides the bar when the reservation has no operational status action", () => {
  assert.equal(
    hasMobileReservationQuickActions({
      status: "completed",
      rentalRemaining: 132,
      hasOnlinePaymentPending: false,
    }),
    false,
  );
});
