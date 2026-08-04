"use client";

import * as React from "react";

import { BellRing, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle, Button, toastManager } from "@louez/ui";

import { usePushSubscription } from "@/hooks/use-push-subscription";

const DISMISS_KEY = "louez:push-primer-dismissed-at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days

/**
 * Dismissible sidebar nudge to enable push notifications when the current
 * device supports them and is not subscribed yet. Pairs with the manage card
 * in Settings → Notifications.
 */
export const PushPrimer = () => {
  const t = useTranslations("dashboard.settings.notifications.push");
  const tInstall = useTranslations("dashboard.installPrompt");
  const { state, busy, enable } = usePushSubscription();
  const [dismissed, setDismissed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      const at = raw ? Number(raw) : 0;
      setDismissed(Boolean(at) && Date.now() - at < DISMISS_TTL_MS);
    } catch {
      setDismissed(false);
    }
  }, []);

  // Only nudge when push can be enabled here and now (not iOS-needs-install,
  // not denied, not already on). Null until resolved to avoid any flash.
  if (state !== "prompt" || dismissed !== false) return null;

  const handleEnable = async () => {
    const ok = await enable();
    if (!ok) return;
    toastManager.add({ title: t("confirmTitle"), type: "success" });
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(t("confirmTitle"), {
        body: t("confirmBody"),
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      });
    } catch {
      /* already confirmed via toast */
    }
  };

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode — just hide for this session */
    }
    setDismissed(true);
  };

  return (
    <Alert
      variant="info"
      className="grid-cols-[1rem_1fr] gap-x-2 pr-9 group-data-[collapsible=icon]:hidden"
    >
      <BellRing />
      <AlertTitle className="leading-tight">{t("title")}</AlertTitle>
      <AlertDescription className="text-xs leading-snug">
        <p>{t("description")}</p>
        <Button size="sm" className="w-full" onClick={handleEnable} isPending={busy}>
          {t("enable")}
        </Button>
      </AlertDescription>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDismiss}
        aria-label={tInstall("close")}
        className="text-muted-foreground hover:text-foreground absolute top-1.5 right-1.5 size-7"
      >
        <X className="size-3.5" />
      </Button>
    </Alert>
  );
};
