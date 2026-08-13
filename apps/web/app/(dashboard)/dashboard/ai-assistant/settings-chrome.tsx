import type { ReactNode } from "react";

import { AiCreditsTopupBanners } from "@/components/dashboard/ai-credits-topup-banners";
import { AiCreditsTopupHost } from "@/components/dashboard/ai-credits-topup-host";
import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getNumberRentalCredits, getPhoneCreditsPerMinute } from "@/lib/ai/pricing";
import { areAiCreditsEnabled, getAiCreditPackages } from "@/lib/plans";
import type { AiCreditPackage } from "@/lib/plans";

interface AiAssistantSettingsChromeProps {
  /** Raw `?topup=`: Stripe returns to whichever page started the recharge. */
  topup?: string;
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * What the three assistant configuration pages share: the dashboard's standard
 * settings header, the Stripe round-trip banners, and the recharge modal the
 * in-page nudges reach for.
 *
 * It is a page-level component rather than a `layout.tsx` because layouts
 * cannot read `searchParams`, and the `?topup=` banners are the whole point of
 * showing the merchant they came back from checkout.
 *
 * The wallet balance deliberately does not appear here: the sidebar carries it
 * on every page, and `/dashboard/ai-credits` is one click away.
 */
export const AiAssistantSettingsChrome = ({
  topup,
  title,
  description,
  children,
}: AiAssistantSettingsChromeProps) => {
  // Credit layer is a cloud-only commercial add-on: self-host gets no packs, so
  // no modal is mounted and no recharge path exists.
  const packages: AiCreditPackage[] = areAiCreditsEnabled() ? getAiCreditPackages() : [];

  // Commercial voice tariffs (env-driven; 0 ⇒ not configured / free).
  const numberRentalCredits = getNumberRentalCredits();
  const voiceCreditsPerMinute = getPhoneCreditsPerMinute();

  return (
    <SettingsPageShell title={title} description={description} width="wide">
      <AiCreditsTopupBanners topup={topup} />

      <AiCreditsTopupHost
        packages={packages}
        voiceCreditsPerMinute={voiceCreditsPerMinute > 0 ? voiceCreditsPerMinute : null}
        numberRentalCredits={numberRentalCredits > 0 ? numberRentalCredits : null}
      />

      {children}
    </SettingsPageShell>
  );
};
