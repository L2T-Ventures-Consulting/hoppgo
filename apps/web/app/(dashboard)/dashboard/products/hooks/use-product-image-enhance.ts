import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { toastManager } from "@louez/ui";

import { useImageUpload } from "@/hooks/use-image-upload";
import { getImageKeyFromUrl } from "@/lib/uploads/image-upload";

const ENHANCE_ENDPOINT = "/api/ai/product-image/enhance";

export type ProductImageOperation = "enhance" | "remove-background";
export type ProductImageEnhanceStatus = "idle" | "enhancing" | "awaiting-review";

export interface ProductImageEnhanceReviewItem {
  id: string;
  operation: ProductImageOperation;
  originalUrl: string;
  enhancedKey: string;
  enhancedUrl: string;
  creditsCharged: number;
}

export interface ProductImageEnhanceBatchProgress {
  current: number;
  total: number;
}

export interface ProductImageEnhanceControls {
  /**
   * Server-resolved availability. The controls stay visible when false: they
   * then open the promo dialog instead of running the enhancement.
   */
  enabled: boolean;
  backgroundRemovalEnabled: boolean;
  statusByImage: Record<string, ProductImageEnhanceStatus>;
  isRunning: boolean;
  batchProgress: ProductImageEnhanceBatchProgress | null;
  enhanceImage: (imageUrl: string) => void;
  removeBackground: (imageUrl: string) => void;
  enhanceAllImages: () => void;
}

interface UseProductImageEnhanceParams {
  enabled: boolean;
  backgroundRemovalEnabled: boolean;
  imagesPreviews: string[];
  /**
   * Swaps an accepted enhanced object into form state. Returns `false` when the
   * original image is no longer part of the form (the caller then drops the
   * enhanced object instead of leaking it).
   */
  replaceImage: (originalUrl: string, enhancedUrl: string) => boolean;
}

interface ProductImageEnhanceResponse {
  key: string;
  url: string;
  creditsCharged: number;
}

const ENHANCE_ERROR_CODES = [
  "credits_exhausted",
  "ai_image_disabled",
  "background_removal_disabled",
  "invalid_image",
  "empty_image",
  "provider_error",
  "background_removal_error",
] as const;

type ProductImageEnhanceErrorCode = (typeof ENHANCE_ERROR_CODES)[number] | "unknown";

// Codes that make the rest of a batch pointless: stop the queue right away.
const FATAL_ENHANCE_ERROR_CODES: ProductImageEnhanceErrorCode[] = [
  "credits_exhausted",
  "ai_image_disabled",
  "background_removal_disabled",
];

class ProductImageEnhanceError extends Error {
  constructor(readonly code: ProductImageEnhanceErrorCode) {
    super(code);
    this.name = "ProductImageEnhanceError";
  }
}

function toEnhanceErrorCode(code: unknown): ProductImageEnhanceErrorCode {
  return ENHANCE_ERROR_CODES.find((known) => known === code) ?? "unknown";
}

function createReviewItemId(imageKey: string) {
  return `product-image-enhance-${Date.now()}-${imageKey}-${Math.random().toString(36).slice(2, 8)}`;
}

async function requestProcessedImage(
  imageKey: string,
  operation: ProductImageOperation,
): Promise<ProductImageEnhanceResponse> {
  const response = await fetch(ENHANCE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageKey, operation }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new ProductImageEnhanceError(toEnhanceErrorCode(payload?.code));
  }

  return (await response.json()) as ProductImageEnhanceResponse;
}

export function useProductImageEnhance({
  enabled,
  backgroundRemovalEnabled,
  imagesPreviews,
  replaceImage,
}: UseProductImageEnhanceParams) {
  const t = useTranslations("dashboard.products.form");
  const { deleteImage } = useImageUpload("product");

  const [statusByImage, setStatusByImage] = useState<Record<string, ProductImageEnhanceStatus>>({});
  const [reviewItems, setReviewItems] = useState<ProductImageEnhanceReviewItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<ProductImageEnhanceBatchProgress | null>(null);
  // Teaser: when the feature is unavailable the controls still render and this
  // informational dialog explains what activating the AI would unlock.
  const [isEnhancePromoOpen, setIsEnhancePromoOpen] = useState(false);

  // Enhanced objects that exist on the storage but are not (yet) referenced by
  // the form: exactly like `pendingUploadsRef` in use-product-form-media, they
  // must be deleted on reject and on unmount so no orphan is left behind.
  const pendingEnhancedUrlsRef = useRef(new Set<string>());
  const isRunningRef = useRef(false);
  const isMountedRef = useRef(true);
  const deleteImageRef = useRef(deleteImage);
  const replaceImageRef = useRef(replaceImage);

  useEffect(() => {
    deleteImageRef.current = deleteImage;
  }, [deleteImage]);

  useEffect(() => {
    replaceImageRef.current = replaceImage;
  }, [replaceImage]);

  useEffect(() => {
    // React Strict Mode runs an extra setup → cleanup → setup cycle in
    // development. Restore the mounted flag on every setup so a response that
    // arrives after that verification cycle is not mistaken for a late result.
    isMountedRef.current = true;

    return () => {
      // The flag makes an in-flight request delete its own late result — the
      // set below can only cover objects that already existed at unmount.
      isMountedRef.current = false;
      void Promise.allSettled(
        [...pendingEnhancedUrlsRef.current].map((url) => deleteImageRef.current(url)),
      );
    };
  }, []);

  const setImageStatus = useCallback((imageUrl: string, status: ProductImageEnhanceStatus) => {
    setStatusByImage((prev) => {
      if (status === "idle") {
        if (!(imageUrl in prev)) return prev;
        const { [imageUrl]: _removed, ...rest } = prev;
        return rest;
      }

      if (prev[imageUrl] === status) return prev;
      return { ...prev, [imageUrl]: status };
    });
  }, []);

  const getEnhanceErrorMessage = useCallback(
    (code: ProductImageEnhanceErrorCode) => {
      switch (code) {
        case "credits_exhausted":
          return t("aiEnhanceErrorCredits");
        case "ai_image_disabled":
          return t("aiEnhanceErrorDisabled");
        case "background_removal_disabled":
          return t("removeBackgroundErrorDisabled");
        case "invalid_image":
          return t("aiEnhanceErrorInvalidImage");
        case "empty_image":
          return t("aiEnhanceErrorEmptyImage");
        case "provider_error":
          return t("aiEnhanceErrorProvider");
        case "background_removal_error":
          return t("removeBackgroundErrorProvider");
        default:
          return t("aiEnhanceError");
      }
    },
    [t],
  );

  const runImageQueue = useCallback(
    async (imageUrls: string[], operation: ProductImageOperation) => {
      if (isRunningRef.current) return;

      const targets = imageUrls.filter(Boolean);
      if (targets.length === 0) return;

      isRunningRef.current = true;
      setIsRunning(true);
      const collected: ProductImageEnhanceReviewItem[] = [];

      try {
        for (let index = 0; index < targets.length; index += 1) {
          const imageUrl = targets[index];
          if (targets.length > 1) {
            setBatchProgress({ current: index + 1, total: targets.length });
          }

          const imageKey = getImageKeyFromUrl(imageUrl);
          if (!imageKey) {
            toastManager.add({ title: t("aiEnhanceError"), type: "error" });
            continue;
          }

          setImageStatus(imageUrl, "enhancing");

          try {
            const enhanced = await requestProcessedImage(imageKey, operation);
            if (!isMountedRef.current) {
              void deleteImageRef.current(enhanced.url).catch(() => undefined);
              break;
            }
            pendingEnhancedUrlsRef.current.add(enhanced.url);
            collected.push({
              id: createReviewItemId(imageKey),
              operation,
              originalUrl: imageUrl,
              enhancedKey: enhanced.key,
              enhancedUrl: enhanced.url,
              creditsCharged: enhanced.creditsCharged,
            });
            setImageStatus(imageUrl, "awaiting-review");
          } catch (error) {
            setImageStatus(imageUrl, "idle");
            const code =
              error instanceof ProductImageEnhanceError ? error.code : ("unknown" as const);
            if (code === "unknown") {
              console.error("Product image enhance error:", error);
            }
            toastManager.add({
              title: getEnhanceErrorMessage(code),
              type: "error",
            });

            if (FATAL_ENHANCE_ERROR_CODES.includes(code)) break;
          }
        }
      } finally {
        isRunningRef.current = false;
        setIsRunning(false);
        setBatchProgress(null);
        if (collected.length > 0) {
          setReviewItems((prev) => [...prev, ...collected]);
        }
      }
    },
    [getEnhanceErrorMessage, setImageStatus, t],
  );

  const openEnhancePromo = useCallback(() => {
    setIsEnhancePromoOpen(true);
  }, []);

  const closeEnhancePromo = useCallback(() => {
    setIsEnhancePromoOpen(false);
  }, []);

  const enhanceImage = useCallback(
    (imageUrl: string) => {
      if (!enabled) {
        openEnhancePromo();
        return;
      }
      void runImageQueue([imageUrl], "enhance");
    },
    [enabled, openEnhancePromo, runImageQueue],
  );

  const removeBackground = useCallback(
    (imageUrl: string) => {
      if (!backgroundRemovalEnabled) {
        toastManager.add({
          title: t("removeBackgroundErrorDisabled"),
          type: "error",
        });
        return;
      }
      void runImageQueue([imageUrl], "remove-background");
    },
    [backgroundRemovalEnabled, runImageQueue, t],
  );

  // Batch entry point for callers that already hold a list of uploaded URLs
  // (e.g. images flagged for enhancement from the crop dialog).
  const enhanceImages = useCallback(
    (imageUrls: string[]) => {
      if (!enabled) return;
      void runImageQueue(imageUrls, "enhance");
    },
    [enabled, runImageQueue],
  );

  // Objects the route minted are already isolated and centered — re-running
  // them through the provider would only re-bill for an identical result.
  const enhanceAllImages = useCallback(() => {
    if (!enabled) {
      openEnhancePromo();
      return;
    }
    void runImageQueue(
      imagesPreviews.filter((url) => !getImageKeyFromUrl(url)?.endsWith("-ai.webp")),
      "enhance",
    );
  }, [enabled, imagesPreviews, openEnhancePromo, runImageQueue]);

  const dismissReviewItem = useCallback(
    (item: ProductImageEnhanceReviewItem) => {
      setReviewItems((prev) => prev.filter((current) => current.id !== item.id));
      setImageStatus(item.originalUrl, "idle");
    },
    [setImageStatus],
  );

  const discardEnhancedObject = useCallback((enhancedUrl: string) => {
    pendingEnhancedUrlsRef.current.delete(enhancedUrl);
    void deleteImageRef.current(enhancedUrl).catch(() => undefined);
  }, []);

  const acceptEnhancedImage = useCallback(
    (itemId: string) => {
      const item = reviewItems.find((current) => current.id === itemId);
      if (!item) return;

      // Handed over to the form: the media hook now owns the cleanup of this
      // object (and of the original it replaces).
      pendingEnhancedUrlsRef.current.delete(item.enhancedUrl);
      const didReplace = replaceImageRef.current(item.originalUrl, item.enhancedUrl);

      if (!didReplace) {
        toastManager.add({ title: t("aiEnhanceOriginalMissing"), type: "error" });
        discardEnhancedObject(item.enhancedUrl);
      }

      dismissReviewItem(item);
    },
    [discardEnhancedObject, dismissReviewItem, reviewItems, t],
  );

  const rejectEnhancedImage = useCallback(
    (itemId: string) => {
      const item = reviewItems.find((current) => current.id === itemId);
      if (!item) return;

      discardEnhancedObject(item.enhancedUrl);
      dismissReviewItem(item);
    },
    [discardEnhancedObject, dismissReviewItem, reviewItems],
  );

  // Closing the review keeps every original: the not-yet-reviewed enhanced
  // objects are dropped like a rejection so none is orphaned.
  const closeEnhanceReview = useCallback(() => {
    for (const item of reviewItems) {
      discardEnhancedObject(item.enhancedUrl);
      setImageStatus(item.originalUrl, "idle");
    }
    setReviewItems([]);
  }, [discardEnhancedObject, reviewItems, setImageStatus]);

  const imageEnhance = useMemo<ProductImageEnhanceControls>(
    () => ({
      enabled,
      backgroundRemovalEnabled,
      statusByImage,
      isRunning,
      batchProgress,
      enhanceImage,
      removeBackground,
      enhanceAllImages,
    }),
    [
      backgroundRemovalEnabled,
      batchProgress,
      enabled,
      enhanceAllImages,
      enhanceImage,
      isRunning,
      removeBackground,
      statusByImage,
    ],
  );

  return {
    imageEnhance,
    enhanceImages,
    enhanceReviewItems: reviewItems,
    isEnhanceReviewOpen: reviewItems.length > 0,
    acceptEnhancedImage,
    rejectEnhancedImage,
    closeEnhanceReview,
    isEnhancePromoOpen,
    openEnhancePromo,
    closeEnhancePromo,
  };
}
