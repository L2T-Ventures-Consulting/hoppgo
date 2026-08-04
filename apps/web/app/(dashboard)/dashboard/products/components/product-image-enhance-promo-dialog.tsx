"use client";

import { Check, Sparkles } from "lucide-react";
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

interface ProductImageEnhancePromoDialogProps {
  open: boolean;
  onClose: () => void;
}

const BENEFIT_KEYS = [
  "aiEnhancePromoBenefitBackground",
  "aiEnhancePromoBenefitFraming",
  "aiEnhancePromoBenefitConsistency",
] as const;

/**
 * Teaser shown when AI image enhancement is not available on this instance:
 * the controls stay visible and explain what activating the AI would unlock.
 */
export function ProductImageEnhancePromoDialog({
  open,
  onClose,
}: ProductImageEnhancePromoDialogProps) {
  const t = useTranslations("dashboard.products.form");

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-4 shrink-0" />
            {t("aiEnhancePromoTitle")}
          </DialogTitle>
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
          <p className="text-muted-foreground mt-4 text-xs">{t("aiEnhancePromoNote")}</p>
        </DialogPanel>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("aiEnhancePromoClose")}
          </Button>
          <Button render={<Link href="/dashboard/ai-assistant" />} onClick={onClose}>
            <Sparkles data-slot="icon" />
            {t("aiEnhancePromoCta")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
