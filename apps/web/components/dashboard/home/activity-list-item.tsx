"use client";

import { format } from "date-fns";

import { Badge } from "@louez/ui";
import { ClockSolidIcon, ProductSolidIcon } from "@louez/ui/icons";
import { cn, formatCurrency } from "@louez/utils";

import {
  DASHBOARD_ACCENT_SURFACE,
  type DashboardAccent,
} from "@/components/dashboard/shared/dashboard-accent";
import { DashboardListRow } from "@/components/dashboard/shared/dashboard-list-row";
import type { HomeReservation } from "./home-types";
import { getCustomerInitials, summarizeProducts } from "./home-utils";

interface ActivityListItemProps {
  reservation: HomeReservation;
  /** Colours the avatar so a row always matches the section it belongs to. */
  accent: DashboardAccent;
  /** Show the rental period instead of the product names. */
  showPeriod?: boolean;
  showAmount?: boolean;
}

export const ActivityListItem = ({
  reservation,
  accent,
  showPeriod = false,
  showAmount = false,
}: ActivityListItemProps) => {
  const { names, remainingCount } = summarizeProducts(reservation);

  return (
    <DashboardListRow
      href={`/dashboard/reservations/${reservation.id}`}
      leading={
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            DASHBOARD_ACCENT_SURFACE[accent],
          )}
        >
          {getCustomerInitials(reservation)}
        </span>
      }
      title={
        <>
          <span className="truncate font-medium">
            {reservation.customer.firstName} {reservation.customer.lastName}
          </span>
          <Badge variant="expired" size="sm" className="shrink-0 font-mono">
            #{reservation.number}
          </Badge>
        </>
      }
      subtitle={
        showPeriod ? (
          <>
            <ClockSolidIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {format(reservation.startDate, "dd/MM")} — {format(reservation.endDate, "dd/MM")}
            </span>
          </>
        ) : (
          <>
            <ProductSolidIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {names.join(", ")}
              {remainingCount > 0 && (
                <span className="text-muted-foreground/60"> +{remainingCount}</span>
              )}
            </span>
          </>
        )
      }
      meta={showAmount ? formatCurrency(parseFloat(reservation.totalAmount)) : undefined}
    />
  );
};
