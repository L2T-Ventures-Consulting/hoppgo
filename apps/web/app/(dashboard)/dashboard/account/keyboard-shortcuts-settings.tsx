"use client";

import { useState, useSyncExternalStore } from "react";

import {
  detectPlatform,
  formatForDisplay,
  useHotkeyRecorder,
  useHotkeySequenceRecorder,
} from "@tanstack/react-hotkeys";
import { useMutation } from "@tanstack/react-query";
import { Keyboard, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePostHog } from "posthog-js/react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  toastManager,
} from "@louez/ui";

import {
  findKeyboardShortcutConflict,
  getDefaultKeyboardShortcutBinding,
  keyboardShortcutBindingsEqual,
  keyboardShortcutDefinitions,
  keyboardShortcutIds,
  resolveKeyboardShortcuts,
  type KeyboardShortcutBinding,
  type KeyboardShortcutId,
  type KeyboardShortcutOverrides,
  type ResolvedKeyboardShortcuts,
} from "@/lib/keyboard-shortcuts";
import {
  keyboardShortcutAnalyticsBaseProperties,
  productAnalyticsEvents,
} from "@/lib/product-analytics/analytics-events";

import { updateKeyboardShortcuts } from "./actions";

const subscribeToPlatform = () => () => undefined;
const getServerPlatform = () => "linux" as const;

const formatShortcutBinding = (
  binding: KeyboardShortcutBinding,
  platform: ReturnType<typeof detectPlatform>,
) =>
  (Array.isArray(binding) ? binding : [binding])
    .map((hotkey) => formatForDisplay(hotkey, { platform }))
    .join(" ");

export const KeyboardShortcutsSettings = ({
  initialShortcuts,
}: {
  initialShortcuts: KeyboardShortcutOverrides;
}) => {
  const [shortcuts, setShortcuts] = useState<ResolvedKeyboardShortcuts>(() =>
    resolveKeyboardShortcuts(initialShortcuts),
  );
  const [editingShortcutId, setEditingShortcutId] = useState<KeyboardShortcutId | null>(null);
  const router = useRouter();
  const posthog = usePostHog();
  const t = useTranslations("dashboard.settings.accountSettings.keyboardShortcuts");
  const tActions = useTranslations("dashboard.shortcuts.actions");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const platform = useSyncExternalStore(subscribeToPlatform, detectPlatform, getServerPlatform);

  const mutation = useMutation({
    mutationFn: async (nextShortcuts: KeyboardShortcutOverrides) => {
      const result = await updateKeyboardShortcuts(nextShortcuts);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.shortcuts;
    },
    onSuccess: (savedShortcuts, savedOverrides) => {
      setShortcuts(savedShortcuts);
      toastManager.add({ title: t("saved"), type: "success" });
      const customShortcutCount = keyboardShortcutIds.filter((shortcutId) => {
        const binding = savedOverrides[shortcutId];
        return (
          binding !== undefined &&
          !keyboardShortcutBindingsEqual(
            binding,
            keyboardShortcutDefinitions[shortcutId].defaultBinding,
          )
        );
      }).length;
      posthog.capture(productAnalyticsEvents.keyboardShortcutSettingsUpdated, {
        ...keyboardShortcutAnalyticsBaseProperties,
        custom_shortcut_count: customShortcutCount,
      });
      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message.startsWith("errors.")
          ? tErrors(error.message.replace("errors.", ""))
          : tErrors("generic");
      toastManager.add({ title: message, type: "error" });
    },
  });

  const saveShortcut = (shortcutId: KeyboardShortcutId, binding: KeyboardShortcutBinding) => {
    const conflictId = findKeyboardShortcutConflict(shortcuts, shortcutId, binding);

    if (conflictId) {
      toastManager.add({
        title: t("conflict", { action: tActions(conflictId) }),
        type: "error",
      });
      setEditingShortcutId(null);
      return;
    }

    mutation.mutate({
      ...shortcuts,
      [shortcutId]: binding,
    });
    setEditingShortcutId(null);
  };

  const hotkeyRecorder = useHotkeyRecorder({
    ignoreInputs: false,
    onCancel: () => setEditingShortcutId(null),
    onRecord: (hotkey) => {
      if (editingShortcutId) {
        saveShortcut(editingShortcutId, hotkey);
      }
    },
  });

  const sequenceRecorder = useHotkeySequenceRecorder({
    ignoreInputs: false,
    onCancel: () => setEditingShortcutId(null),
    onRecord: (sequence) => {
      if (!editingShortcutId) {
        return;
      }

      if (sequence.length < 2) {
        toastManager.add({ title: t("sequenceTooShort"), type: "error" });
        setEditingShortcutId(null);
        return;
      }

      saveShortcut(editingShortcutId, sequence);
    },
  });

  const cancelActiveRecording = () => {
    if (hotkeyRecorder.isRecording) {
      hotkeyRecorder.cancelRecording();
    }
    if (sequenceRecorder.isRecording) {
      sequenceRecorder.cancelRecording();
    }
    setEditingShortcutId(null);
  };

  const resetShortcut = (shortcutId: KeyboardShortcutId) => {
    mutation.mutate({
      ...shortcuts,
      [shortcutId]: getDefaultKeyboardShortcutBinding(shortcutId),
    });
  };

  const hasCustomShortcuts = keyboardShortcutIds.some(
    (shortcutId) =>
      !keyboardShortcutBindingsEqual(
        shortcuts[shortcutId],
        keyboardShortcutDefinitions[shortcutId].defaultBinding,
      ),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y rounded-xl border">
          {keyboardShortcutIds.map((shortcutId) => {
            const definition = keyboardShortcutDefinitions[shortcutId];
            const isEditing =
              editingShortcutId === shortcutId &&
              (definition.kind === "hotkey"
                ? hotkeyRecorder.isRecording
                : sequenceRecorder.isRecording);
            const isCustom = !keyboardShortcutBindingsEqual(
              shortcuts[shortcutId],
              definition.defaultBinding,
            );
            const recordingBinding =
              definition.kind === "sequence" && sequenceRecorder.steps.length > 0
                ? sequenceRecorder.steps
                : null;

            return (
              <div
                key={shortcutId}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{tActions(shortcutId)}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-32 justify-center"
                    disabled={mutation.isPending}
                    onBlur={() => {
                      if (isEditing) {
                        cancelActiveRecording();
                      }
                    }}
                    onClick={() => {
                      cancelActiveRecording();
                      setEditingShortcutId(shortcutId);
                      if (definition.kind === "hotkey") {
                        hotkeyRecorder.startRecording();
                      } else {
                        sequenceRecorder.startRecording();
                      }
                    }}
                  >
                    {isEditing ? (
                      recordingBinding ? (
                        <kbd className="font-mono text-xs">
                          {formatShortcutBinding(recordingBinding, platform)}
                        </kbd>
                      ) : (
                        t(definition.kind === "sequence" ? "recordingSequence" : "recording")
                      )
                    ) : (
                      <kbd className="font-mono text-xs">
                        {formatShortcutBinding(shortcuts[shortcutId], platform)}
                      </kbd>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!isCustom || mutation.isPending}
                    aria-label={t("resetAction", {
                      action: tActions(shortcutId),
                    })}
                    onClick={() => resetShortcut(shortcutId)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">{t("hint")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={!hasCustomShortcuts || mutation.isPending}
            onClick={() => mutation.mutate({})}
          >
            <RotateCcw className="h-4 w-4" />
            {tCommon("reset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
