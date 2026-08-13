"use client";

import { Tablet } from "lucide-react";
import { useTranslations } from "next-intl";

import { MobileIcon, MonitorIcon } from "@louez/ui/icons";
import { cn } from "@louez/utils";

import {
  DASHBOARD_ACCENT_FILL,
  type DashboardAccent,
} from "@/components/dashboard/shared/dashboard-accent";
import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";

export interface DeviceStats {
  mobile: number;
  tablet: number;
  desktop: number;
}

const DEVICE_ACCENTS: Record<keyof DeviceStats, DashboardAccent> = {
  mobile: "progress",
  desktop: "success",
  tablet: "pending",
};

const DEVICE_ICONS = {
  mobile: MobileIcon,
  desktop: MonitorIcon,
  tablet: Tablet,
};

interface DeviceBreakdownProps {
  data: DeviceStats;
  className?: string;
}

export const DeviceBreakdown = ({ data, className }: DeviceBreakdownProps) => {
  const t = useTranslations("dashboard.analytics");
  const deviceValues = (Object.keys(DEVICE_ACCENTS) as Array<keyof DeviceStats>).map((key) => ({
    key,
    value: Number(data[key]) || 0,
  }));
  const total = deviceValues.reduce((sum, device) => sum + device.value, 0);

  if (total === 0) {
    return (
      <DashboardEmptyState icon={MonitorIcon} description={t("noData")} className={className} />
    );
  }

  const devices = deviceValues
    .map(({ key, value }) => ({
      key,
      label: t(key),
      value,
      percentage: Math.round((value / total) * 100),
      icon: DEVICE_ICONS[key],
      accent: DEVICE_ACCENTS[key],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
        {devices.map((device) => (
          <div
            key={device.key}
            className={cn(
              "h-full transition-all duration-500",
              DASHBOARD_ACCENT_FILL[device.accent],
            )}
            style={{ width: `${device.percentage}%` }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {devices.map((device) => (
          <div key={device.key} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  DASHBOARD_ACCENT_FILL[device.accent],
                )}
              />
              <device.icon className="text-muted-foreground size-4 shrink-0" />
              <span className="truncate text-sm">{device.label}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm">
              <span className="font-medium tabular-nums">{device.value.toLocaleString()}</span>
              <span className="text-muted-foreground tabular-nums">({device.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
