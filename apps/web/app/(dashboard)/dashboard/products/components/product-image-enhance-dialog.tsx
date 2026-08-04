"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import { Check, Eraser, Sparkles, Undo2 } from "lucide-react";
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
import { cn } from "@louez/utils";

import type { ProductImageEnhanceReviewItem } from "../hooks/use-product-image-enhance";

type EnhancePreviewBackground = "checkerboard" | "white";

// Subtle checkerboard so the transparent background stays readable in both themes.
export const AI_PREVIEW_CHECKERBOARD_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, rgba(120,120,120,0.16) 25%, transparent 25%, transparent 75%, rgba(120,120,120,0.16) 75%), linear-gradient(45deg, rgba(120,120,120,0.16) 25%, transparent 25%, transparent 75%, rgba(120,120,120,0.16) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
};

const REVIEW_IMAGE_MAX_RETRIES = 3;

/**
 * A freshly uploaded object can answer 403/404 for a moment while its
 * public-read ACL propagates on the bucket — retry a few times with a
 * cache-busting query instead of leaving an empty pane.
 *
 * Mounted with a `key` on its source: moving to the next review item must not
 * reuse the element, or the browser keeps painting the previous photo until the
 * new one has decoded — reading as "the after pane is stuck on the last item".
 */
function ReviewImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [attempt, setAttempt] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const retriableSrc =
    attempt > 0 && !src.startsWith("data:")
      ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`
      : src;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={retriableSrc}
        alt={alt}
        className={cn(className, "transition-opacity duration-200", !isLoaded && "opacity-0")}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (attempt >= REVIEW_IMAGE_MAX_RETRIES) return;
          window.setTimeout(() => setAttempt((current) => current + 1), 700 * (attempt + 1));
        }}
      />
      {!isLoaded && (
        <span className="bg-muted/60 absolute inset-0 animate-pulse" aria-hidden="true" />
      )}
    </>
  );
}

/**
 * Before/after comparison of a staged result. Shared by the standalone review
 * dialog and by the crop dialog's in-modal review, so both read identically.
 */
export function ProductImageEnhanceComparison({
  item,
  className,
}: {
  item: ProductImageEnhanceReviewItem;
  className?: string;
}) {
  const t = useTranslations("dashboard.products.form");
  const [background, setBackground] = useState<EnhancePreviewBackground>("checkerboard");
  const isBackgroundRemoval = item.operation === "remove-background";
  const resultHint =
    item.operation === "enhance" && item.framingMode === "preserve"
      ? "aiEnhanceTransparencyHintPreserve"
      : "aiEnhanceTransparencyHint";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <figure className="space-y-1.5">
          <figcaption className="text-muted-foreground text-xs font-medium">
            {t("aiEnhanceBefore")}
          </figcaption>
          <div className="bg-muted/20 relative aspect-4/3 overflow-hidden rounded-lg border">
            <ReviewImage
              key={item.originalUrl}
              src={item.originalUrl}
              alt={t("aiEnhanceBefore")}
              className="h-full w-full object-cover"
            />
          </div>
        </figure>

        <figure className="space-y-1.5">
          <figcaption className="text-primary flex items-center gap-1.5 text-xs font-medium">
            {isBackgroundRemoval ? <Eraser className="size-3" /> : <Sparkles className="size-3" />}
            {t("aiEnhanceAfter")}
          </figcaption>
          <div
            className={cn(
              "ring-primary/30 relative aspect-4/3 overflow-hidden rounded-lg border ring-1",
              background === "white" && "bg-white",
            )}
            style={background === "checkerboard" ? AI_PREVIEW_CHECKERBOARD_STYLE : undefined}
          >
            <ReviewImage
              key={item.enhancedUrl}
              src={item.enhancedUrl}
              alt={t("aiEnhanceAfter")}
              className="h-full w-full object-contain"
            />
          </div>
        </figure>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{t(resultHint)}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={background === "checkerboard" ? "secondary" : "ghost"}
            onClick={() => setBackground("checkerboard")}
          >
            {t("aiEnhanceBackgroundCheckerboard")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={background === "white" ? "secondary" : "ghost"}
            onClick={() => setBackground("white")}
          >
            {t("aiEnhanceBackgroundWhite")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ProductImageEnhanceDialogProps {
  open: boolean;
  items: ProductImageEnhanceReviewItem[];
  onAccept: (itemId: string) => void;
  onReject: (itemId: string) => void;
  onClose: () => void;
}

export function ProductImageEnhanceDialog({
  open,
  items,
  onAccept,
  onReject,
  onClose,
}: ProductImageEnhanceDialogProps) {
  const t = useTranslations("dashboard.products.form");

  const currentItem = items[0] ?? null;
  const isMultiItemReview = items.length > 1;
  const isBackgroundRemoval = currentItem?.operation === "remove-background";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPopup className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t(isBackgroundRemoval ? "removeBackgroundDialogTitle" : "aiEnhanceDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("aiEnhanceDialogDescription")}</DialogDescription>
          {/* Under the description rather than in the header's top-right, where
              it ran into the close button. */}
          {isMultiItemReview && (
            <span className="text-muted-foreground text-xs font-medium tabular-nums">
              {t("aiEnhanceRemaining", { count: items.length })}
            </span>
          )}
        </DialogHeader>

        <DialogPanel>
          {currentItem ? <ProductImageEnhanceComparison item={currentItem} /> : null}
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => currentItem && onReject(currentItem.id)}
            disabled={!currentItem}
            className="text-muted-foreground hover:text-foreground sm:mr-auto"
          >
            <Undo2 data-slot="icon" />
            {t("aiEnhanceReject")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => currentItem && onAccept(currentItem.id)}
            disabled={!currentItem}
          >
            <Check data-slot="icon" />
            {t("aiEnhanceAccept")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
