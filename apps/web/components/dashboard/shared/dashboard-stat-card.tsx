import type { ComponentType, ReactNode } from "react";

import Link from "next/link";

import { Badge, Card, CardPanel } from "@louez/ui";
import { TrendingDownSolidIcon, TrendingUpSolidIcon } from "@louez/ui/icons";
import { cn } from "@louez/utils";

import type { DashboardAccent } from "./dashboard-accent";
import { DashboardIconTile } from "./dashboard-icon-tile";

interface DashboardStatCardProps {
  title: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  accent?: DashboardAccent;
  subtitle?: string;
  /** Short qualifier rendered as a badge next to the value. */
  badge?: string;
  /** Growth in percent — `null`/`undefined` hides the trend badge. */
  trend?: number | null;
  href?: string;
}

/** Whole percentages stay whole; anything else keeps a single decimal. */
const formatTrend = (trend: number) => (Number.isInteger(trend) ? `${trend}` : trend.toFixed(1));

/** Uniform KPI tile of the dashboard. */
export const DashboardStatCard = ({
  title,
  value,
  icon,
  accent = "neutral",
  subtitle,
  badge,
  trend,
  href,
}: DashboardStatCardProps) => {
  const card = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "group-hover:border-primary/20 group-hover:bg-muted/50",
      )}
    >
      <CardPanel className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground min-w-0 text-xs font-medium sm:text-sm">{title}</p>
          <DashboardIconTile icon={icon} accent={accent} size="sm" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xl leading-tight font-bold tracking-tight tabular-nums sm:text-2xl">
              {value}
            </span>
            {badge && <Badge variant="pending">{badge}</Badge>}
            {trend !== null && trend !== undefined && (
              <Badge
                variant={trend > 0 ? "success" : trend < 0 ? "failed" : "expired"}
                className="gap-0.5"
              >
                {trend > 0 ? <TrendingUpSolidIcon /> : trend < 0 ? <TrendingDownSolidIcon /> : null}
                {trend > 0 ? "+" : ""}
                {formatTrend(trend)}%
              </Badge>
            )}
          </div>
          {subtitle && <p className="text-muted-foreground truncate text-xs">{subtitle}</p>}
        </div>
      </CardPanel>
    </Card>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="group focus-visible:ring-ring block h-full rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {card}
    </Link>
  );
};
