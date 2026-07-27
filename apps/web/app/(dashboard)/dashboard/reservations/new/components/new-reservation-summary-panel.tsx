"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Separator,
} from "@louez/ui";
import { formatCurrency } from "@louez/utils";

import { formatStoreDate } from "@/lib/utils/store-date";

import type { Customer, ReservationStepId } from "../types";

interface DetailedDuration {
  days: number;
  hours: number;
  minutes: number;
  totalHours: number;
  totalMinutes: number;
}

export type ReservationSectionId = Exclude<ReservationStepId, "confirm">;

interface SectionChecklistItem {
  id: ReservationSectionId;
  label: string;
  done: boolean;
}

interface NewReservationSummaryPanelProps {
  selectedCustomer: Customer | undefined;
  /** True while the selected customer was created from this form. */
  isNewCustomer: boolean;
  startDate: Date | undefined;
  endDate: Date | undefined;
  duration: number;
  detailedDuration: DetailedDuration | null;
  timezone: string | undefined;
  itemCount: number;
  isDeliveryEnabled: boolean;
  isDeliveryReady: boolean;
  subtotal: number;
  tulipInsuranceAmount: number;
  isTulipInsuranceQuoteLoading: boolean;
  deliveryFee: number;
  deposit: number;
  sendConfirmationEmail: boolean;
  onSendConfirmationEmailChange: (checked: boolean) => void;
  onNavigateToSection: (sectionId: ReservationSectionId) => void;
}

export function NewReservationSummaryPanel({
  selectedCustomer,
  isNewCustomer,
  startDate,
  endDate,
  duration,
  detailedDuration,
  timezone,
  itemCount,
  isDeliveryEnabled,
  isDeliveryReady,
  subtotal,
  tulipInsuranceAmount,
  isTulipInsuranceQuoteLoading,
  deliveryFee,
  deposit,
  sendConfirmationEmail,
  onSendConfirmationEmailChange,
  onNavigateToSection,
}: NewReservationSummaryPanelProps) {
  const t = useTranslations("dashboard.reservations.manualForm");

  const isCustomerDone = Boolean(selectedCustomer);
  const isPeriodDone = Boolean(startDate && endDate && endDate >= startDate);

  const checklist: SectionChecklistItem[] = [
    { id: "customer", label: t("steps.customer"), done: isCustomerDone },
    { id: "period", label: t("steps.period"), done: isPeriodDone },
    { id: "products", label: t("steps.products"), done: itemCount > 0 },
    ...(isDeliveryEnabled
      ? [
          {
            id: "delivery" as const,
            label: t("steps.delivery"),
            done: isDeliveryReady,
          },
        ]
      : []),
  ];
  const doneCount = checklist.filter((item) => item.done).length;

  const customerName = selectedCustomer
    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
    : null;
  const customerEmail = selectedCustomer?.email;

  const durationLabel = detailedDuration
    ? [
        detailedDuration.days > 0 && t("durationDays", { count: detailedDuration.days }),
        detailedDuration.hours > 0 && t("durationHours", { count: detailedDuration.hours }),
        detailedDuration.days === 0 &&
          detailedDuration.hours === 0 &&
          detailedDuration.minutes > 0 &&
          `${detailedDuration.minutes} min`,
      ]
        .filter(Boolean)
        .join(", ") || t("durationDays", { count: duration })
    : t("durationDays", { count: duration });

  const total = subtotal + tulipInsuranceAmount + deliveryFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("confirmTitle")}</CardTitle>
        <CardDescription>{t("confirmDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Section completeness checklist */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label>{t("summary")}</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {doneCount}/{checklist.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {checklist.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigateToSection(item.id)}
                  className="flex w-full items-center gap-2 rounded-md text-left text-sm hover:underline"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="text-muted-foreground/40 h-4 w-4 shrink-0" />
                  )}
                  <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {(customerName || isPeriodDone) && <Separator />}

        {/* Customer recap */}
        {customerName && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{customerName}</p>
              {isNewCustomer && (
                <Badge variant="progress" className="h-5 shrink-0 px-1.5 text-[10px]">
                  {t("newCustomerBadge")}
                </Badge>
              )}
            </div>
            {customerEmail && (
              <p className="text-muted-foreground truncate text-xs">{customerEmail}</p>
            )}
          </div>
        )}

        {/* Period recap */}
        {isPeriodDone && startDate && endDate && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t("startDate")}</span>
              <span className="tabular-nums">
                {formatStoreDate(startDate, timezone, "d MMM yyyy HH:mm")}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t("endDate")}</span>
              <span className="tabular-nums">
                {formatStoreDate(endDate, timezone, "d MMM yyyy HH:mm")}
              </span>
            </div>
            <div className="flex justify-between gap-2 font-medium">
              <span>{t("duration")}</span>
              <span>{durationLabel}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {(tulipInsuranceAmount > 0 || isTulipInsuranceQuoteLoading) && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t("tulipInsurance.title")}</span>
              {isTulipInsuranceQuoteLoading ? (
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              ) : (
                <span className="tabular-nums">{formatCurrency(tulipInsuranceAmount)}</span>
              )}
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t("totalDeliveryFee")}</span>
              <span className="tabular-nums">{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("deposit")}</span>
            <span className="tabular-nums">{formatCurrency(deposit)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between gap-2 text-base font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center space-x-2">
          <Checkbox
            id="sendConfirmationEmail"
            checked={sendConfirmationEmail}
            onCheckedChange={(checked) => onSendConfirmationEmailChange(checked === true)}
          />
          <label
            htmlFor="sendConfirmationEmail"
            className="text-muted-foreground min-w-0 cursor-pointer text-sm leading-tight"
          >
            {t("sendConfirmationEmail")}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
