export type MobileReservationStatusAction = "pickup" | "return";

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
  const statusAction = status === "confirmed" ? "pickup" : status === "ongoing" ? "return" : null;

  return {
    showPaymentAction: statusAction !== null && rentalRemaining > 0 && !hasOnlinePaymentPending,
    statusAction,
  };
};

export const hasMobileReservationQuickActions = (input: MobileReservationQuickActionsInput) => {
  const actions = getMobileReservationQuickActions(input);
  return actions.showPaymentAction || actions.statusAction !== null;
};
