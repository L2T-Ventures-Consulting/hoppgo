"use client";

import { useEffect, useState } from "react";

/** Idle window between two flips. Randomised inside the range so the loop reads
 *  as a nudge rather than a metronome. */
const FLIP_IDLE_MIN_MS = 5_000;
const FLIP_IDLE_MAX_MS = 10_000;

/**
 * Drives a recurring one-shot CSS animation for as long as `enabled` holds:
 * `flipping` gates the animation class, `onFlipEnd` belongs on the animated
 * element's `onAnimationEnd`.
 *
 * Each run is scheduled off the end of the previous one rather than on an
 * interval, so a throttled background tab can never queue up a burst of them.
 */
export const usePeriodicFlip = (enabled: boolean) => {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    // Reduced motion cancels the animation in CSS, which would also cancel the
    // `animationend` this loop is waiting on — so never start it at all.
    if (!enabled || flipping) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const delay = FLIP_IDLE_MIN_MS + Math.random() * (FLIP_IDLE_MAX_MS - FLIP_IDLE_MIN_MS);
    const timeout = setTimeout(() => setFlipping(true), delay);

    return () => clearTimeout(timeout);
  }, [enabled, flipping]);

  // Dropping the class on `animationend` both re-arms the next run and lets the
  // class re-trigger the animation when it comes back.
  return { flipping, onFlipEnd: () => setFlipping(false) };
};
