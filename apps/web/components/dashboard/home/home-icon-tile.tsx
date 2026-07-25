import type { ComponentType } from "react";

import { cn } from "@louez/utils";

import { HOME_ACCENT_SURFACE, type HomeAccent } from "./home-accent";

interface HomeIconTileProps {
  icon: ComponentType<{ className?: string }>;
  accent?: HomeAccent;
  /** `sm` for stat cards and dense rows, `md` for section headers. */
  size?: "sm" | "md";
  className?: string;
}

/** The single icon-container shape used across the home page. */
export const HomeIconTile = ({
  icon: Icon,
  accent = "neutral",
  size = "md",
  className,
}: HomeIconTileProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex shrink-0 items-center justify-center rounded-lg",
      size === "sm" ? "size-8" : "size-9",
      HOME_ACCENT_SURFACE[accent],
      className,
    )}
  >
    <Icon className={size === "sm" ? "size-4" : "size-4.5"} />
  </span>
);
