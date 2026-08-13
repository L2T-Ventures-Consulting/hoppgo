"use client";

import {
  useHotkey,
  useHotkeySequence,
  type HotkeyCallback,
  type UseHotkeyOptions,
  type UseHotkeySequenceOptions,
} from "@tanstack/react-hotkeys";
import { usePostHog } from "posthog-js/react";

import {
  useKeyboardHotkey,
  useKeyboardShortcutSequence,
} from "@/components/shared/keyboard-shortcuts-provider";
import {
  keyboardShortcutAnalyticsBaseProperties,
  productAnalyticsEvents,
} from "@/lib/product-analytics/analytics-events";
import type { HotkeyShortcutId, KeyboardShortcutSequenceId } from "@/lib/keyboard-shortcuts";

export const useTrackedKeyboardHotkey = (
  shortcutId: HotkeyShortcutId,
  callback: HotkeyCallback,
  options: UseHotkeyOptions = {},
) => {
  const posthog = usePostHog();
  const shortcut = useKeyboardHotkey(shortcutId);

  useHotkey(
    shortcut.hotkey,
    (event, context) => {
      callback(event, context);
      posthog.capture(productAnalyticsEvents.keyboardShortcutTriggered, {
        ...keyboardShortcutAnalyticsBaseProperties,
        binding: shortcut.value,
        binding_type: "hotkey",
        shortcut_id: shortcutId,
      });
    },
    options,
  );

  return shortcut;
};

export const useTrackedKeyboardShortcutSequence = (
  shortcutId: KeyboardShortcutSequenceId,
  callback: HotkeyCallback,
  options: UseHotkeySequenceOptions = {},
) => {
  const posthog = usePostHog();
  const shortcut = useKeyboardShortcutSequence(shortcutId);

  useHotkeySequence(
    shortcut.sequence,
    (event, context) => {
      callback(event, context);
      posthog.capture(productAnalyticsEvents.keyboardShortcutTriggered, {
        ...keyboardShortcutAnalyticsBaseProperties,
        binding: shortcut.value.join(" "),
        binding_type: "sequence",
        shortcut_id: shortcutId,
      });
    },
    options,
  );

  return shortcut;
};
