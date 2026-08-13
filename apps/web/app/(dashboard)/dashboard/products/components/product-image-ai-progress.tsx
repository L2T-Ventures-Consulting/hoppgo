"use client";

import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@louez/ui";
import { cn } from "@louez/utils";

import type { ProductImageOperation } from "../hooks/use-product-image-enhance";

/**
 * The enhance endpoint answers once, at the very end — it never streams the
 * provider's progress. The stepper below therefore walks estimated durations
 * and *parks on its last step*: the merchant sees where the work is without
 * ever being shown a completed bar that then sits there doing nothing.
 */
export type AiProcessingStepId = "prepare" | "enhance" | "cutout" | "finish";

interface AiProcessingStep {
  id: AiProcessingStepId;
  labelKey: string;
  messageKeys: readonly string[];
  /** Estimated time before moving on. Ignored on the last step (open-ended). */
  durationMs: number;
}

const STEP_LIBRARY = {
  prepare: {
    id: "prepare",
    labelKey: "aiStepPrepareLabel",
    messageKeys: ["aiStepPrepareMessage1", "aiStepPrepareMessage2", "aiStepPrepareMessage3"],
    durationMs: 4500,
  },
  enhance: {
    id: "enhance",
    labelKey: "aiStepEnhanceLabel",
    messageKeys: [
      "aiStepEnhanceMessage1",
      "aiStepEnhanceMessage2",
      "aiStepEnhanceMessage3",
      "aiStepEnhanceMessage4",
    ],
    durationMs: 45_000,
  },
  cutout: {
    id: "cutout",
    labelKey: "aiStepCutoutLabel",
    messageKeys: ["aiStepCutoutMessage1", "aiStepCutoutMessage2", "aiStepCutoutMessage3"],
    durationMs: 26_000,
  },
  finish: {
    id: "finish",
    labelKey: "aiStepFinishLabel",
    messageKeys: ["aiStepFinishMessage1", "aiStepFinishMessage2", "aiStepFinishMessage3"],
    durationMs: 20_000,
  },
} as const satisfies Record<AiProcessingStepId, AiProcessingStep>;

// Background removal is the short path: no relighting pass, no reframing.
const ENHANCE_STEPS: readonly AiProcessingStep[] = [
  STEP_LIBRARY.prepare,
  STEP_LIBRARY.enhance,
  STEP_LIBRARY.cutout,
  STEP_LIBRARY.finish,
];

const REMOVE_BACKGROUND_STEPS: readonly AiProcessingStep[] = [
  { ...STEP_LIBRARY.prepare, durationMs: 2500 },
  { ...STEP_LIBRARY.cutout, durationMs: 16_000 },
  STEP_LIBRARY.finish,
];

const MESSAGE_ROTATION_MS = 5000;

export function getAiProcessingSteps(
  operation: ProductImageOperation,
): readonly AiProcessingStep[] {
  return operation === "remove-background" ? REMOVE_BACKGROUND_STEPS : ENHANCE_STEPS;
}

interface AiProcessingProgress {
  steps: readonly AiProcessingStep[];
  activeIndex: number;
  activeStep: AiProcessingStep;
  messageKey: string;
}

/**
 * Purely presentational timing: the truth about "is it done" stays with the
 * enhance queue, so unmounting this (closing the dialog) costs nothing.
 */
export function useAiProcessingProgress(
  operation: ProductImageOperation,
  active: boolean,
): AiProcessingProgress {
  const steps = useMemo(() => getAiProcessingSteps(operation), [operation]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [messageTick, setMessageTick] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    setMessageTick(0);
    if (!active) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let index = 0;

    const scheduleNextStep = () => {
      // The last step is where the real wait happens: never leave it.
      if (index >= steps.length - 1) return;
      timeout = setTimeout(() => {
        index += 1;
        setActiveIndex(index);
        setMessageTick(0);
        scheduleNextStep();
      }, steps[index].durationMs);
    };

    scheduleNextStep();
    const interval = setInterval(() => setMessageTick((tick) => tick + 1), MESSAGE_ROTATION_MS);

    return () => {
      if (timeout) clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [active, steps]);

  const safeIndex = Math.min(activeIndex, steps.length - 1);
  const activeStep = steps[safeIndex];

  return {
    steps,
    activeIndex: safeIndex,
    activeStep,
    messageKey: activeStep.messageKeys[messageTick % activeStep.messageKeys.length],
  };
}

/** Crossfade with a hint of travel — small, structurally similar content. */
function RotatingMessage({
  messageKey,
  className,
  live,
}: {
  messageKey: string;
  className?: string;
  /** Only the dialog announces: one live region per tile would be noise. */
  live?: boolean;
}) {
  const t = useTranslations("dashboard.products.form");
  const prefersReducedMotion = useReducedMotion();

  return (
    <span
      className={cn("relative block", className)}
      role={live ? "status" : undefined}
      aria-live={live ? "polite" : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={messageKey}
          className="block"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
          transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
        >
          {t(messageKey)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Indeterminate sweep — constant motion, so `linear` is the honest curve. */
function IndeterminateBar({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <span
      className={cn("bg-primary/15 relative block h-0.5 overflow-hidden rounded-full", className)}
    >
      {prefersReducedMotion ? (
        <span className="bg-primary/60 absolute inset-y-0 left-0 w-1/3 rounded-full" />
      ) : (
        <motion.span
          className="bg-primary absolute inset-y-0 left-0 w-1/2 rounded-full"
          animate={{ x: ["-110%", "220%"] }}
          transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
        />
      )}
    </span>
  );
}

interface ProductImageAiStepperProps {
  operation: ProductImageOperation;
  active: boolean;
  className?: string;
}

/** Full stepper for the crop dialog's processing view. */
export function ProductImageAiStepper({
  operation,
  active,
  className,
}: ProductImageAiStepperProps) {
  const t = useTranslations("dashboard.products.form");
  const prefersReducedMotion = useReducedMotion();
  const { steps, activeIndex, messageKey } = useAiProcessingProgress(operation, active);

  return (
    <div className={cn("space-y-3", className)}>
      <ol className="space-y-2.5">
        {steps.map((step, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <li key={step.id} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isActive && "border-primary text-primary",
                  !isDone && !isActive && "border-border text-muted-foreground",
                )}
              >
                {isDone ? (
                  <motion.span
                    initial={prefersReducedMotion ? false : { scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                    className="flex"
                  >
                    <Check className="size-3" />
                  </motion.span>
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isActive ? "bg-primary motion-safe:animate-pulse" : "bg-muted-foreground/40",
                    )}
                  />
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-sm transition-colors duration-200",
                    isActive && "text-foreground font-medium",
                    isDone && "text-muted-foreground",
                    !isDone && !isActive && "text-muted-foreground/60",
                  )}
                >
                  {t(step.labelKey)}
                </p>
                {isActive && <IndeterminateBar className="mt-2 max-w-40" />}
              </div>
            </li>
          );
        })}
      </ol>

      <RotatingMessage
        live
        messageKey={messageKey}
        className="text-muted-foreground min-h-8 text-xs leading-relaxed"
      />
    </div>
  );
}

interface ProductImageAiTileProgressProps {
  operation: ProductImageOperation;
  className?: string;
  /** Omitted when nothing can be stopped (e.g. a cancellation already landed). */
  onCancel?: () => void;
  cancelLabel?: string;
}

/**
 * Compact twin of the stepper for the form's preview tiles, so a run started
 * from the dialog and one started from a tile speak the same visual language.
 */
export function ProductImageAiTileProgress({
  operation,
  className,
  onCancel,
  cancelLabel,
}: ProductImageAiTileProgressProps) {
  const t = useTranslations("dashboard.products.form");
  const { steps, activeIndex, activeStep, messageKey } = useAiProcessingProgress(operation, true);

  return (
    <div
      className={cn(
        // rounded-[inherit]: Safari's backdrop-filter escapes the parent's
        // overflow-hidden rounding, so the veil must carry the radius itself.
        "bg-background/72 absolute inset-0 flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[inherit] px-3 text-center backdrop-blur-[2px]",
        className,
      )}
      aria-busy="true"
    >
      <ProductImageAiShimmer />

      {onCancel && cancelLabel && (
        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="bg-background/70 hover:bg-background absolute top-1.5 right-1.5 z-10 rounded-md shadow-xs backdrop-blur-sm"
                  onClick={onCancel}
                  aria-label={cancelLabel}
                />
              }
            >
              <X className="size-3" />
            </TooltipTrigger>
            <TooltipContent>{cancelLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="relative flex items-center gap-1">
        {steps.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              index === activeIndex
                ? "bg-primary w-5 motion-safe:animate-pulse"
                : index < activeIndex
                  ? "bg-primary/60 w-2.5"
                  : "bg-muted-foreground/25 w-2.5",
            )}
          />
        ))}
      </div>

      <p className="text-foreground relative text-[11px] font-medium">{t(activeStep.labelKey)}</p>
      <RotatingMessage
        messageKey={messageKey}
        className="text-muted-foreground relative line-clamp-2 text-[10px] leading-tight"
      />
    </div>
  );
}

interface ProductImageAiInlineStatusProps {
  operation: ProductImageOperation;
  onCancel?: () => void;
  cancelLabel: string;
  className?: string;
}

/**
 * One-line variant for tight surfaces (the lightbox toolbar): the same step
 * vocabulary as the dialog and the tiles, plus the cancel affordance — never a
 * row of silently disabled buttons.
 */
export function ProductImageAiInlineStatus({
  operation,
  onCancel,
  cancelLabel,
  className,
}: ProductImageAiInlineStatusProps) {
  const t = useTranslations("dashboard.products.form");
  const { activeStep } = useAiProcessingProgress(operation, true);

  return (
    <div className={cn("flex items-center gap-2 px-1.5", className)} aria-busy="true">
      <span className="bg-primary size-1.5 shrink-0 rounded-full motion-safe:animate-pulse" />
      <span className="text-foreground text-xs font-medium whitespace-nowrap">
        {t(activeStep.labelKey)}
      </span>
      {onCancel && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={onCancel}
                aria-label={cancelLabel}
              />
            }
          >
            <X className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{cancelLabel}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/** Diagonal light sweep laid over a still image while it is being processed. */
export function ProductImageAiShimmer({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return null;

  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      )}
      aria-hidden="true"
    >
      <motion.span
        className="absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/18 to-transparent"
        animate={{ x: ["0%", "400%"] }}
        transition={{ duration: 2.4, ease: "linear", repeat: Infinity, repeatDelay: 0.6 }}
      />
    </span>
  );
}
