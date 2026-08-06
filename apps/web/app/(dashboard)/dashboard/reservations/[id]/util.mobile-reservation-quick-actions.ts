export type MobileReservationStatusAction = "confirm" | "pickup" | "return";

interface MobileReservationQuickActionsInput {
  status: string;
  rentalRemaining: number;
  hasOnlinePaymentPending: boolean;
}

interface MobileReservationQuickActions {
  showPaymentAction: boolean;
  statusAction: MobileReservationStatusAction | null;
}

export const getMobileReservationQuickActions = ({
  status,
  rentalRemaining,
  hasOnlinePaymentPending,
}: MobileReservationQuickActionsInput): MobileReservationQuickActions => {
  // A pending request with an online payment underway confirms itself when the
  // payment lands — there is nothing to accept manually.
  const statusAction =
    status === "confirmed"
      ? "pickup"
      : status === "ongoing"
        ? "return"
        : status === "pending" && !hasOnlinePaymentPending
          ? "confirm"
          : null;

  return {
    // Recording money belongs to the rental lifecycle, not to a request that
    // has not been accepted yet.
    showPaymentAction:
      (statusAction === "pickup" || statusAction === "return") &&
      rentalRemaining > 0 &&
      !hasOnlinePaymentPending,
    statusAction,
  };
};

export const hasMobileReservationQuickActions = (input: MobileReservationQuickActionsInput) => {
  const actions = getMobileReservationQuickActions(input);
  return actions.showPaymentAction || actions.statusAction !== null;
};
