"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { useTrackedKeyboardHotkey } from "@/hooks/use-tracked-keyboard-shortcut";

export const DashboardThemeShortcut = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("dashboard.shortcuts.actions");

  useTrackedKeyboardHotkey(
    "toggleTheme",
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    {
      ignoreInputs: true,
      meta: {
        name: t("toggleTheme"),
      },
    },
  );

  return null;
};
