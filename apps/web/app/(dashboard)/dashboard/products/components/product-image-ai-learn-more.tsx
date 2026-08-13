"use client";

import { useCallback, useState } from "react";

import Image from "next/image";

import { Check, Eraser, Sparkles } from "lucide-react";
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

import type { ProductImageOperation } from "../hooks/use-product-image-enhance";
import { AI_PREVIEW_CHECKERBOARD_STYLE } from "./product-image-enhance-dialog";
import { HelpCircleIcon } from "@louez/ui/icons";

/**
 * Marketing visuals live outside the bundle so they can be swapped without a
 * deploy. Nothing here is required: every block hides itself when its asset is
 * missing, so the text pitch always stands on its own.
 */
const ASSET_BASE = "/images/ai-image-examples";

const ENHANCE_HERO_SRC = `${ASSET_BASE}/enhance-hero-transparent.webp`;

const ENHANCE_EXAMPLES = [
  {
    id: "example-1",
    before: `${ASSET_BASE}/enhance-example-1-before.webp`,
    after: `${ASSET_BASE}/enhance-example-1-after.webp`,
  },
  {
    id: "example-2",
    before: `${ASSET_BASE}/enhance-example-2-before.webp`,
    after: `${ASSET_BASE}/enhance-example-2-after.webp`,
  },
  {
    id: "example-3",
    before: `${ASSET_BASE}/enhance-example-3-before.webp`,
    after: `${ASSET_BASE}/enhance-example-3-after.webp`,
  },
] as const;

const BG_REMOVAL_BEFORE_SRC = `${ASSET_BASE}/bg-removal-before.webp`;
const BG_REMOVAL_AFTER_SRC = `${ASSET_BASE}/bg-removal-after.webp`;

const ENHANCE_BENEFIT_KEYS = [
  "aiEnhanceLearnMoreBenefit1",
  "aiEnhanceLearnMoreBenefit2",
  "aiEnhanceLearnMoreBenefit3",
] as const;

/**
 * Both rows of the cutout pitch share one template: the text column and the
 * comparison column have to start on the same vertical line, or the two
 * proofs read as two unrelated blocks.
 */
const BG_REMOVAL_ROW = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center lg:gap-6";

const BG_REMOVAL_BENEFIT_KEYS = [
  "removeBackgroundLearnMoreBenefit1",
  "removeBackgroundLearnMoreBenefit2",
  "removeBackgroundLearnMoreBenefit3",
] as const;

interface AssetImageProps {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  /** Fired once when the file is absent so the caller can drop the block. */
  onUnavailable: () => void;
}

/**
 * `fill` image that reports a missing file instead of leaving a broken frame
 * behind. A file absent from /public makes the optimizer answer 4xx, which the
 * browser surfaces as an image error — that is the whole degradation signal.
 */
function AssetImage({ src, alt, sizes, className, onUnavailable }: AssetImageProps) {
  return (
    <Image src={src} alt={alt} fill sizes={sizes} className={className} onError={onUnavailable} />
  );
}

interface BeforeAfterFigureProps {
  beforeSrc: string;
  afterSrc: string;
  alt: string;
  /** Checkerboard behind the result — for cutouts delivered with alpha. */
  afterTransparent?: boolean;
  /** Called as soon as either half is missing: the pair is shown or nothing. */
  onUnavailable: () => void;
  className?: string;
}

/**
 * Sober side-by-side comparison, shared by both pitch dialogs. A slider would
 * add a drag affordance to a screen the merchant only glances at.
 */
export function BeforeAfterFigure({
  beforeSrc,
  afterSrc,
  alt,
  afterTransparent,
  onUnavailable,
  className,
}: BeforeAfterFigureProps) {
  const t = useTranslations("dashboard.products.form");

  return (
    <figure className={cn("grid grid-cols-2 gap-2", className)}>
      <div className="space-y-1">
        <div className="bg-muted/40 relative aspect-4/3 overflow-hidden rounded-lg border">
          <AssetImage
            src={beforeSrc}
            alt={alt}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="object-cover"
            onUnavailable={onUnavailable}
          />
        </div>
        <figcaption className="text-muted-foreground text-[10px] font-medium">
          {t("aiEnhanceBefore")}
        </figcaption>
      </div>

      <div className="space-y-1">
        <div
          className="bg-muted/40 ring-primary/25 relative aspect-4/3 overflow-hidden rounded-lg border border-primary/50 ring-2"
          style={afterTransparent ? AI_PREVIEW_CHECKERBOARD_STYLE : undefined}
        >
          <AssetImage
            src={afterSrc}
            alt={alt}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className={afterTransparent ? "object-contain" : "object-cover"}
            onUnavailable={onUnavailable}
          />
        </div>
        <figcaption className="text-primary text-[10px] font-medium">
          {t("aiEnhanceAfter")}
        </figcaption>
      </div>
    </figure>
  );
}

function BenefitList({ keys }: { keys: readonly string[] }) {
  const t = useTranslations("dashboard.products.form");

  return (
    <ul className="space-y-2.5">
      {keys.map((key) => (
        <li key={key} className="flex items-start gap-2.5 text-sm">
          <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
            <Check className="size-3" />
          </span>
          {t(key)}
        </li>
      ))}
    </ul>
  );
}

interface LearnMoreDialogProps {
  operation: ProductImageOperation;
  open: boolean;
  onClose: () => void;
  /** Optional "do it now" ending for the pitch. */
  onPrimaryAction?: () => void;
  /** Overrides the CTA wording when the action is not the single-photo one. */
  primaryActionLabel?: string;
}

export function ProductImageAiLearnMoreDialog({
  operation,
  open,
  onClose,
  onPrimaryAction,
  primaryActionLabel,
}: LearnMoreDialogProps) {
  const t = useTranslations("dashboard.products.form");
  const tCommon = useTranslations("common");

  const isBackgroundRemoval = operation === "remove-background";

  const [isHeroMissing, setIsHeroMissing] = useState(false);
  const [missingExampleIds, setMissingExampleIds] = useState<readonly string[]>([]);
  const [isBgDemoMissing, setIsBgDemoMissing] = useState(false);

  const markExampleMissing = useCallback((id: string) => {
    setMissingExampleIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const visibleExamples = ENHANCE_EXAMPLES.filter(
    (example) => !missingExampleIds.includes(example.id),
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPopup className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t(isBackgroundRemoval ? "removeBackgroundLearnMoreTitle" : "aiEnhanceLearnMoreTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(
              isBackgroundRemoval
                ? "removeBackgroundLearnMoreDescription"
                : "aiEnhanceLearnMoreDescription",
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          {isBackgroundRemoval ? (
            <div className="space-y-5">
              {/* The pitch reads next to its proof once there is room; the
                  columns collapse as soon as an asset is missing. */}
              <div className={cn("grid gap-5", !isBgDemoMissing && BG_REMOVAL_ROW)}>
                <BenefitList keys={BG_REMOVAL_BENEFIT_KEYS} />

                {!isBgDemoMissing && (
                  <BeforeAfterFigure
                    beforeSrc={BG_REMOVAL_BEFORE_SRC}
                    afterSrc={BG_REMOVAL_AFTER_SRC}
                    alt={t("removeBackgroundLearnMoreAlt")}
                    afterTransparent
                    onUnavailable={() => setIsBgDemoMissing(true)}
                  />
                )}
              </div>

              {/* The whole argument in one glance: the same cutout sitting on
                  the storefront's light and dark surfaces. */}
              {!isBgDemoMissing && (
                <div className={cn("grid gap-3", BG_REMOVAL_ROW)}>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">
                      {t("removeBackgroundLearnMoreThemeTitle")}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {t("removeBackgroundLearnMoreThemeDescription")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ThemeSurfacePreview
                      tone="light"
                      label={t("removeBackgroundLearnMoreThemeLight")}
                      alt={t("removeBackgroundLearnMoreAlt")}
                      onUnavailable={() => setIsBgDemoMissing(true)}
                    />
                    <ThemeSurfacePreview
                      tone="dark"
                      label={t("removeBackgroundLearnMoreThemeDark")}
                      alt={t("removeBackgroundLearnMoreAlt")}
                      onUnavailable={() => setIsBgDemoMissing(true)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Same rule as above: no hero, no second column to fill. */}
              <div
                className={cn(
                  "grid gap-5",
                  !isHeroMissing && "lg:grid-cols-2 lg:items-center lg:gap-6",
                )}
              >
                {!isHeroMissing && (
                  <div className="bg-muted/40 relative aspect-16/10 w-full overflow-hidden rounded-xl border">
                    <AssetImage
                      src={ENHANCE_HERO_SRC}
                      alt={t("aiEnhanceLearnMoreHeroAlt")}
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 80vw, 420px"
                      className="object-cover"
                      onUnavailable={() => setIsHeroMissing(true)}
                    />
                  </div>
                )}

                <BenefitList keys={ENHANCE_BENEFIT_KEYS} />
              </div>

              {visibleExamples.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("aiEnhanceLearnMoreGalleryTitle")}</p>
                  {/* One example per column instead of a tall stack: the whole
                      gallery then lands in the first screenful. */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleExamples.map((example, index) => (
                      <BeforeAfterFigure
                        key={example.id}
                        beforeSrc={example.before}
                        afterSrc={example.after}
                        alt={t("aiEnhanceLearnMoreExampleAlt", { index: index + 1 })}
                        onUnavailable={() => markExampleMissing(example.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground sm:mr-auto"
          >
            {tCommon("close")}
          </Button>
          {onPrimaryAction && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                onPrimaryAction();
              }}
            >
              {isBackgroundRemoval ? <Eraser data-slot="icon" /> : <Sparkles data-slot="icon" />}
              {primaryActionLabel ??
                t(isBackgroundRemoval ? "removeBackgroundAction" : "aiEnhanceAction")}
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function ThemeSurfacePreview({
  tone,
  label,
  alt,
  onUnavailable,
}: {
  tone: "light" | "dark";
  label: string;
  alt: string;
  onUnavailable: () => void;
}) {
  return (
    <div className="space-y-1">
      {/* The real storefront surface, not an approximation: the product card
          lays its image on `bg-muted`, and scoping the theme class here makes
          both previews truthful whatever theme the dashboard itself is in. */}
      <div
        className={cn(
          "bg-muted relative aspect-4/3 overflow-hidden rounded-lg border",
          tone === "light" ? "light" : "dark",
        )}
      >
        <AssetImage
          src={BG_REMOVAL_AFTER_SRC}
          alt={alt}
          sizes="(max-width: 640px) 45vw, 240px"
          className="object-contain p-2"
          onUnavailable={onUnavailable}
        />
      </div>
      <p className="text-muted-foreground text-[10px] font-medium">{label}</p>
    </div>
  );
}

interface LearnMoreLinkProps {
  operation: ProductImageOperation;
  onPrimaryAction?: () => void;
  className?: string;
}

/**
 * The "learn more" affordance. It owns its own dialog state and is always
 * rendered as a *sibling* of the option card's button — nesting a button
 * inside a button is invalid and would swallow the card's click.
 */
export function ProductImageAiLearnMoreLink({
  operation,
  onPrimaryAction,
  className,
}: LearnMoreLinkProps) {
  const t = useTranslations("dashboard.products.form");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        type="button"
        size="icon-sm"
        variant="tertiary"
        // Icon-only: the label still has to reach assistive tech.
        aria-label={t("aiCreditsLearnMore")}
        className={className}
      >
        <HelpCircleIcon data-slot="icon" />
      </Button>

      <ProductImageAiLearnMoreDialog
        operation={operation}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onPrimaryAction={onPrimaryAction}
      />
    </>
  );
}
