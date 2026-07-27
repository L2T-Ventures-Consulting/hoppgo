"use client";

import type { ComponentType } from "react";

import Link from "next/link";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@louez/ui";
import { CheckCircleIcon } from "@louez/ui/icons";

import { ActivityListItem } from "./activity-list-item";
import type { DashboardAccent } from "@/components/dashboard/shared/dashboard-accent";
import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";
import { DashboardSectionCard } from "@/components/dashboard/shared/dashboard-section-card";
import type { HomeReservation } from "./home-types";

interface ActivityCardProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: DashboardAccent;
  reservations: HomeReservation[];
  emptyMessage: string;
  viewAllHref: string;
  showPeriod?: boolean;
  showAmount?: boolean;
  className?: string;
}

/** A list of reservations (departures, returns, pending requests). */
export const ActivityCard = ({
  title,
  description,
  icon,
  accent,
  reservations,
  emptyMessage,
  viewAllHref,
  showPeriod = false,
  showAmount = false,
  className,
}: ActivityCardProps) => {
  const t = useTranslations("dashboard.home");

  return (
    <DashboardSectionCard
      title={title}
      description={description}
      icon={icon}
      accent={accent}
      className={className}
      action={
        <Button variant="ghost" size="sm" render={<Link href={viewAllHref} />}>
          <span className="max-sm:sr-only">{t("viewAll")}</span>
          <ArrowRight />
        </Button>
      }
    >
      {reservations.length === 0 ? (
        <DashboardEmptyState icon={CheckCircleIcon} description={emptyMessage} />
      ) : (
        <div className="-mx-2 space-y-0.5 sm:-mx-3">
          {reservations.map((reservation) => (
            <ActivityListItem
              key={reservation.id}
              reservation={reservation}
              accent={accent}
              showPeriod={showPeriod}
              showAmount={showAmount}
            />
          ))}
        </div>
      )}
    </DashboardSectionCard>
  );
};
