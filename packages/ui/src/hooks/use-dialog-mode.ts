"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * Shared plumbing behind "a dialog is a bottom sheet on the phone".
 *
 * It lives apart from `dialog.tsx` so every dialog-shaped component (plain
 * dialog, alert dialog, …) resolves the same breakpoint and hands the same
 * mode down to its parts, instead of each one growing its own copy that
 * eventually drifts.
 */

type DialogMode = "dialog" | "drawer";
type DialogMobileVariant = "dialog" | "drawer";

const DIALOG_DRAWER_MEDIA_QUERY = "(max-width: 639px)";
const DialogModeContext = createContext<DialogMode>("dialog");

const subscribeToDialogDrawerMediaQuery = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(DIALOG_DRAWER_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
};

const getDialogDrawerMediaQuerySnapshot = () =>
  window.matchMedia(DIALOG_DRAWER_MEDIA_QUERY).matches;

const getDialogDrawerMediaQueryServerSnapshot = () => false;

const useDialogMode = () => useContext(DialogModeContext);

const useDialogDrawerMediaQuery = () =>
  useSyncExternalStore(
    subscribeToDialogDrawerMediaQuery,
    getDialogDrawerMediaQuerySnapshot,
    getDialogDrawerMediaQueryServerSnapshot,
  );

const useResolvedDialogMode = (mobileVariant: DialogMobileVariant): DialogMode => {
  const matchesDrawerBreakpoint = useDialogDrawerMediaQuery();

  return matchesDrawerBreakpoint && mobileVariant === "drawer" ? "drawer" : "dialog";
};

export {
  DialogModeContext,
  type DialogMobileVariant,
  type DialogMode,
  useDialogDrawerMediaQuery,
  useDialogMode,
  useResolvedDialogMode,
};
