"use client";

import { useEffect, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { AiCreditsTopupModal } from "@/components/dashboard/ai-credits-topup-modal";
import type { AiCreditPackage } from "@/lib/plans";

/**
 * The single name every recharge call to action uses. Anywhere on an AI page
 * can ask for the modal by dispatching it — the modal itself is mounted once,
 * by the host below.
 */
export const OPEN_TOPUP_EVENT = "ai-credits:open-topup";

/** Opens the page's recharge modal from any client component. */
export const openAiCreditsTopup = () => {
  window.dispatchEvent(new Event(OPEN_TOPUP_EVENT));
};

interface AiCreditsTopupHostProps {
  /** Empty ⇒ nothing to sell: no modal, no listener. */
  packages: AiCreditPackage[];
  voiceCreditsPerMinute: number | null;
  numberRentalCredits: number | null;
}

/**
 * Mounts the recharge modal for a page without drawing anything itself. The
 * modal used to hang off the sticky wallet bar; now that the AI pages wear the
 * same plain header as every other settings page, it needs a home that is not a
 * piece of chrome — so it gets one, and keeps both ways in: the `?recharge=1`
 * deep link from the renewal emails, and the window event from in-page nudges.
 */
export const AiCreditsTopupHost = ({
  packages,
  voiceCreditsPerMinute,
  numberRentalCredits,
}: AiCreditsTopupHostProps) => {
  // Stripe has to hand the merchant back to the page the recharge started from
  // — that page is the only one that will show the `?topup=` banner.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const canTopup = packages.length > 0;

  useEffect(() => {
    if (!canTopup) return;
    if (searchParams.get("recharge") === "1") setOpen(true);
    const openModal = () => setOpen(true);
    window.addEventListener(OPEN_TOPUP_EVENT, openModal);
    return () => window.removeEventListener(OPEN_TOPUP_EVENT, openModal);
  }, [canTopup, searchParams]);

  if (!canTopup) {
    return null;
  }

  return (
    <AiCreditsTopupModal
      open={open}
      onOpenChange={setOpen}
      packages={packages}
      returnPath={pathname}
      voiceCreditsPerMinute={voiceCreditsPerMinute}
      numberRentalCredits={numberRentalCredits}
    />
  );
};
