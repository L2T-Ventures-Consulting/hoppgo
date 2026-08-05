"use client";

import { Button } from "@louez/ui";
import { useIsMobile } from "@louez/ui/hooks/use-mobile";
import { ArrowDownRight, ArrowUpRight, Banknote } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { reservationAnalyticsActions } from "@/lib/product-analytics/analytics-events";
import {
  captureReservationQuickActionClicked,
  captureReservationQuickActionsViewed,
} from "@/lib/product-analytics/reservation-analytics-client";

import { getMobileReservationQuickActions } from "./util.mobile-reservation-quick-actions";

interface MobileReservationQuickActionsProps {
  reservationId: string;
  status: string;
  rentalRemaining: number;
  hasOnlinePaymentPending: boolean;
  currency: string;
  disabled: boolean;
  onRecordPayment: () => void;
  onStatusAction: () => void;
}

export const MobileReservationQuickActions = ({
  reservationId,
  status,
  rentalRemaining,
  hasOnlinePaymentPending,
  currency,
  disabled,
  onRecordPayment,
  onStatusAction,
}: MobileReservationQuickActionsProps) => {
  const t = useTranslations("dashboard.reservations");
  const format = useFormatter();
  const isMobile = useIsMobile();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const lastCapturedViewKey = useRef<string | null>(null);
  const actions = getMobileReservationQuickActions({
    status,
    rentalRemaining,
    hasOnlinePaymentPending,
  });

  const statusAnalyticsAction =
    actions.statusAction === "pickup"
      ? reservationAnalyticsActions.markPickedUp
      : actions.statusAction === "return"
        ? reservationAnalyticsActions.confirmReturn
        : null;

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const viewKey = `${status}:${actions.showPaymentAction}`;
    if (!isMobile || !statusAnalyticsAction || lastCapturedViewKey.current === viewKey) return;
    lastCapturedViewKey.current = viewKey;

    captureReservationQuickActionsViewed({
      reservationId,
      reservationStatus: status,
      visibleActions: [
        ...(actions.showPaymentAction ? [reservationAnalyticsActions.recordPayment] : []),
        statusAnalyticsAction,
      ],
      properties: {
        has_payment_action: actions.showPaymentAction,
        rental_remaining: rentalRemaining,
      },
    });
  }, [
    actions.showPaymentAction,
    isMobile,
    rentalRemaining,
    reservationId,
    status,
    statusAnalyticsAction,
  ]);

  if (!portalRoot || !actions.statusAction || !statusAnalyticsAction) return null;

  const statusLabel =
    actions.statusAction === "pickup" ? t("actions.markPickedUp") : t("actions.markReturned");
  const formattedRemaining = format.number(rentalRemaining, {
    style: "currency",
    currency,
  });

  const handleRecordPayment = () => {
    captureReservationQuickActionClicked({
      reservationId,
      reservationStatus: status,
      action: reservationAnalyticsActions.recordPayment,
      slot: "primary",
      properties: { rental_remaining: rentalRemaining },
    });
    onRecordPayment();
  };

  const handleStatusAction = () => {
    captureReservationQuickActionClicked({
      reservationId,
      reservationStatus: status,
      action: statusAnalyticsAction,
      slot: actions.showPaymentAction ? "secondary" : "primary",
      properties: { rental_remaining: rentalRemaining },
    });
    onStatusAction();
  };

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] shadow-lg backdrop-blur md:hidden"
      data-testid="mobile-reservation-quick-actions"
    >
      <div className="mx-auto flex w-full max-w-xl gap-2">
        {actions.showPaymentAction && (
          <Button size="lg" disabled={disabled} onClick={handleRecordPayment}>
            <Banknote data-slot="icon" />
            <span className="truncate">
              {t("payment.record")} {formattedRemaining}
            </span>
          </Button>
        )}

        <Button
          size="lg"
          disabled={disabled}
          onClick={handleStatusAction}
          variant={actions.showPaymentAction ? "outline" : "default"}
        >
          {actions.statusAction === "pickup" ? (
            <ArrowUpRight data-slot="icon" />
          ) : (
            <ArrowDownRight data-slot="icon" />
          )}
          <span className="truncate">{statusLabel}</span>
        </Button>
      </div>
    </div>,
    portalRoot,
  );
};
