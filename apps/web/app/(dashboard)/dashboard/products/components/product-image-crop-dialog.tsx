"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ComponentType, ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleSlashIcon,
  CropIcon,
  EraserIcon,
  ImageIcon,
  RefreshCcwIcon,
  SparklesIcon,
  TriangleAlertIcon,
  Undo2Icon,
  WandSparklesIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PercentCrop, PixelCrop } from "react-image-crop";
import ReactCrop from "react-image-crop";

import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  Slider,
  Spinner,
} from "@louez/ui";
import { cn } from "@louez/utils";

import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";
import { IMAGE_UPLOAD_MIME_TYPES } from "@/lib/uploads/image-upload";

import type {
  ProductImageCropAiSession,
  ProductImageCropQueueItem,
} from "../hooks/use-product-form-media";
import type {
  ProductImageEnhanceControls,
  ProductImageEnhanceReviewItem,
  ProductImageOperation,
} from "../hooks/use-product-image-enhance";
import {
  PRODUCT_IMAGE_ASPECT_RATIO,
  type ProductImagePercentCropRect,
  type ProductImagePixelCropRect,
  getCropSizePercentFromRect,
  getPixelCropFromPercentRect,
  normalizePercentCropRect,
  scaleCropRectToPercent,
} from "../utils/product-image-crop";
import { ProductImageAiLearnMoreLink } from "./product-image-ai-learn-more";
import { ProductImageAiShimmer, ProductImageAiStepper } from "./product-image-ai-progress";
import {
  ProductImageCreditsAlert,
  ProductImageCreditsChip,
  ProductImageCreditsTooltip,
} from "./product-image-credits-hint";
import { ProductImageEnhanceComparison } from "./product-image-enhance-dialog";

const CROP_SIZE_STEP = 10;
const CROP_SIZE_MIN = 20;
const CROP_SIZE_MAX = 100;

// Strong ease-out: the view swap must feel answered, not played back.
const VIEW_EASE = [0.19, 1, 0.22, 1] as const;

type CropDialogStep = "choice" | "crop";
/** Which footer button is waiting on its own async work. */
type CropFooterAction = "apply" | "skip" | "enhance" | "enhance-all";
type CropDialogView =
  | CropDialogStep
  | "loading"
  | "processing"
  | "review"
  | "failed"
  | "cancelled"
  | "empty";

interface ProductImageCropDialogProps {
  open: boolean;
  items: ProductImageCropQueueItem[];
  selectedIndex: number;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  isUploading: boolean;
  isPreparing: boolean;
  /**
   * Freshly uploaded photos open on the intent step; reopening an image that is
   * already in the form (recrop) goes straight to the editor.
   */
  isFreshSession: boolean;
  imageEnhance: ProductImageEnhanceControls;
  /** Non-null while the dialog is watching an AI run it handed to the queue. */
  aiSession: ProductImageCropAiSession | null;
  reviewItems: ProductImageEnhanceReviewItem[];
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onCropChange: (itemId: string, crop: ProductImagePercentCropRect) => void;
  onCropComplete: (itemId: string, croppedAreaPixels: ProductImagePixelCropRect) => void;
  onCropSizeChange: (itemId: string, cropSizePercent: number) => void;
  onApplyCrop: () => void | Promise<void>;
  onSkipCrop: () => void | Promise<void>;
  /** Keeps the original and hands the uploaded object to the AI queue. */
  onStartAi: (operation: ProductImageOperation) => void | Promise<void>;
  onEnhanceAll: () => void | Promise<void>;
  onRetryAi: () => void;
  onResolveReviewItem: (itemId: string, decision: "accept" | "reject") => void;
  onReplaceCurrentImage: (file: File) => void | Promise<void>;
}

function toPercentCropRect(
  crop: PercentCrop,
  fallback: ProductImagePercentCropRect,
): ProductImagePercentCropRect {
  return normalizePercentCropRect(
    {
      unit: "%",
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    },
    fallback,
  );
}

function isSamePixelCrop(
  a: ProductImagePixelCropRect | null,
  b: ProductImagePixelCropRect | null,
): boolean {
  if (!a || !b) return a === b;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ProductImageCropDialog({
  open,
  items,
  selectedIndex,
  canGoToPrevious,
  canGoToNext,
  isUploading,
  isPreparing,
  isFreshSession,
  imageEnhance,
  aiSession,
  reviewItems,
  onClose,
  onSelectIndex,
  onPrevious,
  onNext,
  onCropChange,
  onCropComplete,
  onCropSizeChange,
  onApplyCrop,
  onSkipCrop,
  onStartAi,
  onEnhanceAll,
  onRetryAi,
  onResolveReviewItem,
  onReplaceCurrentImage,
}: ProductImageCropDialogProps) {
  const t = useTranslations("dashboard.products.form");
  const tCommon = useTranslations("common");
  const prefersReducedMotion = useReducedMotion();
  const currentItem = items[selectedIndex] ?? null;
  const isMultiImageSession = items.length > 1;

  const editorImageRef = useRef<HTMLImageElement | null>(null);
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
  const lastCommittedCropRef = useRef<ProductImagePixelCropRect | null>(null);

  // Which of the two editing steps each queue item sits on. UI-only state: an
  // AI run in flight is owned by the enhance queue, never by this component.
  const [stepByItemId, setStepByItemId] = useState<Record<string, CropDialogStep>>({});

  const [pendingAction, setPendingAction] = useState<CropFooterAction | null>(null);

  // Local crop state for smooth dragging — avoids parent re-renders per frame.
  // `null` means "use the parent's crop"; a value means "actively dragging".
  const [localDragCrop, setLocalDragCrop] = useState<PercentCrop | null>(null);
  const isDraggingRef = useRef(false);

  // The crop ReactCrop sees: local during drag, parent otherwise
  const displayCrop = localDragCrop ?? currentItem?.crop;

  // Reset local drag state when the current item changes (image switch, zoom)
  useEffect(() => {
    if (!isDraggingRef.current) setLocalDragCrop(null);
  }, [currentItem?.crop]);

  useEffect(() => {
    const initialPreviewCrop = currentItem?.croppedAreaPixels ?? null;
    lastCommittedCropRef.current = initialPreviewCrop;
  }, [currentItem?.id, currentItem?.croppedAreaPixels]);

  // A closed dialog must not keep stale steps for the next session.
  useEffect(() => {
    if (!open) setStepByItemId({});
  }, [open]);

  const defaultStep: CropDialogStep = isFreshSession ? "choice" : "crop";
  const currentStep = currentItem ? (stepByItemId[currentItem.id] ?? defaultStep) : defaultStep;

  const reviewItem = reviewItems[0] ?? null;
  // A ready result outranks the run's own status: the queue publishes each
  // photo as it lands, so the merchant decides on it while the rest processes,
  // and falls back to the progress view when none is waiting.
  const view: CropDialogView = isPreparing
    ? "loading"
    : aiSession
      ? reviewItem
        ? "review"
        : aiSession.status === "review"
          ? "processing"
          : aiSession.status
      : currentItem
        ? currentStep
        : "empty";

  const isEditorView = view === "crop";
  // Preparing only ever precedes the editor (reopening an existing photo), so
  // the loader wears the editor's shell: same width, same full-bleed canvas.
  // The dialog then fills in rather than resizing under the merchant.
  const isEditorShell = isEditorView || view === "loading";
  // An AI run owns the whole dialog: stepping between photos would fight it.
  const showThumbnailStrip = isMultiImageSession && !aiSession;

  // `isUploading` is raised by whichever action is running, so it cannot say
  // which button to spin. Awaiting the handler does: it also covers the paths
  // that return early (insufficient credits) without ever uploading.
  const runFooterAction = useCallback(
    async (action: CropFooterAction, run: () => void | Promise<void>) => {
      setPendingAction(action);
      try {
        await run();
      } finally {
        setPendingAction(null);
      }
    },
    [],
  );

  const goToStep = useCallback(
    (step: CropDialogStep) => {
      if (!currentItem) return;
      setStepByItemId((prev) => ({ ...prev, [currentItem.id]: step }));
    },
    [currentItem],
  );

  const commitPreviewCrop = useCallback(
    (cropPixels: ProductImagePixelCropRect) => {
      if (!currentItem) return;
      if (isSamePixelCrop(lastCommittedCropRef.current, cropPixels)) return;
      lastCommittedCropRef.current = cropPixels;
      onCropComplete(currentItem.id, cropPixels);
    },
    [currentItem, onCropComplete],
  );

  const getNaturalPixelCropFromRenderedCrop = useCallback(
    (renderedCrop: PixelCrop): ProductImagePixelCropRect | null => {
      if (!currentItem) return null;
      const image = editorImageRef.current;
      if (!image) return null;

      const rect = image.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const scaleX = currentItem.imageSize.width / rect.width;
      const scaleY = currentItem.imageSize.height / rect.height;
      const width = Math.max(1, Math.round(renderedCrop.width * scaleX));
      const height = Math.max(1, Math.round(renderedCrop.height * scaleY));
      const x = Math.round(renderedCrop.x * scaleX);
      const y = Math.round(renderedCrop.y * scaleY);

      return {
        x: clamp(x, 0, Math.max(0, currentItem.imageSize.width - width)),
        y: clamp(y, 0, Math.max(0, currentItem.imageSize.height - height)),
        width,
        height,
      };
    },
    [currentItem],
  );

  const handleZoomChange = useCallback(
    (nextPercent: number) => {
      if (!currentItem) return;
      const normalizedPercent = Math.round(
        Math.max(CROP_SIZE_MIN, Math.min(CROP_SIZE_MAX, nextPercent)),
      );
      const nextCrop = scaleCropRectToPercent({
        crop: currentItem.crop,
        imageSize: currentItem.imageSize,
        cropSizePercent: normalizedPercent,
        aspect: PRODUCT_IMAGE_ASPECT_RATIO,
      });
      const nextPixels = getPixelCropFromPercentRect(nextCrop, currentItem.imageSize);

      onCropChange(currentItem.id, nextCrop);
      onCropSizeChange(currentItem.id, normalizedPercent);
      commitPreviewCrop(nextPixels);
    },
    [commitPreviewCrop, currentItem, onCropChange, onCropSizeChange],
  );

  const handleZoomIn = useCallback(() => {
    if (!currentItem) return;
    handleZoomChange(currentItem.cropSizePercent - CROP_SIZE_STEP);
  }, [currentItem, handleZoomChange]);

  const handleZoomOut = useCallback(() => {
    if (!currentItem) return;
    handleZoomChange(currentItem.cropSizePercent + CROP_SIZE_STEP);
  }, [currentItem, handleZoomChange]);

  const handleReplaceImage = useCallback(() => {
    replaceImageInputRef.current?.click();
  }, []);

  const handleReplaceImageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void onReplaceCurrentImage(file);
      }
      event.target.value = "";
    },
    [onReplaceCurrentImage],
  );

  // During drag: only update local state — no parent re-renders, no preview work
  const handleCropChange = useCallback((_renderedCrop: PixelCrop, percentCrop: PercentCrop) => {
    isDraggingRef.current = true;
    setLocalDragCrop(percentCrop);
  }, []);

  // On drag end: flush everything to parent + commit preview
  const handleCropComplete = useCallback(
    (renderedCrop: PixelCrop, percentCrop: PercentCrop) => {
      if (!currentItem) return;
      isDraggingRef.current = false;
      setLocalDragCrop(null);

      const nextCrop = toPercentCropRect(percentCrop, currentItem.crop);
      const nextPixels =
        getNaturalPixelCropFromRenderedCrop(renderedCrop) ??
        getPixelCropFromPercentRect(nextCrop, currentItem.imageSize);

      onCropChange(currentItem.id, nextCrop);
      onCropSizeChange(currentItem.id, getCropSizePercentFromRect(nextCrop, currentItem.imageSize));
      commitPreviewCrop(nextPixels);
    },
    [
      commitPreviewCrop,
      currentItem,
      getNaturalPixelCropFromRenderedCrop,
      onCropChange,
      onCropSizeChange,
    ],
  );

  const { credits } = imageEnhance;
  // Every fresh photo of the session can be sent in one go — only worth
  // offering while nothing has been decided yet.
  const canEnhanceWholeQueue =
    isFreshSession && isMultiImageSession && items.every((item) => item.resultMode === "original");

  const headerCopy = getHeaderCopy(view, aiSession?.operation ?? "enhance");

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPopup
        className={cn(
          // The editor bleeds to the popup's edges — the corners have to clip.
          "overflow-hidden",
          // Only the editor needs the full canvas; the other views read better
          // narrow. Eased so the resize looks intentional, not like a reflow.
          // scale/opacity/translate ride along because the popup already
          // transitions them for the nested-dialog step-back — listing
          // max-width alone would replace that transition, not extend it.
          "transition-[max-width,scale,opacity,translate] duration-200 ease-[cubic-bezier(0.645,0.045,0.355,1)]",
          isEditorShell || view === "review" ? "max-w-5xl" : "max-w-4xl",
        )}
      >
        <DialogHeader>
          <div className="min-w-0 space-y-2">
            <DialogTitle>{t(headerCopy.titleKey)}</DialogTitle>
            <DialogDescription>{t(headerCopy.descriptionKey)}</DialogDescription>
            {/* Under the description rather than in the header's top-right,
                where it ran into the close button. */}
            {aiSession && reviewItems.length > 1 && (
              <span className="text-muted-foreground block text-xs font-medium tabular-nums">
                {t("aiEnhanceRemaining", { count: reviewItems.length })}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Compact thumbnail strip. The stepper rides along here rather than in
            the header, where it ran into the close button — and it belongs next
            to the thumbnails it steps through anyway. */}
        {showThumbnailStrip && (
          <div className="bg-muted/40 flex items-center gap-4 border-y px-6 py-2.5">
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {items.map((item, index) => {
                const isActive = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectIndex(index)}
                    className={`relative size-11 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:size-12 ${
                      isActive
                        ? "border-primary ring-primary/20 scale-[1.04] ring-2"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.originalDataUrl}
                      alt={t("cropThumbnailAlt", { index: index + 1 })}
                      className="size-full object-cover"
                    />
                    {item.resultMode === "cropped" && (
                      <div className="bg-primary absolute right-0.5 bottom-0.5 size-2 rounded-full shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onPrevious}
                disabled={!canGoToPrevious || isUploading}
                aria-label={t("cropPrevious")}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="text-muted-foreground text-xs font-medium whitespace-nowrap tabular-nums">
                {t("cropCounter", {
                  current: selectedIndex + 1,
                  total: items.length,
                })}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onNext}
                disabled={!canGoToNext || isUploading}
                aria-label={t("cropNext")}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Main content area — one entrance per view, no child trickle.
            The `!` beats the panel's own padding variants, which win on
            specificity: `p-0` so the editor's canvas bleeds to the edges, and
            more headroom under the thumbnail strip than the default `pt-1`. */}
        <DialogPanel
          className={cn(
            "flex flex-col",
            isEditorShell && "p-0!",
            showThumbnailStrip && !isEditorShell && "pt-5!",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
              transition={{ duration: 0.22, ease: VIEW_EASE }}
            >
              {view === "empty" && (
                <div className="text-muted-foreground flex min-h-40 flex-1 items-center justify-center gap-2">
                  <ImageIcon className="size-5" />
                  <span>{t("cropNoImage")}</span>
                </div>
              )}

              {/* The editor's canvas, still empty: the photo drops into a frame
                  that is already there instead of arriving with the frame. */}
              {view === "loading" && (
                <div className="flex min-h-[40vh] flex-1 items-center justify-center bg-zinc-950 lg:min-h-[55vh]">
                  <Spinner className="size-6 text-white/70" />
                </div>
              )}

              {view === "choice" && currentItem && (
                <ChoiceStepBody
                  item={currentItem}
                  index={selectedIndex}
                  imageEnhance={imageEnhance}
                  isBusy={isUploading || imageEnhance.isRunning}
                  onStartAi={onStartAi}
                  onCrop={() => goToStep("crop")}
                />
              )}

              {view === "crop" && currentItem && (
                <div className="flex min-h-0 flex-1 shrink-0 flex-col lg:flex-row">
                  <div className="h-fit shrink-0 flex-col md:flex-1">
                    {/* Crop area — full dark, overflow-hidden clips the 9999px
                        box-shadow overlay */}
                    <div className="flex min-h-[40vh] flex-1 items-center justify-center overflow-hidden bg-zinc-950 p-3 sm:p-4 lg:min-h-0">
                      <ReactCrop
                        crop={displayCrop}
                        keepSelection
                        aspect={PRODUCT_IMAGE_ASPECT_RATIO}
                        minWidth={48}
                        minHeight={36}
                        className="product-image-crop max-h-[55vh] max-w-full lg:max-h-[62vh]"
                        onChange={handleCropChange}
                        onComplete={handleCropComplete}
                        ruleOfThirds
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          ref={editorImageRef}
                          src={currentItem.originalDataUrl}
                          alt={t("cropThumbnailAlt", {
                            index: selectedIndex + 1,
                          })}
                          className="max-h-[55vh] max-w-full select-none lg:max-h-[62vh]"
                          draggable={false}
                        />
                      </ReactCrop>
                    </div>

                    {/* Compact toolbar */}
                    <div className="flex items-center gap-2 border-t px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleZoomOut}
                        disabled={currentItem.cropSizePercent >= CROP_SIZE_MAX || isUploading}
                        aria-label={t("cropZoom")}
                      >
                        <ZoomOutIcon className="size-3.5" />
                      </Button>

                      <div className="flex-1">
                        <Slider
                          value={currentItem.cropSizePercent}
                          min={CROP_SIZE_MIN}
                          max={CROP_SIZE_MAX}
                          step={1}
                          onValueChange={(value) => {
                            const next = Array.isArray(value) ? value[0] : value;
                            if (typeof next === "number") handleZoomChange(next);
                          }}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleZoomIn}
                        disabled={currentItem.cropSizePercent <= CROP_SIZE_MIN || isUploading}
                        aria-label={t("cropZoom")}
                      >
                        <ZoomInIcon className="size-3.5" />
                      </Button>

                      <span className="text-muted-foreground hidden text-xs font-medium tabular-nums sm:inline">
                        {currentItem.cropSizePercent}%
                      </span>

                      <div className="bg-border mx-0.5 hidden h-5 w-px sm:block" />

                      <input
                        ref={replaceImageInputRef}
                        type="file"
                        accept={IMAGE_UPLOAD_MIME_TYPES.join(",")}
                        className="sr-only"
                        onChange={handleReplaceImageChange}
                        disabled={isUploading}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReplaceImage}
                        disabled={isUploading}
                        className="text-muted-foreground hover:text-foreground gap-1.5"
                      >
                        <RefreshCcwIcon className="size-3.5" />
                        <span className="hidden sm:inline">{tCommon("edit")}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {view === "processing" && aiSession && (
                <ProcessingBody imageEnhance={imageEnhance} session={aiSession} />
              )}

              {view === "review" && reviewItem && (
                <ProductImageEnhanceComparison item={reviewItem} />
              )}

              {(view === "failed" || view === "cancelled") && aiSession && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                      {view === "cancelled" ? (
                        <CircleSlashIcon className="size-4" />
                      ) : (
                        <TriangleAlertIcon className="size-4" />
                      )}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {t(view === "cancelled" ? "aiCancelledTitle" : "aiProcessingFailedTitle")}
                      </p>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {t(
                          view === "cancelled"
                            ? "aiCancelledDescription"
                            : "aiProcessingFailedDescription",
                        )}
                      </p>
                    </div>
                  </div>
                  {/* A cancellation never bills, so no balance alert belongs here. */}
                  {view === "failed" && <ProductImageCreditsAlert credits={credits} />}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </DialogPanel>

        {view !== "empty" && (
          <DialogFooter>
            {/* Nothing to act on yet, but the bar must not sit there empty —
                and closing genuinely works: it aborts the fetch. */}
            {view === "loading" && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground sm:mr-auto"
              >
                {tCommon("cancel")}
              </Button>
            )}

            {view === "choice" && (
              <>
                {/* The real choices are the cards above; the footer only carries
                  the batch shortcut and the two ways out. */}
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isUploading}
                  className="text-muted-foreground hover:text-foreground sm:mr-auto"
                >
                  {tCommon("cancel")}
                </Button>
                {canEnhanceWholeQueue && imageEnhance.enabled && (
                  <Button
                    variant="outline"
                    onClick={() => void runFooterAction("enhance-all", onEnhanceAll)}
                    isPending={pendingAction === "enhance-all"}
                    disabled={isUploading || imageEnhance.isRunning}
                  >
                    <SparklesIcon data-slot="icon" />
                    {t("aiChoiceBatchEnhance", { count: items.length })}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => void runFooterAction("skip", onSkipCrop)}
                  isPending={pendingAction === "skip"}
                  disabled={isUploading}
                >
                  {t("aiChoiceUseAsIs")}
                </Button>
              </>
            )}

            {view === "crop" && (
              <>
                {/* One auto margin only: a second one would split the free
                  space and strand the group in the middle of the bar. */}
                {isFreshSession ? (
                  <Button
                    variant="ghost"
                    onClick={() => goToStep("choice")}
                    disabled={isUploading}
                    className="text-muted-foreground hover:text-foreground sm:mr-auto"
                  >
                    <ArrowLeftIcon className="size-4" />
                    {t("cropBackToChoice")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={isUploading}
                    className="text-muted-foreground hover:text-foreground sm:mr-auto"
                  >
                    {tCommon("cancel")}
                  </Button>
                )}
                {/* Ghost, and before the AI button: skipping is the fallback,
                    it should not compete with the two paths worth taking. */}
                {isFreshSession && (
                  <Button
                    variant="ghost"
                    onClick={() => void runFooterAction("skip", onSkipCrop)}
                    isPending={pendingAction === "skip"}
                    disabled={isUploading}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("aiChoiceUseAsIs")}
                  </Button>
                )}
                {/* The cost hangs off the button rather than standing next to
                    it: one less thing to read in an already busy toolbar. */}
                <ProductImageCreditsTooltip operation="enhance" credits={credits}>
                  <Button
                    variant="outline"
                    onClick={() => void runFooterAction("enhance", () => onStartAi("enhance"))}
                    isPending={pendingAction === "enhance"}
                    disabled={isUploading || imageEnhance.isRunning}
                  >
                    <WandSparklesIcon data-slot="icon" className="size-4" />
                    {t("aiEnhanceCropAction")}
                  </Button>
                </ProductImageCreditsTooltip>
                <Button
                  variant="outline"
                  onClick={() => void runFooterAction("apply", onApplyCrop)}
                  isPending={pendingAction === "apply"}
                  pendingContent={t("uploading")}
                  disabled={isUploading}
                >
                  {t("cropApply")}
                </Button>
              </>
            )}

            {view === "processing" && (
              <>
                {/* Cancelling is the way out, so it takes the leading slot;
                    continuing in the background is the encouraged path. */}
                <Button
                  variant="ghost"
                  onClick={imageEnhance.cancelRun}
                  isPending={imageEnhance.isCancelling}
                  className="text-muted-foreground hover:text-foreground sm:mr-auto"
                >
                  {tCommon("cancel")}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  {t("aiProcessingContinueBackground")}
                </Button>
              </>
            )}

            {view === "review" && reviewItem && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => onResolveReviewItem(reviewItem.id, "reject")}
                  className="text-muted-foreground hover:text-foreground sm:mr-auto"
                >
                  <Undo2Icon data-slot="icon" />
                  {t("aiEnhanceReject")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onResolveReviewItem(reviewItem.id, "accept")}
                >
                  <CheckIcon data-slot="icon" />
                  {t("aiEnhanceAccept")}
                </Button>
              </>
            )}

            {(view === "failed" || view === "cancelled") && (
              <>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground sm:mr-auto"
                >
                  {t("aiProcessingClose")}
                </Button>
                <Button variant="outline" onClick={onRetryAi} isPending={imageEnhance.isRunning}>
                  <RefreshCcwIcon data-slot="icon" />
                  {t("aiProcessingRetry")}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}

function getHeaderCopy(
  view: CropDialogView,
  operation: ProductImageOperation,
): { titleKey: string; descriptionKey: string } {
  const isBackgroundRemoval = operation === "remove-background";

  switch (view) {
    case "choice":
      return { titleKey: "aiChoiceTitle", descriptionKey: "aiChoiceDescription" };
    case "processing":
      return {
        titleKey: isBackgroundRemoval ? "aiProcessingTitleBackground" : "aiProcessingTitle",
        descriptionKey: "aiProcessingDescription",
      };
    case "review":
      return {
        titleKey: isBackgroundRemoval ? "removeBackgroundDialogTitle" : "aiEnhanceDialogTitle",
        descriptionKey: "aiEnhanceDialogDescription",
      };
    case "failed":
      return {
        titleKey: "aiProcessingFailedTitle",
        descriptionKey: "aiProcessingFailedDescription",
      };
    case "cancelled":
      return {
        titleKey: "aiCancelledTitle",
        descriptionKey: "aiCancelledDescription",
      };
    default:
      return { titleKey: "cropDialogTitle", descriptionKey: "cropDialogDescription" };
  }
}

interface ChoiceStepBodyProps {
  item: ProductImageCropQueueItem;
  index: number;
  imageEnhance: ProductImageEnhanceControls;
  isBusy: boolean;
  onStartAi: (operation: ProductImageOperation) => void;
  onCrop: () => void;
}

function ChoiceStepBody({
  item,
  index,
  imageEnhance,
  isBusy,
  onStartAi,
  onCrop,
}: ChoiceStepBodyProps) {
  const t = useTranslations("dashboard.products.form");
  const { credits } = imageEnhance;

  return (
    <div className="space-y-4">
      {/* Side by side once there is room: the preview is what the choice is
          about, so it stays visible while the options are read. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-6">
        {/* `self-start` keeps the 4:3 box intact: only the options column ever
            stretches to match, never the preview. */}
        <div className="bg-muted/30 relative aspect-4/3 max-h-[38vh] w-full overflow-hidden rounded-xl border lg:max-h-[46vh] lg:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.originalDataUrl}
            alt={t("cropThumbnailAlt", { index: index + 1 })}
            className="h-full w-full object-contain"
          />
        </div>

        {/* `auto-rows-fr` + full height: the cards split the preview's height
            evenly, so they all match and the column ends flush with the image. */}
        <div className="grid auto-rows-fr gap-2 lg:h-full">
          <IntentOption
            tone="ai"
            icon={SparklesIcon}
            title={t("aiEnhanceAction")}
            description={t("aiChoiceEnhanceDescription")}
            onClick={() => onStartAi("enhance")}
            disabled={isBusy}
            chip={<ProductImageCreditsChip operation="enhance" credits={credits} />}
            learnMore={
              <ProductImageAiLearnMoreLink
                operation="enhance"
                onPrimaryAction={() => onStartAi("enhance")}
              />
            }
          />

          {imageEnhance.backgroundRemovalEnabled && (
            <IntentOption
              tone="background"
              icon={EraserIcon}
              title={t("removeBackgroundAction")}
              description={t("aiChoiceRemoveBackgroundDescription")}
              onClick={() => onStartAi("remove-background")}
              disabled={isBusy}
              chip={<ProductImageCreditsChip operation="remove-background" credits={credits} />}
              learnMore={
                <ProductImageAiLearnMoreLink
                  operation="remove-background"
                  onPrimaryAction={() => onStartAi("remove-background")}
                />
              }
            />
          )}

          <IntentOption
            icon={CropIcon}
            title={t("aiChoiceCrop")}
            description={t("aiChoiceCropDescription")}
            onClick={onCrop}
            disabled={isBusy}
          />
        </div>
      </div>

      {/* No pricing recap here: the chips on the cards already carry the cost,
          and the balance only matters when it blocks — hence the alert below. */}
      <ProductImageCreditsAlert credits={credits} />
    </div>
  );
}

/**
 * The badge palette, borrowed: the icons then read as the same family as the
 * credit chips sitting on the very same cards.
 */
const INTENT_TONES = {
  ai: "bg-badge-submitted-background text-badge-submitted-foreground",
  background: "bg-badge-progress-background text-badge-progress-foreground",
  neutral: "bg-badge-gray-background text-badge-gray-foreground",
} as const;

interface IntentOptionProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: keyof typeof INTENT_TONES;
  /** Rendered as a sibling of the button: a tooltip trigger must not nest. */
  chip?: ReactNode;
  /** Same rule as the chip — an interactive element inside a button is invalid. */
  learnMore?: ReactNode;
}

function IntentOption({
  icon,
  title,
  description,
  onClick,
  disabled,
  tone = "neutral",
  chip,
  learnMore,
}: IntentOptionProps) {
  return (
    <div
      className={cn(
        // The floor keeps the chip and the help button from crowding the
        // wrapped description on narrow screens, where nothing stretches the
        // card. Past `lg` the column already matches the preview's height.
        "relative flex h-full min-h-24 w-full items-center gap-3 rounded-xl border p-3.5 text-left lg:min-h-0",
        "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.19,1,0.22,1)]",
        "border-border hover:border-muted-foreground/40 hover:bg-accent/40",
        // Press feedback is felt, not seen. Direct child only: pressing the
        // help button must not squeeze the whole card.
        "has-[>button:active]:scale-[0.995]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {/* The card's click target, stretched behind the content. The chip and
          the help button can then sit in normal flow: nesting them inside this
          button would be invalid markup and would fire the card on their click. */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        className="focus-visible:ring-ring absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2"
      />

      <DashboardIconTile icon={icon} className={INTENT_TONES[tone]} />

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
          {description}
        </span>
      </span>

      {/* Positioned, so they paint above the stretched target and keep their
          own clicks — no z-index needed. */}
      {learnMore ? <span className="relative shrink-0">{learnMore}</span> : null}
      {chip ? <span className="absolute top-2 right-2">{chip}</span> : null}
    </div>
  );
}

function ProcessingBody({
  imageEnhance,
  session,
}: {
  imageEnhance: ProductImageEnhanceControls;
  session: ProductImageCropAiSession;
}) {
  const t = useTranslations("dashboard.products.form");
  const { batchProgress } = imageEnhance;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-stretch sm:gap-6">
      <div className="bg-muted/30 relative aspect-4/3 max-h-[32vh] w-full overflow-hidden rounded-xl border">
        {/* Slightly scaled so the blur never reveals hard edges. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={session.previewUrl}
          alt=""
          className="h-full w-full scale-105 object-cover blur-[3px]"
        />
        <ProductImageAiShimmer />
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="text-primary size-6" />
        </div>
      </div>

      {/* Centred rather than top-aligned: the steps are shorter than the
          preview, and a gap split evenly reads as intentional. */}
      <div className="flex flex-col justify-center gap-5">
        {batchProgress && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tabular-nums">
              {t("aiEnhanceBatchProgress", {
                current: batchProgress.current,
                total: batchProgress.total,
              })}
            </p>
            {/* One segment per photo: "where am I in the batch" at a glance,
                which the counter alone only spells out. */}
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: batchProgress.total }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-300",
                    index < batchProgress.current - 1 && "bg-primary",
                    index === batchProgress.current - 1 &&
                      "bg-primary/40 motion-safe:animate-pulse",
                    index > batchProgress.current - 1 && "bg-muted-foreground/20",
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <ProductImageAiStepper operation={session.operation} active />
      </div>
    </div>
  );
}
