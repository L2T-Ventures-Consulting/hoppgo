"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";
import { ArrowRight, Lock, Zap } from "lucide-react";

import { Button, Card, CardPanel } from "@louez/ui";

import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";

interface FeatureLockedCardProps {
  variant: "advisor" | "voice";
}

/**
 * What a merchant sees instead of the configuration form when the plan does not
 * include the feature: why it is closed, what it would do for the shop, and the
 * one way out. A single card — the page title already names the feature, so a
 * blurred preview of the form underneath would only repeat it.
 *
 * The lock copy lives under the advisor namespace and is shared by both faces,
 * which is what the voice agent already did.
 */
export const FeatureLockedCard = ({ variant }: FeatureLockedCardProps) => {
  const t = useTranslations("dashboard.settings.aiAdvisor.locked");
  const tHero = useTranslations(`dashboard.aiAssistant.hero.${variant}`);

  return (
    <Card>
      <CardPanel className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <DashboardIconTile icon={Lock} accent="neutral" />
          <div className="min-w-0">
            <h3 className="font-semibold">{t("featureLocked")}</h3>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">{tHero("b1")}</p>
          </div>
        </div>
        <Button
          render={<Link href="/dashboard/subscription" />}
          className="w-full shrink-0 gap-2 sm:w-auto"
        >
          <Zap className="h-4 w-4" />
          {t("upgrade")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardPanel>
    </Card>
  );
};
