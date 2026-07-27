import type { ComponentType } from "react";

import { cn } from "@louez/utils";

import { DASHBOARD_ACCENT_SURFACE, type DashboardAccent } from "./dashboard-accent";

interface DashboardIconTileProps {
  icon: ComponentType<{ className?: string }>;
  accent?: DashboardAccent;
  /** `sm` for stat cards and dense rows, `md` for section headers. */
  size?: "sm" | "md";
  className?: string;
}

/** The single icon-container shape used across the dashboard. */
export const DashboardIconTile = ({
  icon: Icon,
  accent = "neutral",
  size = "md",
  className,
}: DashboardIconTileProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex shrink-0 items-center justify-center rounded-lg",
      size === "sm" ? "size-8" : "size-9",
      DASHBOARD_ACCENT_SURFACE[accent],
      className,
    )}
  >
    <Icon className={size === "sm" ? "size-4" : "size-4.5"} />
  </span>
);
