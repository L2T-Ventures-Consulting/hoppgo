"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useTranslations } from "next-intl";
import { usePostHog } from "posthog-js/react";

import { submitActiveKeyboardShortcutForm } from "@/lib/keyboard-shortcut-actions";
import {
  keyboardShortcutAnalyticsBaseProperties,
  productAnalyticsEvents,
} from "@/lib/product-analytics/analytics-events";

import { useKeyboardHotkey } from "./keyboard-shortcuts-provider";

export const DashboardSaveShortcut = () => {
  const t = useTranslations("dashboard.shortcuts.actions");
  const posthog = usePostHog();
  const shortcut = useKeyboardHotkey("save");

  useHotkey(
    shortcut.hotkey,
    (event) => {
      if (!submitActiveKeyboardShortcutForm()) {
        return;
      }

      event.preventDefault();
      posthog.capture(productAnalyticsEvents.keyboardShortcutTriggered, {
        ...keyboardShortcutAnalyticsBaseProperties,
        binding: shortcut.value,
        binding_type: "hotkey",
        shortcut_id: "save",
      });
    },
    {
      ignoreInputs: false,
      meta: {
        name: t("save"),
      },
      preventDefault: false,
    },
  );

  return null;
};
