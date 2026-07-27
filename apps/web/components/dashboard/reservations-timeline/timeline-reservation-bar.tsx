"use client";

import { ExternalLink, Truck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@louez/ui";
import { cn, formatCurrency, formatDateShort, formatTime } from "@louez/utils";

import { ProductImage } from "@/components/product/product-image";

import type { TimelineReservation, TimelineReservationItem } from "./timeline-utils";

type KnownStatus =
  | "pending"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "rejected"
  | "quote"
  | "declined";

const BAR_COLORS: Record<KnownStatus, string> = {
  pending:
    "bg-reservation-pending-soft text-reservation-pending hover:brightness-[0.97] dark:hover:brightness-[1.2]",
  confirmed:
    "bg-reservation-confirmed-soft text-reservation-confirmed hover:brightness-[0.97] dark:hover:brightness-[1.2]",
  ongoing:
    "bg-reservation-ongoing-soft text-reservation-ongoing hover:brightness-[0.97] dark:hover:brightness-[1.2]",
  completed:
    "bg-reservation-completed-soft text-reservation-completed hover:brightness-[0.97] dark:hover:brightness-[1.2]",
  cancelled:
    "bg-reservation-cancelled-soft text-reservation-cancelled hover:brightness-[0.97] dark:hover:brightness-[1.2]",
  rejected:
    "bg-reservation-rejected-soft text-reservation-rejected hover:brightness-[0.97] dark:hover:brightness-[1.2]",
  quote:
    "bg-reservation-quote-soft text-reservation-quote hover:brightness-[0.97] dark:hover:brightness-[1.2]",
  declined:
    "bg-reservation-declined-soft text-reservation-declined hover:brightness-[0.97] dark:hover:brightness-[1.2]",
};

const DOT_COLORS: Record<KnownStatus, string> = {
  pending: "bg-reservation-pending",
  confirmed: "bg-reservation-confirmed",
  ongoing: "bg-reservation-ongoing",
  completed: "bg-reservation-completed",
  cancelled: "bg-reservation-cancelled",
  rejected: "bg-reservation-rejected",
  quote: "bg-reservation-quote",
  declined: "bg-reservation-declined",
};

const BADGE_VARIANTS: Record<
  KnownStatus,
  "pending" | "progress" | "submitted" | "success" | "failed" | "expired"
> = {
  pending: "pending",
  confirmed: "success",
  ongoing: "progress",
  completed: "success",
  cancelled: "failed",
  rejected: "failed",
  quote: "submitted",
  declined: "expired",
};

export function getTimelineStatus(status: string | null): KnownStatus {
  return (status ?? "pending") as KnownStatus;
}

export function getStatusDotClass(status: string | null): string {
  return DOT_COLORS[getTimelineStatus(status)] ?? DOT_COLORS.pending;
}

interface TimelineReservationBarProps {
  reservation: TimelineReservation;
  currency: string;
  /** Flags an overbooked placement (no free unit lane was available) */
  isConflict?: boolean;
  style?: React.CSSProperties;
}

function DeliveryAddressRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-muted-foreground/70 flex items-center gap-1">
        <Truck className="h-3 w-3 shrink-0" />
        {label}
      </span>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground hover:text-primary inline-flex items-start gap-1 font-medium"
      >
        <span>{address}</span>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
      </a>
    </div>
  );
}

/**
 * One product of the reservation. Links to the product page when the line still
 * points at a live product — custom items and deleted products stay plain text.
 */
function TooltipProductRow({ item }: { item: TimelineReservationItem }) {
  const content = (
    <>
      <ProductImage
        src={item.imageUrl}
        alt={item.name}
        containerClassName="w-8 shrink-0 rounded"
        sizes="32px"
      />
      <span className="text-foreground min-w-0 flex-1 truncate">{item.name}</span>
      {item.quantity > 1 && (
        <span className="text-muted-foreground shrink-0 font-semibold tabular-nums">
          ×{item.quantity}
        </span>
      )}
    </>
  );

  // The chevron slot is reserved on every row, so linked and plain lines keep
  // the same name column width.
  const rowClassName = "flex items-center gap-2 rounded-md px-1 py-0.5";

  if (!item.productId) {
    return (
      <li className={rowClassName}>
        {content}
        <span aria-hidden="true" className="h-3 w-3 shrink-0" />
      </li>
    );
  }

  return (
    <li>
      <a
        href={`/dashboard/products/${encodeURIComponent(item.productId)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          rowClassName,
          "hover:bg-accent focus-visible:ring-ring group transition-colors focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        {content}
        <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    </li>
  );
}

/**
 * A single reservation bar on a unit lane. Opens the reservation detail in a
 * new tab so the merchant never loses their place on the product page.
 */
export function TimelineReservationBar({
  reservation,
  currency,
  isConflict = false,
  style,
}: TimelineReservationBarProps) {
  const t = useTranslations("dashboard.calendar");
  const tReservations = useTranslations("dashboard.reservations");
  const status = getTimelineStatus(reservation.status);
  const colorClass = BAR_COLORS[status] ?? BAR_COLORS.pending;

  const hasDelivery = Boolean(
    reservation.outboundDeliveryAddress || reservation.returnDeliveryAddress,
  );

  return (
    <Tooltip>
      <TooltipTrigger
        delay={100}
        render={
          <a
            href={`/dashboard/reservations/${encodeURIComponent(reservation.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "absolute z-5 flex items-center gap-1 overflow-hidden rounded-md px-2 text-xs font-medium transition-[filter]",
              "focus-visible:ring-ring focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none ",
              // "shadow-[0_0_1px_0px_var(--color-border)]",
              "shadow-[0_0_0.5px_0.5px_currentColor] dark:shadow-[0_0_1px_0px_currentColor]",
              colorClass,
              isConflict && "ring-destructive/60 ring-1 ring-inset",
            )}
            style={style}
          />
        }
      >
        {isConflict && <TriangleAlert className="text-destructive h-3 w-3 shrink-0" />}
        {hasDelivery && <Truck className="h-3 w-3 shrink-0" />}
        <span className="truncate">{reservation.customerName}</span>
        {reservation.quantity > 1 && (
          <span className="shrink-0 opacity-70">×{reservation.quantity}</span>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="min-w-52 space-y-2 p-1.5">
          {/* Header — who, which reservation, and where it stands */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              {reservation.customerId ? (
                <a
                  href={`/dashboard/customers/${encodeURIComponent(reservation.customerId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary focus-visible:ring-ring group inline-flex max-w-full items-center gap-1 rounded-sm text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="truncate">{reservation.customerName}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                </a>
              ) : (
                <p className="truncate text-sm font-semibold">{reservation.customerName}</p>
              )}
              <p className="text-muted-foreground/70 flex items-center gap-1.5 text-[11px]">
                <span className="font-mono">#{reservation.number}</span>
                {reservation.quantity > 1 && (
                  <span className="tabular-nums">×{reservation.quantity}</span>
                )}
              </p>
            </div>
            <Badge variant={BADGE_VARIANTS[status]} className="mt-0.5 shrink-0">
              {t(`status.${status}`)}
            </Badge>
          </div>

          {/* Products, in catalog order — each opens its product page */}
          {reservation.items && reservation.items.length > 0 && (
            <div className="border-t pt-1.5">
              {/* Pulled out so the row hover surface reaches the tooltip edges */}
              <ul className="-mx-1 space-y-0.5 text-xs">
                {reservation.items.map((item) => (
                  <TooltipProductRow key={item.productId ?? item.name} item={item} />
                ))}
              </ul>
            </div>
          )}

          {/* Delivery legs */}
          {hasDelivery && (
            <div className="text-muted-foreground space-y-1.5 border-t pt-1.5 text-[11px]">
              {reservation.outboundDeliveryAddress && (
                <DeliveryAddressRow
                  label={tReservations("deliveryAddressLabel")}
                  address={reservation.outboundDeliveryAddress}
                />
              )}
              {reservation.returnDeliveryAddress && (
                <DeliveryAddressRow
                  label={tReservations("returnAddressLabel")}
                  address={reservation.returnDeliveryAddress}
                />
              )}
            </div>
          )}

          <div className="text-muted-foreground space-y-1 border-t pt-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground/70">{tReservations("periodStart")}</span>
              <span>
                {formatDateShort(reservation.startDate)}{" "}
                <span className="tabular-nums">{formatTime(reservation.startDate)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground/70">{tReservations("periodEnd")}</span>
              <span>
                {formatDateShort(reservation.endDate)}{" "}
                <span className="tabular-nums">{formatTime(reservation.endDate)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-0.5 font-medium">
              <span className="text-muted-foreground/70">{tReservations("totalAmount")}</span>
              <span className="text-foreground tabular-nums">
                {formatCurrency(Number(reservation.totalAmount), currency)}
              </span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
