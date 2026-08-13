import {
  hasNonModifierKey,
  normalizeHotkey,
  parseHotkey,
  validateHotkey,
} from "@tanstack/react-hotkeys";
import { z } from "zod";

export type KeyboardShortcutBinding = string | string[];

type KeyboardShortcutDefinition =
  | {
      defaultBinding: string;
      kind: "hotkey";
    }
  | {
      defaultBinding: string[];
      kind: "sequence";
    };

export const keyboardShortcutDefinitions = {
  commandPalette: {
    defaultBinding: "Mod+K",
    kind: "hotkey",
  },
  aiAssistant: {
    defaultBinding: "Mod+Shift+K",
    kind: "hotkey",
  },
  toggleTheme: {
    defaultBinding: "D",
    kind: "hotkey",
  },
  sidebar: {
    defaultBinding: "Mod+B",
    kind: "hotkey",
  },
  search: {
    defaultBinding: "Mod+F",
    kind: "hotkey",
  },
  createReservation: {
    defaultBinding: ["N", "R"],
    kind: "sequence",
  },
  goToReservations: {
    defaultBinding: ["G", "R"],
    kind: "sequence",
  },
  goToCalendar: {
    defaultBinding: ["G", "A"],
    kind: "sequence",
  },
  save: {
    defaultBinding: "Mod+S",
    kind: "hotkey",
  },
} satisfies Record<string, KeyboardShortcutDefinition>;

export type KeyboardShortcutId = keyof typeof keyboardShortcutDefinitions;
export type HotkeyShortcutId = {
  [ShortcutId in KeyboardShortcutId]: (typeof keyboardShortcutDefinitions)[ShortcutId]["kind"] extends "hotkey"
    ? ShortcutId
    : never;
}[KeyboardShortcutId];
export type KeyboardShortcutSequenceId = Exclude<KeyboardShortcutId, HotkeyShortcutId>;

export const keyboardShortcutIds = [
  "commandPalette",
  "aiAssistant",
  "toggleTheme",
  "sidebar",
  "search",
  "createReservation",
  "goToReservations",
  "goToCalendar",
  "save",
] as const satisfies readonly KeyboardShortcutId[];

const hotkeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((hotkey) => validateHotkey(hotkey).valid && hasNonModifierKey(parseHotkey(hotkey)));

const hotkeySequenceSchema = z.array(hotkeySchema).min(2).max(3);

export const keyboardShortcutOverridesSchema = z
  .object({
    commandPalette: hotkeySchema.optional(),
    aiAssistant: hotkeySchema.optional(),
    toggleTheme: hotkeySchema.optional(),
    sidebar: hotkeySchema.optional(),
    search: hotkeySchema.optional(),
    createReservation: hotkeySequenceSchema.optional(),
    goToReservations: hotkeySequenceSchema.optional(),
    goToCalendar: hotkeySequenceSchema.optional(),
    save: hotkeySchema.optional(),
  })
  .strict();

export type KeyboardShortcutOverrides = z.infer<typeof keyboardShortcutOverridesSchema>;

export const parseKeyboardShortcutOverrides = (value: unknown): KeyboardShortcutOverrides => {
  const result = keyboardShortcutOverridesSchema.safeParse(value);
  return result.success ? result.data : {};
};

export type ResolvedKeyboardShortcuts = {
  [ShortcutId in KeyboardShortcutId]: (typeof keyboardShortcutDefinitions)[ShortcutId]["kind"] extends "hotkey"
    ? string
    : string[];
};

export const getDefaultKeyboardShortcutBinding = (
  shortcutId: KeyboardShortcutId,
): KeyboardShortcutBinding => {
  const defaultBinding = keyboardShortcutDefinitions[shortcutId].defaultBinding;
  return Array.isArray(defaultBinding) ? [...defaultBinding] : defaultBinding;
};

export const resolveKeyboardShortcuts = (
  overrides: KeyboardShortcutOverrides,
): ResolvedKeyboardShortcuts => ({
  commandPalette:
    overrides.commandPalette ?? keyboardShortcutDefinitions.commandPalette.defaultBinding,
  aiAssistant: overrides.aiAssistant ?? keyboardShortcutDefinitions.aiAssistant.defaultBinding,
  toggleTheme: overrides.toggleTheme ?? keyboardShortcutDefinitions.toggleTheme.defaultBinding,
  sidebar: overrides.sidebar ?? keyboardShortcutDefinitions.sidebar.defaultBinding,
  search: overrides.search ?? keyboardShortcutDefinitions.search.defaultBinding,
  createReservation: [
    ...(overrides.createReservation ??
      keyboardShortcutDefinitions.createReservation.defaultBinding),
  ],
  goToReservations: [
    ...(overrides.goToReservations ?? keyboardShortcutDefinitions.goToReservations.defaultBinding),
  ],
  goToCalendar: [
    ...(overrides.goToCalendar ?? keyboardShortcutDefinitions.goToCalendar.defaultBinding),
  ],
  save: overrides.save ?? keyboardShortcutDefinitions.save.defaultBinding,
});

export const keyboardShortcutBindingsEqual = (
  firstBinding: KeyboardShortcutBinding,
  secondBinding: KeyboardShortcutBinding,
): boolean => {
  if (typeof firstBinding === "string" && typeof secondBinding === "string") {
    return (
      normalizeHotkey(firstBinding, "mac") === normalizeHotkey(secondBinding, "mac") &&
      normalizeHotkey(firstBinding, "windows") === normalizeHotkey(secondBinding, "windows")
    );
  }

  if (!Array.isArray(firstBinding) || !Array.isArray(secondBinding)) {
    return false;
  }

  return (
    firstBinding.length === secondBinding.length &&
    firstBinding.every(
      (hotkey, index) =>
        normalizeHotkey(hotkey, "mac") === normalizeHotkey(secondBinding[index] ?? "", "mac") &&
        normalizeHotkey(hotkey, "windows") ===
          normalizeHotkey(secondBinding[index] ?? "", "windows"),
    )
  );
};

export const findKeyboardShortcutConflict = (
  shortcuts: ResolvedKeyboardShortcuts,
  shortcutId: KeyboardShortcutId,
  binding: KeyboardShortcutBinding,
): KeyboardShortcutId | null =>
  keyboardShortcutIds.find(
    (candidateId) =>
      candidateId !== shortcutId && keyboardShortcutBindingsEqual(shortcuts[candidateId], binding),
  ) ?? null;

export const findDuplicateKeyboardShortcut = (
  shortcuts: ResolvedKeyboardShortcuts,
): KeyboardShortcutId | null => {
  for (const shortcutId of keyboardShortcutIds) {
    if (findKeyboardShortcutConflict(shortcuts, shortcutId, shortcuts[shortcutId])) {
      return shortcutId;
    }
  }

  return null;
};
