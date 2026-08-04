"use client";

import { useTranslations } from "next-intl";

import { ClockSolidIcon } from "@louez/ui/icons";

import { ActivityCard } from "./activity-card";
import type { HomeReservation } from "./home-types";

interface PendingRequestsProps {
  pending: HomeReservation[];
  className?: string;
}

export const PendingRequests = ({ pending, className }: PendingRequestsProps) => {
  const t = useTranslations("dashboard.home");

  if (pending.length === 0) {
    return null;
  }

  return (
    <ActivityCard
      title={t("pending.title")}
      description={t("pending.description")}
      icon={ClockSolidIcon}
      accent="pending"
      reservations={pending}
      emptyMessage={t("pending.empty")}
      viewAllHref="/dashboard/reservations?status=pending"
      showPeriod
      showAmount
      className={className}
    />
  );
};
