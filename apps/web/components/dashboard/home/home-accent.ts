/**
 * Accent palette shared by every widget of the dashboard home.
 *
 * Each widget used to bring its own colours (emerald / blue / orange / purple
 * Tailwind palettes, plus hand-written gradients in `dashboard-theme.css`), so
 * an icon tile and the badge sitting next to it never matched. Everything now
 * resolves to the badge tokens from `@louez/ui`: an accent gives the tile the
 * exact background/foreground pair its `<Badge variant>` counterpart uses.
 */
export type HomeAccent =
  | "success"
  | "progress"
  | "pending"
  | "submitted"
  | "review"
  | "neutral"
  | "primary";

/** Background + foreground pair for an accented surface (icon tile, dot, …). */
export const HOME_ACCENT_SURFACE: Record<HomeAccent, string> = {
  success: "bg-badge-success-background text-badge-success-foreground",
  progress: "bg-badge-progress-background text-badge-progress-foreground",
  pending: "bg-badge-pending-background text-badge-pending-foreground",
  submitted: "bg-badge-submitted-background text-badge-submitted-foreground",
  review: "bg-badge-review-background text-badge-review-foreground",
  neutral: "bg-badge-expired-background text-badge-expired-foreground",
  primary: "bg-primary/10 text-primary",
};
