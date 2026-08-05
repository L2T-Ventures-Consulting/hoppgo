import { Badge } from "@louez/ui";
import { TrendingDownSolidIcon, TrendingUpSolidIcon } from "@louez/ui/icons";
import { cn } from "@louez/utils";

interface DashboardTrendBadgeProps {
  /** Growth in percent — `null`/`undefined` renders nothing. */
  trend?: number | null;
  className?: string;
}

/** Whole percentages stay whole; anything else keeps a single decimal. */
const formatTrend = (trend: number) => (Number.isInteger(trend) ? `${trend}` : trend.toFixed(1));

/**
 * Signed growth pill of the dashboard. Lives on its own so the KPI tiles and
 * the analytics heroes share one shape instead of drifting apart.
 */
export const DashboardTrendBadge = ({ trend, className }: DashboardTrendBadgeProps) => {
  if (trend === null || trend === undefined) {
    return null;
  }

  return (
    <Badge
      variant={trend > 0 ? "success" : trend < 0 ? "failed" : "expired"}
      className={cn("gap-0.5", className)}
    >
      {trend > 0 ? <TrendingUpSolidIcon /> : trend < 0 ? <TrendingDownSolidIcon /> : null}
      {trend > 0 ? "+" : ""}
      {formatTrend(trend)}%
    </Badge>
  );
};
