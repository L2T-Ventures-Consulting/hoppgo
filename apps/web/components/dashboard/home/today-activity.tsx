"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardPanel } from "@louez/ui";
import { CheckCircleIcon } from "@louez/ui/icons";
import { cn } from "@louez/utils";

import { ActivityCard } from "./activity-card";
import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";
import type { HomeReservation } from "./home-types";

interface TodayActivityProps {
  departures: HomeReservation[];
  returns: HomeReservation[];
  className?: string;
}

export const TodayActivity = ({ departures, returns, className }: TodayActivityProps) => {
  const t = useTranslations("dashboard.home");

  if (departures.length === 0 && returns.length === 0) {
    return (
      <Card className={className}>
        <CardPanel className="p-4 sm:p-5">
          <DashboardEmptyState
            icon={CheckCircleIcon}
            title={t("activity.noActivityTitle")}
            description={t("activity.noActivityDescription")}
          />
        </CardPanel>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", className)}>
      <ActivityCard
        title={t("activity.departures")}
        description={t("activity.departuresDescription")}
        icon={ArrowUpRight}
        accent="success"
        reservations={departures}
        emptyMessage={t("activity.noDepartures")}
        viewAllHref="/dashboard/reservations?restorePreferredView=true&date=today&period=today&operation=departure&status=confirmed&statuses=confirmed"
        prefetchCalendar
      />
      <ActivityCard
        title={t("activity.returns")}
        description={t("activity.returnsDescription")}
        icon={ArrowDownRight}
        accent="progress"
        reservations={returns}
        emptyMessage={t("activity.noReturns")}
        viewAllHref="/dashboard/reservations?restorePreferredView=true&date=today&period=today&operation=return&status=ongoing&statuses=ongoing"
        prefetchCalendar
      />
    </div>
  );
};
