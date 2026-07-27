import type { ComponentType } from "react";

import { cn } from "@louez/utils";

import { DashboardIconTile } from "./dashboard-icon-tile";

interface DashboardEmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title?: string;
  description: string;
  className?: string;
}

/** Uniform empty state for every dashboard section. */
export const DashboardEmptyState = ({
  icon,
  title,
  description,
  className,
}: DashboardEmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 px-4 py-8 text-center",
      className,
    )}
  >
    <DashboardIconTile icon={icon} accent="neutral" />
    <div className="space-y-1">
      {title && <p className="font-medium">{title}</p>}
      <p className="text-muted-foreground text-sm text-balance">{description}</p>
    </div>
  </div>
);
