"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@louez/ui";
import { cn } from "@louez/utils";

export type Period = "7d" | "30d" | "90d" | "6m" | "12m";

const PERIODS: Period[] = ["7d", "30d", "90d", "6m", "12m"];

interface UnifiedPeriodFilterProps {
  className?: string;
}

export const UnifiedPeriodFilter = ({ className }: UnifiedPeriodFilterProps) => {
  const t = useTranslations("dashboard.analytics");
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = (searchParams.get("period") as Period) || "30d";

  const periods = PERIODS.map((value) => ({ value, label: t(`period.${value}`) }));

  const handlePeriodChange = (value: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`/dashboard/analytics?${params.toString()}`);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Segmented control (desktop) */}
      <div className="bg-muted hidden items-center gap-0.5 rounded-lg p-0.5 md:flex">
        {periods.map((period) => (
          <Button
            key={period.value}
            size="sm"
            variant={currentPeriod === period.value ? "default" : "ghost"}
            onClick={() => handlePeriodChange(period.value)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Select (mobile) */}
      <Select
        value={currentPeriod}
        onValueChange={(value) => {
          if (value !== null) handlePeriodChange(value as Period);
        }}
      >
        <SelectTrigger className="flex-1 md:hidden">
          <SelectValue>
            {periods.find((period) => period.value === currentPeriod)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.value} value={period.value} label={period.label}>
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => router.refresh()}
        aria-label={t("refresh")}
      >
        <RefreshCw />
      </Button>
    </div>
  );
};
