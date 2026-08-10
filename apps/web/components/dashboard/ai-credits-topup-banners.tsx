import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface AiCreditsTopupBannersProps {
  /** Raw `?topup=`: Stripe returns to whichever page started the recharge. */
  topup?: string;
}

/**
 * The acknowledgement of a Stripe round-trip, shown on whichever AI page the
 * recharge started from. It lives here rather than in each page because the
 * wallet is reachable from the assistant sections and from its own page, and
 * Stripe hands the merchant back to the exact one they left.
 */
export const AiCreditsTopupBanners = async ({ topup }: AiCreditsTopupBannersProps) => {
  if (topup !== "success" && topup !== "cancelled") {
    return null;
  }

  const t = await getTranslations("dashboard.aiCredits");

  if (topup === "cancelled") {
    return (
      <div className="bg-muted/40 text-muted-foreground rounded-xl px-3.5 py-3 text-sm">
        {t("topupCancelled")}
      </div>
    );
  }

  return (
    <div className="bg-badge-success-background/60 text-badge-success-foreground ring-badge-success-foreground/15 flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm ring-1 ring-inset">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {t("topupSuccess")}
    </div>
  );
};
