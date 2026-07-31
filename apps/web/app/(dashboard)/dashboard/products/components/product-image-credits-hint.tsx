"use client";

import type { ReactElement } from "react";

import Link from "next/link";

import { Coins, ExternalLink, Sparkles, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@louez/ui";
import { cn } from "@louez/utils";

import type {
  ProductImageEnhanceControls,
  ProductImageOperation,
} from "../hooks/use-product-image-enhance";

/** Where the merchant tops up — the AI credits page opens its recharge flow. */
export const AI_CREDITS_RECHARGE_HREF = "/dashboard/ai-credits?recharge=1";

interface ProductImageCreditsChipProps {
  operation: ProductImageOperation;
  credits: ProductImageEnhanceControls["credits"];
  className?: string;
}

/**
 * Compact price tag for an AI action: the label stays two words at most, the
 * tooltip carries the "what do I get for it" part. Renders nothing when the
 * instance does not meter credits (self-host).
 */
export function ProductImageCreditsChip({
  operation,
  credits,
  className,
}: ProductImageCreditsChipProps) {
  const t = useTranslations("dashboard.products.form");

  if (!credits.enabled) return null;

  const isBackgroundRemoval = operation === "remove-background";
  const cost = isBackgroundRemoval ? credits.bgRemovalCredits : credits.enhanceCredits;
  const label = cost > 0 ? t("aiCreditsChip", { count: cost }) : t("aiCreditsChipIncluded");

  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "bg-badge-gray-background text-badge-gray-foreground inline-flex h-5 shrink-0 cursor-help items-center gap-1 rounded-sm px-1.5 text-[10px] font-semibold whitespace-nowrap",
            "focus-visible:ring-ring outline-none focus-visible:ring-2",
            className,
          )}
          // A sibling of the action card, never nested inside its button.
          render={<button type="button" aria-label={label} />}
        >
          {cost > 0 ? (
            <Coins className="size-2.5 opacity-80" />
          ) : (
            <Sparkles className="size-2.5 opacity-80" />
          )}
          {label}
        </TooltipTrigger>
        <CreditsTooltipContent operation={operation} credits={credits} />
      </Tooltip>
    </TooltipProvider>
  );
}

/** The "what do I get, what does it cost" body, shared by every trigger. */
function CreditsTooltipContent({
  operation,
  credits,
}: Pick<ProductImageCreditsChipProps, "operation" | "credits">) {
  const t = useTranslations("dashboard.products.form");

  const isBackgroundRemoval = operation === "remove-background";
  const cost = isBackgroundRemoval ? credits.bgRemovalCredits : credits.enhanceCredits;

  return (
    <TooltipContent className="max-w-64 p-2.5">
      <p className="text-foreground text-xs font-medium">
        {t(isBackgroundRemoval ? "aiCreditsTooltipBgTitle" : "aiCreditsTooltipTitle")}
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        {t(isBackgroundRemoval ? "aiCreditsTooltipBgWhat" : "aiCreditsTooltipWhat")}
      </p>
      <p className="text-muted-foreground mt-1.5 text-xs">
        {cost > 0 ? t("aiCreditsTooltipCost", { count: cost }) : t("aiCreditsTooltipFree")}
      </p>
    </TooltipContent>
  );
}

/**
 * Same pitch as the chip, hung on an existing control. For surfaces where the
 * cost does not need its own standing element — a toolbar where the AI button
 * is already labelled — the price then lives one hover away instead of adding
 * a second thing to read.
 */
export function ProductImageCreditsTooltip({
  operation,
  credits,
  children,
}: Pick<ProductImageCreditsChipProps, "operation" | "credits"> & { children: ReactElement }) {
  if (!credits.enabled) return children;

  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger render={children} />
        <CreditsTooltipContent operation={operation} credits={credits} />
      </Tooltip>
    </TooltipProvider>
  );
}

interface ProductImageCreditsAlertProps {
  credits: ProductImageEnhanceControls["credits"];
}

/**
 * Persistent counterpart of the "credits exhausted" toast: a batch that stopped
 * mid-way (or a balance that cannot cover a single photo) must stay visible
 * with its recharge CTA.
 */
export function ProductImageCreditsAlert({ credits }: ProductImageCreditsAlertProps) {
  const t = useTranslations("dashboard.products.form");
  const tCommon = useTranslations("common");

  if (!credits.showExhaustedAlert) return null;

  return (
    <Alert variant="warning">
      <TriangleAlert />
      <AlertTitle>{t("aiCreditsExhaustedTitle")}</AlertTitle>
      <AlertDescription>{t("aiCreditsExhaustedDescription")}</AlertDescription>
      <AlertAction>
        {/* New tab: topping up must not discard an unsaved product form. */}
        <Button
          size="sm"
          render={<Link href={AI_CREDITS_RECHARGE_HREF} target="_blank" rel="noreferrer" />}
        >
          {t("aiCreditsRecharge")}
          <ExternalLink data-slot="icon" />
        </Button>
        {/* Only the transient (server-refused) variant can be dismissed: while
            the balance is truly too low the controls stay blocked. */}
        {!credits.isExhausted && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={tCommon("close")}
            onClick={credits.dismissExhaustedAlert}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </AlertAction>
    </Alert>
  );
}
