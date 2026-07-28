"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

import {
  detectPlatform,
  formatForDisplay,
  HotkeysProvider,
  normalizeHotkey,
  parseHotkey,
} from "@tanstack/react-hotkeys";

import {
  resolveKeyboardShortcuts,
  type HotkeyShortcutId,
  type KeyboardShortcutOverrides,
  type KeyboardShortcutSequenceId,
} from "@/lib/keyboard-shortcuts";

type KeyboardShortcutsContextValue = {
  shortcuts: ReturnType<typeof resolveKeyboardShortcuts>;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

const subscribeToPlatform = () => () => undefined;
const getServerPlatform = () => "linux" as const;

export const KeyboardShortcutsProvider = ({
  children,
  initialShortcuts,
}: {
  children: React.ReactNode;
  initialShortcuts: KeyboardShortcutOverrides;
}) => {
  const shortcuts = useMemo(() => resolveKeyboardShortcuts(initialShortcuts), [initialShortcuts]);

  return (
    <HotkeysProvider
      defaultOptions={{
        hotkey: {
          preventDefault: true,
          requireReset: true,
        },
      }}
    >
      <KeyboardShortcutsContext.Provider value={{ shortcuts }}>
        {children}
      </KeyboardShortcutsContext.Provider>
    </HotkeysProvider>
  );
};

const useKeyboardShortcutsContext = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error("Keyboard shortcut hooks must be used within KeyboardShortcutsProvider.");
  }

  return context;
};

export const useKeyboardHotkey = (shortcutId: HotkeyShortcutId) => {
  const context = useKeyboardShortcutsContext();
  const platform = useSyncExternalStore(subscribeToPlatform, detectPlatform, getServerPlatform);
  const value = context.shortcuts[shortcutId];
  if (typeof value !== "string") {
    throw new Error(`Expected "${shortcutId}" to be a hotkey.`);
  }

  return useMemo(
    () => ({
      hotkey: parseHotkey(value, platform),
      label: formatForDisplay(value, { platform }),
      value,
    }),
    [platform, value],
  );
};

export const useKeyboardShortcutSequence = (shortcutId: KeyboardShortcutSequenceId) => {
  const context = useKeyboardShortcutsContext();
  const platform = useSyncExternalStore(subscribeToPlatform, detectPlatform, getServerPlatform);
  const value = context.shortcuts[shortcutId];
  if (!Array.isArray(value)) {
    throw new Error(`Expected "${shortcutId}" to be a hotkey sequence.`);
  }

  return useMemo(
    () => ({
      label: value.map((hotkey) => formatForDisplay(hotkey, { platform })).join(" "),
      sequence: value.map((hotkey) => normalizeHotkey(hotkey, platform)),
      value,
    }),
    [platform, value],
  );
};
