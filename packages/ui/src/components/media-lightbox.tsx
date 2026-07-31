"use client";

import {
  Fragment,
  type Key,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

import { Button } from "@louez/ui/components/button";
import { cn } from "@louez/ui/lib/utils";

const SWIPE_DISTANCE = 64;
const SWIPE_VELOCITY = 520;
const DISMISS_DISTANCE = 112;
const DISMISS_VELOCITY = 720;
const DRAG_INTENT_DISTANCE = 10;
const HERO_RADIUS = 24;

const HERO_SPRING = { type: "spring", stiffness: 340, damping: 34, mass: 0.8 } as const;
const NAVIGATION_SPRING = { type: "spring", stiffness: 390, damping: 38, mass: 0.82 } as const;
const DRAG_DISMISS_SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 } as const;

const DEFAULT_LABELS = {
  dialog: "Media viewer",
  close: "Close viewer",
  previous: "Previous media",
  next: "Next media",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const slideTravel = (step: number) => (step > 0 ? "calc(100vw + 48px)" : "calc(-100vw - 48px)");

type CloseMode = "shared" | "drag";

type MediaLightboxRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type MediaLightboxLabels = {
  dialog?: string;
  close?: string;
  previous?: string;
  next?: string;
};

type MediaLightboxRenderContext<Item> = {
  active: boolean;
  index: number;
  initial: boolean;
  item: Item;
  itemKey: Key;
};

type MediaLightboxToolbarContext<Item> = {
  index: number;
  item: Item;
};

type MediaLightboxProps<Item> = {
  items: readonly Item[];
  initialIndex: number;
  open: boolean;
  /** Width / height of the item, used to size the hero and match the source. */
  getAspectRatio: (item: Item, index: number) => number;
  renderItem: (context: MediaLightboxRenderContext<Item>) => ReactNode;
  /**
   * Optional actions for the item on screen, laid out in a bar under the hero.
   * A render prop rather than a node so it always sees the *current* item —
   * the viewer owns its index and the caller cannot guess it after a swipe.
   */
  renderToolbar?: (context: MediaLightboxToolbarContext<Item>) => ReactNode;
  /** Notified whenever the viewer moves to another item (swipe, arrows, jump). */
  onIndexChange?: (index: number) => void;
  /**
   * Externally requested item. Changing it moves the viewer without animating;
   * leave it out to keep the viewer fully uncontrolled.
   */
  activeIndex?: number;
  /** Element the hero flies from / back to — usually the thumbnail. */
  resolveSource: (index: number, item: Item) => HTMLElement | null;
  onOpenChange: (open: boolean) => void;
  /** Called once the exit animation finished, to unmount the lightbox. */
  onClosed: () => void;
  getItemKey?: (item: Item, index: number) => Key;
  labels?: MediaLightboxLabels;
  reduceMotion?: boolean;
  /** Temporarily yields keyboard handling to a nested dialog or drawer. */
  suspendInteractions?: boolean;
  className?: string;
  backdropClassName?: string;
  heroClassName?: string;
};

type HeroTransform = {
  x: number;
  y: number;
  scale: number;
};

type DragReleaseVelocity = {
  x: number;
  y: number;
};

function getHeroTransform(
  heroRect: MediaLightboxRect,
  sourceRect: MediaLightboxRect,
): HeroTransform {
  return {
    x: sourceRect.left + sourceRect.width / 2 - (heroRect.left + heroRect.width / 2),
    y: sourceRect.top + sourceRect.height / 2 - (heroRect.top + heroRect.height / 2),
    scale: sourceRect.width / heroRect.width,
  };
}

// The hero carries drag transforms, so its bounding box lies about the layout
// position the close animation has to start from — walk offsets instead.
function getHeroLayoutRect(hero: HTMLElement): MediaLightboxRect | null {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = hero;

  while (node && !node.hasAttribute("data-media-lightbox-drag-surface")) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
  }

  if (!node) return null;
  return { left, top, width: hero.offsetWidth, height: hero.offsetHeight };
}

function MediaLightbox<Item>({
  items,
  initialIndex,
  open,
  getAspectRatio,
  renderItem,
  renderToolbar,
  onIndexChange,
  activeIndex,
  resolveSource,
  onOpenChange,
  onClosed,
  getItemKey = (_item, index) => index,
  labels,
  reduceMotion,
  suspendInteractions = false,
  className,
  backdropClassName,
  heroClassName,
}: MediaLightboxProps<Item>) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const reduce = reduceMotion ?? prefersReducedMotion;
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [index, setIndex] = useState(initialIndex);
  const [returningToSource, setReturningToSource] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const dragIntentRef = useRef<"swipe" | "dismiss" | null>(null);
  const closeStartedRef = useRef(false);
  const indexRef = useRef(initialIndex);
  const railControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const surfacePointerRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mediaScale = useTransform(y, [-180, 0, 520], [1, 1, 0.86]);
  const dismissBlend = useMotionValue(0);
  const neighborCounterX = useTransform(() => (-x.get() * dismissBlend.get()) / mediaScale.get());
  const neighborCounterY = useTransform(() => (-y.get() * dismissBlend.get()) / mediaScale.get());
  const neighborCounterScale = useTransform(() => {
    const blend = dismissBlend.get();
    return 1 + (1 / mediaScale.get() - 1) * blend;
  });
  const heroX = useMotionValue(0);
  const heroY = useMotionValue(0);
  const heroScale = useMotionValue(1);
  const heroElevation = useMotionValue(reduce ? 1 : 0);
  const heroBorderRadius = useMotionValue(HERO_RADIUS);
  const heroBoxShadow = useTransform(heroElevation, (elevation) => {
    const progress = Math.min(1, Math.max(0, elevation));
    return `0 ${25 * progress}px ${50 * progress}px ${-12 * progress}px rgb(0 0 0 / ${0.25 * progress})`;
  });
  const backdropOpacity = useTransform(y, [-180, 0, 180, 520], [1, 1, 0.7, 0.12]);
  const item = items[index];
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

  useLayoutEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = document.createElement("div");
    node.dataset.mediaLightboxPortal = "";
    document.body.appendChild(node);

    const siblings = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement => element instanceof HTMLElement && element !== node,
      )
      .map((element) => ({
        element,
        ariaHidden: element.getAttribute("aria-hidden"),
        inert: element.inert,
      }));

    for (const { element } of siblings) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }

    setPortalNode(node);

    return () => {
      for (const { element, ariaHidden, inert } of siblings) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      node.remove();

      window.requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      });
    };
  }, []);

  const stopRail = useCallback(() => {
    const controls = railControlsRef.current;
    railControlsRef.current = null;
    controls?.stop();
  }, []);

  const centerRail = useCallback(() => {
    stopRail();
    x.jump(0);
  }, [stopRail, x]);

  const settleRail = useCallback(() => {
    stopRail();
    const controls = animate(x, 0, NAVIGATION_SPRING);
    railControlsRef.current = controls;
    void controls.then(() => {
      if (railControlsRef.current !== controls) return;
      railControlsRef.current = null;
      x.jump(0);
      dismissBlend.jump(0);
    });
  }, [dismissBlend, stopRail, x]);

  const navigate = useCallback(
    (step: -1 | 1) => {
      if (items.length < 2 || closeStartedRef.current) return;

      if (railControlsRef.current) centerRail();
      dismissBlend.jump(0);
      const dragOffset = x.get();
      const targetIndex = (indexRef.current + step + items.length) % items.length;
      indexRef.current = targetIndex;
      flushSync(() => setIndex(targetIndex));

      if (reduce) {
        x.jump(0);
        y.jump(0);
        return;
      }

      // The new slide is rendered off-screen already: jump the rail to where it
      // sits, then spring it back to centre.
      x.jump(dragOffset + step * (window.innerWidth + 48));
      void animate(y, 0, NAVIGATION_SPRING);
      const controls = animate(x, 0, NAVIGATION_SPRING);
      railControlsRef.current = controls;
      void controls.then(() => {
        if (railControlsRef.current !== controls) return;
        railControlsRef.current = null;
        x.jump(0);
      });
    },
    [centerRail, dismissBlend, items.length, reduce, x, y],
  );

  // Report the current item so a caller can keep its own pointer in step (and
  // aim an `activeIndex` jump at it later).
  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  // The caller's list can shrink under us — a toolbar action deleting the item
  // being viewed, typically. Clamp instead of letting `items[index]` go
  // undefined, which would rip the whole viewer out mid-exit and strand
  // `onClosed`, leaving the caller convinced it is still open.
  useEffect(() => {
    if (items.length === 0 || indexRef.current < items.length) return;
    const clamped = items.length - 1;
    indexRef.current = clamped;
    setIndex(clamped);
  }, [items.length]);

  // An externally requested item — e.g. the caller reordered `items` and wants
  // the same picture to stay on screen. No animation: nothing "moved" for the
  // viewer, the list did.
  useEffect(() => {
    if (activeIndex === undefined || closeStartedRef.current) return;
    if (activeIndex === indexRef.current) return;
    if (activeIndex < 0 || activeIndex >= items.length) return;

    stopRail();
    indexRef.current = activeIndex;
    setIndex(activeIndex);
    x.jump(0);
    y.jump(0);
    dismissBlend.jump(0);
  }, [activeIndex, dismissBlend, items.length, stopRail, x, y]);

  const requestClose = useCallback(
    (mode: CloseMode, releaseVelocity?: DragReleaseVelocity) => {
      if (closeStartedRef.current) return;
      if (mode === "drag") stopRail();
      else {
        centerRail();
        dismissBlend.jump(0);
      }
      closeStartedRef.current = true;

      const closingIndex = indexRef.current;
      const closingItem = items[closingIndex];
      if (closingItem === undefined) return;

      setReturningToSource(true);

      if (reduce) {
        onOpenChange(false);
        return;
      }

      const source = resolveSource(closingIndex, closingItem);
      const sourceRect = source?.getBoundingClientRect();
      const hero = heroRef.current;
      const heroRect = hero ? (getHeroLayoutRect(hero) ?? hero.getBoundingClientRect()) : undefined;
      const closeSpring = mode === "drag" ? DRAG_DISMISS_SPRING : HERO_SPRING;
      void animate(heroElevation, 0, closeSpring);

      if (heroRect && sourceRect && sourceRect.width > 0 && sourceRect.height > 0) {
        const target = getHeroTransform(heroRect, sourceRect);
        void animate(x, 0, { ...closeSpring, velocity: releaseVelocity?.x });
        void animate(y, 0, { ...closeSpring, velocity: releaseVelocity?.y });
        void animate(heroX, target.x, closeSpring);
        void animate(heroY, target.y, closeSpring);
        void animate(heroScale, target.scale, closeSpring);
      } else {
        // No source on screen: fall back to a plain dismiss.
        void animate(x, 0, { ...closeSpring, velocity: releaseVelocity?.x });
        void animate(y, mode === "drag" ? window.innerHeight * 0.7 : 24, {
          ...closeSpring,
          velocity: releaseVelocity?.y,
        });
        void animate(heroScale, 0.9, closeSpring);
      }

      window.requestAnimationFrame(() => onOpenChange(false));
    },
    [
      centerRail,
      dismissBlend,
      heroElevation,
      heroScale,
      heroX,
      heroY,
      items,
      onOpenChange,
      reduce,
      resolveSource,
      stopRail,
      x,
      y,
    ],
  );

  // Keep the visual corner radius constant while the hero scales.
  useLayoutEffect(
    () =>
      heroScale.on("change", (scale) => {
        heroBorderRadius.set(HERO_RADIUS / scale);
      }),
    [heroBorderRadius, heroScale],
  );

  useLayoutEffect(() => {
    if (!portalNode) return;
    const hero = heroRef.current;
    const openingItem = items[initialIndex];
    if (!hero || openingItem === undefined || reduce) return;

    const source = resolveSource(initialIndex, openingItem);
    if (!source) return;

    const heroRect = hero.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    if (sourceRect.width === 0 || sourceRect.height === 0) return;

    const entrance = getHeroTransform(heroRect, sourceRect);
    heroX.set(entrance.x);
    heroY.set(entrance.y);
    heroScale.set(entrance.scale);
    heroElevation.set(0);

    let controls: ReturnType<typeof animate>[] = [];
    const frame = window.requestAnimationFrame(() => {
      controls = [
        animate(heroX, 0, HERO_SPRING),
        animate(heroY, 0, HERO_SPRING),
        animate(heroScale, 1, HERO_SPRING),
        animate(heroElevation, 1, HERO_SPRING),
      ];
    });

    return () => {
      window.cancelAnimationFrame(frame);
      for (const control of controls) control.stop();
    };
  }, [
    heroElevation,
    heroScale,
    heroX,
    heroY,
    initialIndex,
    items,
    portalNode,
    reduce,
    resolveSource,
  ]);

  useEffect(() => {
    if (!portalNode) return;
    const previousOverflow = document.documentElement.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    dialogRef.current
      ?.querySelector<HTMLElement>("[data-media-lightbox-close]")
      ?.focus({ preventScroll: true });

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
    };
  }, [portalNode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open || suspendInteractions) return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose("shared");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(1);
      } else if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((element) => !element.hidden && element.getClientRects().length > 0);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, open, requestClose, suspendInteractions]);

  if (!portalNode || item === undefined) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onClosed}>
      {open ? (
        <motion.div
          ref={dialogRef}
          key="media-lightbox"
          data-slot="media-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={resolvedLabels.dialog}
          initial={false}
          exit={{ opacity: 1 }}
          transition={{ duration: reduce ? 0.12 : 0.64 }}
          className={cn("fixed inset-0 z-50 isolate touch-none overflow-hidden", className)}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) requestClose("shared");
          }}
        >
          <motion.div
            data-slot="media-lightbox-backdrop"
            aria-hidden
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.48, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 z-0"
          >
            <motion.div
              className={cn("bg-background absolute inset-0", backdropClassName)}
              style={{ opacity: backdropOpacity }}
            />
          </motion.div>

          <Button
            type="button"
            data-media-lightbox-close=""
            aria-label={resolvedLabels.close}
            variant="tertiary"
            size="icon-lg"
            onClick={() => requestClose("shared")}
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20"
            style={{ opacity: returningToSource ? 0 : 1 }}
          >
            <X data-slot="icon" className="size-4 stroke-2" />
          </Button>

          {items.length > 1 ? (
            <>
              <NavigationButton
                label={resolvedLabels.previous}
                side="left"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft data-slot="icon" className="size-5" />
              </NavigationButton>
              <NavigationButton
                label={resolvedLabels.next}
                side="right"
                onClick={() => navigate(1)}
              >
                <ChevronRight data-slot="icon" className="size-5" />
              </NavigationButton>
            </>
          ) : null}

          <div
            className="absolute inset-0 z-10"
            onPointerDownCapture={(event) => {
              surfacePointerRef.current = {
                x: event.clientX,
                y: event.clientY,
                dragged: false,
              };
              if (reduce || event.button !== 0) return;
              if ((event.target as HTMLElement).closest("[data-media-lightbox-no-drag]")) return;
              dragControls.start(event);
            }}
            onPointerMoveCapture={(event) => {
              const pointer = surfacePointerRef.current;
              if (!pointer || pointer.dragged) return;
              pointer.dragged =
                Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8;
            }}
            onPointerCancelCapture={() => {
              surfacePointerRef.current = null;
            }}
            onClick={(event) => {
              const pointer = surfacePointerRef.current;
              surfacePointerRef.current = null;
              if (event.target === event.currentTarget && !pointer?.dragged) {
                requestClose("shared");
              }
            }}
          >
            <motion.div
              data-slot="media-lightbox-drag-surface"
              data-media-lightbox-drag-surface
              drag={!reduce}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
              dragElastic={{ top: 0.12, right: 1, bottom: 1, left: 1 }}
              dragMomentum={false}
              style={{ x, y, scale: mediaScale }}
              onDragStart={() => {
                centerRail();
                dismissBlend.jump(0);
                dragIntentRef.current = null;
              }}
              onDrag={(_, info) => {
                if (dragIntentRef.current === null) {
                  const distance = Math.hypot(info.offset.x, info.offset.y);
                  if (distance >= DRAG_INTENT_DISTANCE) {
                    dragIntentRef.current =
                      Math.abs(info.offset.x) > Math.abs(info.offset.y) ? "swipe" : "dismiss";
                    dismissBlend.jump(dragIntentRef.current === "dismiss" ? 1 : 0);
                  }
                }

                if (dragIntentRef.current === "swipe") y.jump(0);
              }}
              onPointerCancel={() => {
                dragIntentRef.current = null;
                settleRail();
                void animate(y, 0, DRAG_DISMISS_SPRING);
              }}
              onDragEnd={(_, info) => {
                const horizontal =
                  dragIntentRef.current === "swipe" ||
                  (dragIntentRef.current === null &&
                    Math.abs(info.offset.x) > Math.abs(info.offset.y));
                if (
                  horizontal &&
                  (Math.abs(info.offset.x) > SWIPE_DISTANCE ||
                    Math.abs(info.velocity.x) > SWIPE_VELOCITY)
                ) {
                  navigate(info.offset.x < 0 ? 1 : -1);
                  return;
                }

                if (
                  !horizontal &&
                  (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY)
                ) {
                  requestClose("drag", { x: info.velocity.x, y: info.velocity.y });
                  return;
                }

                settleRail();
                void animate(y, 0, DRAG_DISMISS_SPRING);
              }}
              className="pointer-events-none absolute inset-0 select-none"
            >
              {(items.length > 1 ? ([-1, 0, 1] as const) : ([0] as const)).map((slot) => {
                const slideIndex = (index + slot + items.length) % items.length;
                const slideItem = items[slideIndex];
                if (slideItem === undefined) return null;

                const active = slot === 0;
                const itemKey = getItemKey(slideItem, slideIndex);
                const aspect = getAspectRatio(slideItem, slideIndex);

                return (
                  <motion.div
                    key={slot}
                    aria-hidden={active ? undefined : true}
                    data-slot="media-lightbox-slide-content"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      x: active ? 0 : neighborCounterX,
                      y: active ? 0 : neighborCounterY,
                      scale: active ? 1 : neighborCounterScale,
                    }}
                  >
                    <motion.div
                      data-slot="media-lightbox-slide"
                      className={cn(
                        "pointer-events-none absolute inset-0 flex items-center justify-center px-4 pt-16 sm:px-20 sm:pt-14",
                        // Reserve the bar's height so the hero never sits under it.
                        renderToolbar ? "pb-36 sm:pb-28" : "pb-24 sm:pb-14",
                      )}
                      style={{ x: slot === 0 ? 0 : slideTravel(slot) }}
                    >
                      <motion.div
                        ref={active ? heroRef : undefined}
                        data-slot="media-lightbox-hero"
                        className={cn(
                          "bg-muted pointer-events-auto relative z-10 cursor-grab overflow-hidden ring-1 ring-black/10 active:cursor-grabbing dark:ring-white/12 [&_img]:pointer-events-none",
                          heroClassName,
                        )}
                        style={{
                          x: active ? heroX : 0,
                          y: active ? heroY : 0,
                          scale: active ? heroScale : 1,
                          aspectRatio: aspect,
                          width: `min(92vw, calc(82dvh * ${aspect}))`,
                          borderRadius: active ? heroBorderRadius : HERO_RADIUS,
                          boxShadow: active ? heroBoxShadow : "0 25px 50px -12px rgb(0 0 0 / 0.25)",
                        }}
                      >
                        <Fragment key={itemKey}>
                          {renderItem({
                            active,
                            index: slideIndex,
                            initial: slideIndex === initialIndex,
                            item: slideItem,
                            itemKey,
                          })}
                        </Fragment>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {renderToolbar || items.length > 1 ? (
            // Pointer-events-none on the stack itself: the gaps around the
            // controls must stay click-to-dismiss.
            <div
              data-slot="media-lightbox-bottom-bar"
              className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-2 transition-opacity duration-150"
              style={{ opacity: returningToSource ? 0 : 1 }}
            >
              {items.length > 1 ? (
                <div
                  data-slot="media-lightbox-mobile-navigation"
                  className="pointer-events-auto flex items-center justify-center gap-2 sm:hidden"
                >
                  <Button
                    type="button"
                    variant="tertiary"
                    size="icon-lg"
                    aria-label={resolvedLabels.previous}
                    onClick={() => navigate(-1)}
                  >
                    <ChevronLeft data-slot="icon" className="size-4 stroke-2" />
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="icon-lg"
                    aria-label={resolvedLabels.next}
                    onClick={() => navigate(1)}
                  >
                    <ChevronRight data-slot="icon" className="size-4 stroke-2" />
                  </Button>
                </div>
              ) : null}

              {renderToolbar ? (
                <div
                  data-slot="media-lightbox-toolbar"
                  // Keeps a button press from arming the swipe/dismiss drag.
                  data-media-lightbox-no-drag
                  className="pointer-events-auto max-w-[calc(100vw-2rem)]"
                >
                  {renderToolbar({ index, item })}
                </div>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalNode,
  );
}

function NavigationButton({
  label,
  side,
  onClick,
  children,
}: {
  label: string;
  side: "left" | "right";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="tertiary"
      size="icon-lg"
      aria-label={label}
      onClick={onClick}
      className={cn("absolute top-1/2 z-20 hidden sm:flex", side === "left" ? "left-5" : "right-5")}
    >
      {children}
    </Button>
  );
}

export {
  MediaLightbox,
  type MediaLightboxLabels,
  type MediaLightboxProps,
  type MediaLightboxRenderContext,
  type MediaLightboxToolbarContext,
};
