"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@louez/ui";
import { cn } from "@louez/utils";

import { parsePeriod, type Period, PERIODS } from "./period";

interface UnifiedPeriodFilterProps {
  className?: string;
}

export const UnifiedPeriodFilter = ({ className }: UnifiedPeriodFilterProps) => {
  const t = useTranslations("dashboard.analytics");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPeriod = parsePeriod(searchParams.get("period") ?? undefined);

  const periods = PERIODS.map((value) => ({ value, label: t(`period.${value}`) }));

  const handlePeriodChange = (value: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    // The filter lives in the shared layout, so it has to stay on whichever
    // analytics sub-page is currently open.
    router.push(`${pathname}?${params.toString()}`);
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
