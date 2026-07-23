"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  Loader2,
  RefreshCcwIcon,
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
  DialogPopup,
  DialogTitle,
  Slider,
} from "@louez/ui";

import { IMAGE_UPLOAD_MIME_TYPES } from "@/lib/uploads/image-upload";

import type { ProductImageCropQueueItem } from "../hooks/use-product-form-media";
import {
  PRODUCT_IMAGE_ASPECT_RATIO,
  type ProductImagePercentCropRect,
  type ProductImagePixelCropRect,
  getCropSizePercentFromRect,
  getPixelCropFromPercentRect,
  normalizePercentCropRect,
  scaleCropRectToPercent,
} from "../utils/product-image-crop";

const CROP_SIZE_STEP = 10;
const CROP_SIZE_MIN = 20;
const CROP_SIZE_MAX = 100;

interface ProductImageCropDialogProps {
  open: boolean;
  items: ProductImageCropQueueItem[];
  selectedIndex: number;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  isUploading: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onCropChange: (itemId: string, crop: ProductImagePercentCropRect) => void;
  onCropComplete: (itemId: string, croppedAreaPixels: ProductImagePixelCropRect) => void;
  onCropSizeChange: (itemId: string, cropSizePercent: number) => void;
  onApplyCrop: () => void | Promise<void>;
  onSkipCrop: () => void | Promise<void>;
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
  onClose,
  onSelectIndex,
  onPrevious,
  onNext,
  onCropChange,
  onCropComplete,
  onCropSizeChange,
  onApplyCrop,
  onSkipCrop,
  onReplaceCurrentImage,
}: ProductImageCropDialogProps) {
  const t = useTranslations("dashboard.products.form");
  const tCommon = useTranslations("common");
  const currentItem = items[selectedIndex] ?? null;
  const isMultiImageSession = items.length > 1;

  const editorImageRef = useRef<HTMLImageElement | null>(null);
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
  const lastCommittedCropRef = useRef<ProductImagePixelCropRect | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPopup
        className="flex max-h-[95dvh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0"
        bottomStickOnMobile={false}
      >
        {/* Header with integrated navigation */}
        <DialogHeader className="border-b px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{t("cropDialogTitle")}</DialogTitle>
              <DialogDescription>{t("cropDialogDescription")}</DialogDescription>
            </div>
            {isMultiImageSession && (
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
            )}
          </div>
        </DialogHeader>

        {/* Compact thumbnail strip */}
        {isMultiImageSession && (
          <div className="bg-muted/40 border-b px-5 py-2.5 sm:px-6">
            <div className="flex gap-1.5 overflow-x-auto">
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
          </div>
        )}

        {/* Main content area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {currentItem ? (
            <div className="flex min-h-0 flex-1 shrink-0 flex-col lg:flex-row">
              {/* Editor column */}
              <div className="h-fit shrink-0 flex-col md:flex-1">
                {/* Crop area — full dark, overflow-hidden clips the 9999px box-shadow overlay */}
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
          ) : (
            <div className="text-muted-foreground flex min-h-40 flex-1 items-center justify-center gap-2">
              <ImageIcon className="size-5" />
              <span>{t("cropNoImage")}</span>
            </div>
          )}
        </div>

        {/* Sticky footer — always visible */}
        <DialogFooter className="px-2">
          <Button variant="outline" onClick={onSkipCrop} disabled={isUploading}>
            {t("cropSkip")}
          </Button>
          <Button variant="default" onClick={onApplyCrop} disabled={isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? t("uploading") : t("cropApply")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
