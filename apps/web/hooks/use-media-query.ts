"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query.
 *
 * The server snapshot is `false`, so the first paint always renders the
 * "query does not match" branch. Use this to decide behaviour in event
 * handlers — driving layout with it costs a hydration flash, and Tailwind
 * breakpoint classes do that job without one.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
