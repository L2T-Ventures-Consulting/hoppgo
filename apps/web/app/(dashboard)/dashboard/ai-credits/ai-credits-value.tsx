import Link from "next/link";

import { ImagePlus, MessagesSquare, PhoneCall, Sparkles, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@louez/ui";

import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";
import { DashboardSectionCard } from "@/components/dashboard/shared/dashboard-section-card";

import { formatCredits, secondsToMinutes } from "./credits-format";
import { RechargeButton } from "./recharge-button";

interface AiCreditsValueProps {
  /** Current-month recap, already derived from the billed ledger. */
  summary: {
    conversations: number;
    calls: number;
    callSeconds: number;
    images: number;
    credits: number;
  };
  /** True when the store has never bought nor spent a single credit. */
  isNewcomer: boolean;
  canTopup: boolean;
}

/**
 * Two faces of the same question — "what are credits worth to me?". A merchant
 * who has never spent one gets the pitch; everyone else gets the receipt of
 * what this month's credits actually did for the shop.
 */
export const AiCreditsValue = async ({ summary, isNewcomer, canTopup }: AiCreditsValueProps) => {
  const t = await getTranslations("dashboard.aiCredits");

  if (isNewcomer) {
    const perks = [
      {
        icon: MessagesSquare,
        title: t("page.perkAdvisorTitle"),
        description: t("page.perkAdvisorDescription"),
      },
      {
        icon: PhoneCall,
        title: t("page.perkVoiceTitle"),
        description: t("page.perkVoiceDescription"),
      },
      {
        icon: ImagePlus,
        title: t("page.perkImagesTitle"),
        description: t("page.perkImagesDescription"),
      },
    ];

    return (
      <DashboardSectionCard
        title={t("page.pitchTitle")}
        description={t("page.pitchDescription")}
        icon={Sparkles}
        accent="primary"
        contentClassName="space-y-4"
      >
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {perks.map((perk) => (
              <div key={perk.title} className="bg-muted/40 space-y-2 rounded-xl p-3.5">
                <DashboardIconTile icon={perk.icon} accent="primary" size="sm" />
                <p className="text-sm leading-snug font-medium">{perk.title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{perk.description}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canTopup && <RechargeButton label={t("recharge")} />}
            <Button variant="outline" render={<Link href="/dashboard/ai-assistant" />}>
              {t("page.pitchSecondaryCta")}
            </Button>
          </div>
          <p className="text-muted-foreground/70 text-xs">{t("page.pitchFootnote")}</p>
        </>
      </DashboardSectionCard>
    );
  }

  const stats = [
    { label: t("page.recapConversations"), value: summary.conversations, icon: MessagesSquare },
    { label: t("page.recapCalls"), value: summary.calls, icon: PhoneCall },
    { label: t("page.recapImages"), value: summary.images, icon: ImagePlus },
  ].filter((stat) => stat.value > 0);

  return (
    <DashboardSectionCard
      title={t("page.recapTitle")}
      description={t("page.recapDescription")}
      icon={TrendingUp}
      accent="success"
      contentClassName="space-y-3"
    >
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-muted/40 flex items-center gap-3 rounded-xl p-3.5">
              <DashboardIconTile icon={stat.icon} accent="success" size="sm" />
              <div className="min-w-0">
                <p className="text-xl leading-tight font-bold tabular-nums">{stat.value}</p>
                <p className="text-muted-foreground truncate text-xs">{stat.label}</p>
              </div>
            </div>
          ))}
          <div className="bg-muted/40 flex items-center gap-3 rounded-xl p-3.5">
            <DashboardIconTile icon={Sparkles} accent="submitted" size="sm" />
            <div className="min-w-0">
              <p className="text-xl leading-tight font-bold tabular-nums">
                {formatCredits(summary.credits)}
              </p>
              <p className="text-muted-foreground truncate text-xs">{t("page.recapCredits")}</p>
            </div>
          </div>
        </div>
        {summary.callSeconds > 0 && (
          <p className="text-muted-foreground text-xs">
            {t("page.recapCallTime", { minutes: secondsToMinutes(summary.callSeconds) })}
          </p>
        )}
      </>
    </DashboardSectionCard>
  );
};
