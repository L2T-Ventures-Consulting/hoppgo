import type { ComponentType } from "react";

import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Button } from "@louez/ui";
import { ZapSolidIcon } from "@louez/ui/icons";
import { cn } from "@louez/utils";

import type { DashboardAccent } from "@/components/dashboard/shared/dashboard-accent";
import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";

interface TeamLimitNoticeProps {
  icon: ComponentType<{ className?: string }>;
  accent: DashboardAccent;
  title: string;
  description: string;
  actionLabel: string;
  className?: string;
}

/** Upsell block shown instead of the invite form when the plan blocks it. */
export const TeamLimitNotice = ({
  icon,
  accent,
  title,
  description,
  actionLabel,
  className,
}: TeamLimitNoticeProps) => (
  <div className={cn("flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-start", className)}>
    <DashboardIconTile icon={icon} accent={accent} />
    <div className="min-w-0 flex-1 space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    <Button
      className="w-full shrink-0 sm:w-auto"
      render={<Link href="/dashboard/settings/subscription" />}
    >
      <ZapSolidIcon />
      {actionLabel}
      <ArrowRight />
    </Button>
  </div>
);
