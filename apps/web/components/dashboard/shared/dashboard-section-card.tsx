import type { ComponentType, ReactNode } from "react";

import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@louez/ui";
import { cn } from "@louez/utils";

import type { DashboardAccent } from "./dashboard-accent";
import { DashboardIconTile } from "./dashboard-icon-tile";

interface DashboardSectionCardProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  accent?: DashboardAccent;
  /** Trailing header slot — a "view all" button, a status badge, … */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Card shell shared by every dashboard section. Same paddings, same header
 * rhythm, same accent tile — widgets only provide their content.
 */
export const DashboardSectionCard = ({
  title,
  description,
  icon,
  accent = "neutral",
  action,
  children,
  className,
  contentClassName,
}: DashboardSectionCardProps) => (
  <Card className={cn("flex min-w-0 flex-col", className)}>
    <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
      {icon && <DashboardIconTile icon={icon} accent={accent} />}
      <div className="min-w-0 flex-1">
        {/* Wraps rather than truncates: section titles get long once translated. */}
        <CardTitle className="line-clamp-2 text-base leading-snug">{title}</CardTitle>
        {description && (
          <CardDescription className="mt-0.5 line-clamp-1">{description}</CardDescription>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </CardHeader>
    <CardPanel className={cn("flex-1 p-4 pt-0 sm:p-5 sm:pt-0", contentClassName)}>
      {children}
    </CardPanel>
  </Card>
);
