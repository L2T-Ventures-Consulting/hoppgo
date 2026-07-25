import type { ComponentType } from "react";

import { cn } from "@louez/utils";

import { HomeIconTile } from "./home-icon-tile";

interface HomeEmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title?: string;
  description: string;
  className?: string;
}

/** Uniform empty state for every home section. */
export const HomeEmptyState = ({ icon, title, description, className }: HomeEmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 px-4 py-8 text-center",
      className,
    )}
  >
    <HomeIconTile icon={icon} accent="neutral" />
    <div className="space-y-1">
      {title && <p className="font-medium">{title}</p>}
      <p className="text-muted-foreground text-sm text-balance">{description}</p>
    </div>
  </div>
);
