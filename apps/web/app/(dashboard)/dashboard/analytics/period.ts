/**
 * Period vocabulary shared by the analytics routes: the filter in the layout
 * writes `?period=`, both sub-pages read it back to size their queries.
 */
export type Period = "7d" | "30d" | "90d" | "6m" | "12m";

export const PERIODS: Period[] = ["7d", "30d", "90d", "6m", "12m"];

const DEFAULT_PERIOD: Period = "30d";

/**
 * `days` sizes the rolling window (KPIs, top products); `granularity` decides
 * how that window is bucketed on the charts — daily for the short periods,
 * calendar months for the long ones.
 */
type PeriodConfig =
  | { days: number; granularity: "day" }
  | { days: number; granularity: "month"; months: number };

const PERIOD_CONFIGS: Record<Period, PeriodConfig> = {
  "7d": { days: 7, granularity: "day" },
  "30d": { days: 30, granularity: "day" },
  "90d": { days: 90, granularity: "day" },
  "6m": { days: 180, granularity: "month", months: 6 },
  "12m": { days: 365, granularity: "month", months: 12 },
};

export const getPeriodConfig = (period: Period): PeriodConfig =>
  PERIOD_CONFIGS[period] ?? PERIOD_CONFIGS[DEFAULT_PERIOD];

/** `?period=` is user input — anything unknown falls back to the default window. */
export const parsePeriod = (value: string | undefined): Period =>
  PERIODS.includes(value as Period) ? (value as Period) : DEFAULT_PERIOD;
