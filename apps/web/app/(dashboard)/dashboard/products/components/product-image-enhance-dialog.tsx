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
const CHECKERBOARD_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, rgba(120,120,120,0.16) 25%, transparent 25%, transparent 75%, rgba(120,120,120,0.16) 75%), linear-gradient(45deg, rgba(120,120,120,0.16) 25%, transparent 25%, transparent 75%, rgba(120,120,120,0.16) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
};

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
  const [background, setBackground] = useState<EnhancePreviewBackground>("checkerboard");

  const currentItem = items[0] ?? null;
  const isMultiItemReview = items.length > 1;
  const isBackgroundRemoval = currentItem?.operation === "remove-background";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPopup className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {isBackgroundRemoval ? (
                  <Eraser className="text-primary size-4 shrink-0" />
                ) : (
                  <Sparkles className="text-primary size-4 shrink-0" />
                )}
                {t(isBackgroundRemoval ? "removeBackgroundDialogTitle" : "aiEnhanceDialogTitle")}
              </DialogTitle>
              <DialogDescription>{t("aiEnhanceDialogDescription")}</DialogDescription>
            </div>
            {isMultiItemReview && (
              <span className="text-muted-foreground shrink-0 text-xs font-medium whitespace-nowrap tabular-nums">
                {t("aiEnhanceRemaining", { count: items.length })}
              </span>
            )}
          </div>
        </DialogHeader>

        <DialogPanel>
          {currentItem ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <figure className="space-y-1.5">
                  <figcaption className="text-muted-foreground text-xs font-medium">
                    {t("aiEnhanceBefore")}
                  </figcaption>
                  <div className="bg-muted/20 relative aspect-4/3 overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentItem.originalUrl}
                      alt={t("aiEnhanceBefore")}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </figure>

                <figure className="space-y-1.5">
                  <figcaption className="text-primary flex items-center gap-1.5 text-xs font-medium">
                    {isBackgroundRemoval ? (
                      <Eraser className="size-3" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {t("aiEnhanceAfter")}
                  </figcaption>
                  <div
                    className={cn(
                      "ring-primary/30 relative aspect-4/3 overflow-hidden rounded-lg border ring-1",
                      background === "white" && "bg-white",
                    )}
                    style={background === "checkerboard" ? CHECKERBOARD_STYLE : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentItem.enhancedUrl}
                      alt={t("aiEnhanceAfter")}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </figure>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">{t("aiEnhanceTransparencyHint")}</p>
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
          ) : null}
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => currentItem && onReject(currentItem.id)}
            disabled={!currentItem}
          >
            <Undo2 data-slot="icon" />
            {t("aiEnhanceReject")}
          </Button>
          <Button
            type="button"
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
