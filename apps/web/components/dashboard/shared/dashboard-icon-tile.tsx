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
      "relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
      size === "sm" ? "size-8" : "size-9",
      DASHBOARD_ACCENT_SURFACE[accent],
      className,
    )}
  >
    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_50%,rgba(255,255,255,1)_105%)]" />
    <Icon className={cn("relative z-10", size === "sm" ? "size-4" : "size-4.5")} />
  </span>
);
