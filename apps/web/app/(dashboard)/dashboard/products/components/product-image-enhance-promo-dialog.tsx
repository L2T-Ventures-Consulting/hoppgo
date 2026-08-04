"use client";

import { useState } from "react";

import { Check, Coins } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@louez/ui";

import { WhatsNewLinkCard } from "@/components/dashboard/whats-new-link-card";

import type { ProductImageEnhancePromoReason } from "../hooks/use-product-image-enhance";
import { AI_CREDITS_RECHARGE_HREF } from "./product-image-credits-hint";

interface ProductImageEnhancePromoDialogProps {
  open: boolean;
  onClose: () => void;
  reason: ProductImageEnhancePromoReason;
  creditsPerImage: number;
}

const BENEFIT_KEYS = [
  "aiEnhancePromoBenefitBackground",
  "aiEnhancePromoBenefitFraming",
  "aiEnhancePromoBenefitConsistency",
] as const;

/** Value-first teaser for either activating AI enhancement or adding credits. */
export function ProductImageEnhancePromoDialog({
  open,
  onClose,
  reason,
  creditsPerImage,
}: ProductImageEnhancePromoDialogProps) {
  const t = useTranslations("dashboard.products.form");
  const creditsRequired = reason === "credits-required";
  const [isDemoViewerOpen, setIsDemoViewerOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isDemoViewerOpen) return;
        if (!nextOpen) onClose();
      }}
    >
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("aiEnhancePromoTitle")}</DialogTitle>
          <DialogDescription>{t("aiEnhancePromoDescription")}</DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <ul className="space-y-2.5">
            {BENEFIT_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2.5 text-sm">
                <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-xs">
            {creditsRequired
              ? t("aiCreditsLearnMoreCost", { count: creditsPerImage })
              : t("aiEnhancePromoNote")}
          </p>
          <WhatsNewLinkCard
            announcementId="product-image-ai"
            className="mt-4"
            onMediaViewerOpenChange={setIsDemoViewerOpen}
          />
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground sm:mr-auto"
          >
            {t("aiEnhancePromoClose")}
          </Button>
          <Button
            render={<Link href={AI_CREDITS_RECHARGE_HREF} target="_blank" rel="noreferrer" />}
            onClick={onClose}
          >
            <Coins data-slot="icon" />
            {t("aiCreditsRecharge")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
