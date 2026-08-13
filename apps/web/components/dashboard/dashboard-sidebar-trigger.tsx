"use client";

import { useTranslations } from "next-intl";

import {
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useSidebar,
} from "@louez/ui";

import { useTrackedKeyboardHotkey } from "@/hooks/use-tracked-keyboard-shortcut";

export const DashboardSidebarTrigger = () => {
  const t = useTranslations("dashboard.shortcuts.actions");
  const { toggleSidebar } = useSidebar();

  const shortcut = useTrackedKeyboardHotkey("sidebar", toggleSidebar, {
    meta: {
      name: t("sidebar"),
    },
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<SidebarTrigger className="-ml-1 shrink-0" aria-label={t("sidebar")} />}
        />
        <TooltipContent className="flex items-center gap-3">
          <span>{t("sidebar")}</span>
          <kbd className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
            {shortcut.label}
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
