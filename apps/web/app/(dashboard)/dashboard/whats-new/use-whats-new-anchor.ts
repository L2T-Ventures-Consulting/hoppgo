"use client";

import { useSyncExternalStore } from "react";

/**
 * Current `#fragment` of the URL, without the `#`.
 *
 * The `#<id>` deep links into the changelog are `next/link` navigations, and
 * the App Router applies them with `history.pushState`. That never runs the
 * browser's "scroll to the fragment" step, so the document's `:target` element
 * is never updated and CSS `target:` styling silently never matches — the
 * highlight has to be derived in React instead.
 *
 * `pushState` also fires no event, hence the one-time patch on top of
 * `hashchange`/`popstate`: without it a hash-only navigation (a deep link
 * followed from the changelog page itself) would go unnoticed.
 */
const listeners = new Set<() => void>();

let isHistoryPatched = false;

function emit() {
  for (const listener of listeners) listener();
}

function patchHistory() {
  if (isHistoryPatched) return;
  isHistoryPatched = true;

  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(
      ...args: Parameters<typeof original>
    ): void {
      original.apply(window.history, args);
      emit();
    };
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("hashchange", emit);
    window.addEventListener("popstate", emit);
    patchHistory();
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("hashchange", emit);
      window.removeEventListener("popstate", emit);
    }
  };
}

function getSnapshot(): string {
  return window.location.hash.slice(1);
}

/** No location on the server: nothing is highlighted until after hydration. */
function getServerSnapshot(): string {
  return "";
}

export function useWhatsNewAnchorId(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
