"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CreditCard, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge, Button } from "@louez/ui";

import { AiCreditsTopupModal } from "@/components/dashboard/ai-credits-topup-modal";
import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";
import type { AiCreditPackage } from "@/lib/plans";

import { formatCredits } from "./credits-format";
import { OPEN_AI_CREDITS_TOPUP_EVENT } from "./recharge-button";

interface AiCreditsHeaderProps {
  /** Total available (monthly remaining + prepaid), null = unlimited. */
  totalCredits: number | null;
  low: boolean;
  packages: AiCreditPackage[];
  voiceCreditsPerMinute: number | null;
  numberRentalCredits: number | null;
}

/**
 * Sticky page header: identity on the left, the wallet on the right. It owns
 * the single recharge modal of the page — the deep link (`?recharge=1`, used by
 * the low-balance emails) and every in-page call to action open it from here.
 */
export const AiCreditsHeader = ({
  totalCredits,
  low,
  packages,
  voiceCreditsPerMinute,
  numberRentalCredits,
}: AiCreditsHeaderProps) => {
  const t = useTranslations("dashboard.aiCredits");
  const searchParams = useSearchParams();
  const [topupOpen, setTopupOpen] = useState(false);

  const canTopup = packages.length > 0;

  useEffect(() => {
    if (!canTopup) return;
    if (searchParams.get("recharge") === "1") setTopupOpen(true);
    const open = () => setTopupOpen(true);
    window.addEventListener(OPEN_AI_CREDITS_TOPUP_EVENT, open);
    return () => window.removeEventListener(OPEN_AI_CREDITS_TOPUP_EVENT, open);
  }, [canTopup, searchParams]);

  return (
    <div className="bg-background sticky top-0 z-20 -mx-4 -mt-4 border-b px-4 py-3 sm:-mx-6 sm:px-6 md:-mt-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DashboardIconTile icon={Wallet} accent="submitted" />
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight font-semibold">{t("page.title")}</h1>
            <p className="text-muted-foreground hidden truncate text-xs sm:block">
              {t("page.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={low ? "warning" : "secondary"}
            className="gap-1.5 py-1.5 pr-2.5 pl-2 text-sm font-medium tabular-nums"
          >
            <Wallet className="h-3.5 w-3.5" />
            {totalCredits === null
              ? t("unlimited")
              : `${formatCredits(totalCredits)} ${t("creditsUnit")}`}
          </Badge>
          {canTopup && (
            <Button
              size="sm"
              className="gap-1.5 transition-transform duration-150 ease-out active:scale-[0.96]"
              onClick={() => setTopupOpen(true)}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {t("recharge")}
            </Button>
          )}
        </div>
      </div>

      {canTopup && (
        <AiCreditsTopupModal
          open={topupOpen}
          onOpenChange={setTopupOpen}
          packages={packages}
          returnPath="/dashboard/ai-credits"
          voiceCreditsPerMinute={voiceCreditsPerMinute}
          numberRentalCredits={numberRentalCredits}
        />
      )}
    </div>
  );
};
