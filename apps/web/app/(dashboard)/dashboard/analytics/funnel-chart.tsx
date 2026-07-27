"use client";

import { cn } from "@louez/utils";

export interface FunnelStep {
  label: string;
  value: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  className?: string;
}

/** Progressively lighter primary fills — one metric, one hue. */
const STEP_FILLS = ["bg-primary/90", "bg-primary/70", "bg-primary/50", "bg-primary/30"];

export const FunnelChart = ({ steps, className }: FunnelChartProps) => {
  if (steps.length === 0) {
    return null;
  }

  const maxValue = steps[0]?.value || 1;

  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step, index) => {
        const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
        const previousValue = steps[index - 1]?.value ?? 0;
        const conversionRate =
          index === 0 ? 100 : previousValue > 0 ? (step.value / previousValue) * 100 : 0;

        return (
          <div key={step.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{step.label}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold tabular-nums">{step.value.toLocaleString()}</span>
                <span className="text-muted-foreground tabular-nums">{percentage.toFixed(0)}%</span>
              </div>
            </div>
            <div className="bg-muted relative h-7 w-full overflow-hidden rounded-lg">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                  STEP_FILLS[index] || "bg-primary/30",
                )}
                style={{ width: `${percentage}%` }}
              />
              {index > 0 && conversionRate < 100 && (
                <span className="text-muted-foreground absolute inset-y-0 right-2 flex items-center text-xs tabular-nums">
                  {conversionRate.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
