"use client";

import * as React from "react";

import { BellRing, MonitorSmartphone, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Button,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  toastManager,
} from "@louez/ui";
import { NotificationsGlassIcon } from "@louez/ui/icons/glass";

import { PromptBenefits } from "@/components/dashboard/prompt-benefits";
import { SidebarPromptItem } from "@/components/dashboard/sidebar-prompt-item";

import { usePushSubscription } from "@/hooks/use-push-subscription";

const DISMISS_KEY = "louez:push-primer-dismissed-at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days

/**
 * Sidebar nudge to enable push notifications when the current device supports
 * them and is not subscribed yet. The row is one line; the case for turning
 * them on lives in the dialog it opens. Pairs with the manage card in
 * Settings → Notifications.
 */
export const PushPrimer = () => {
  const t = useTranslations("dashboard.settings.notifications.push");
  const tInstall = useTranslations("dashboard.installPrompt");
  const tErrors = useTranslations("errors");
  const { state, busy, enable } = usePushSubscription();
  const [dismissed, setDismissed] = React.useState<boolean | null>(null);
  const [open, setOpen] = React.useState(false);

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
    if (!ok) {
      toastManager.add({ title: tErrors("generic"), type: "error" });
      return;
    }
    setOpen(false);
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
    setOpen(false);
    setDismissed(true);
  };

  return (
    <>
      <SidebarPromptItem
        icon={NotificationsGlassIcon}
        label={t("sidebarLabel")}
        onOpen={() => setOpen(true)}
        onDismiss={handleDismiss}
        dismissLabel={tInstall("close")}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <PromptBenefits
              items={[
                { icon: BellRing, label: t("benefits.instant") },
                { icon: PowerOff, label: t("benefits.closed") },
                { icon: MonitorSmartphone, label: t("benefits.device") },
              ]}
            />
          </DialogPanel>
          {/* No toolbar band on a promo sheet: the actions sit on the sheet
              surface. Mobile stacks them full-width (DialogFooter); desktop
              keeps dismiss-left / commit-right. */}
          <DialogFooter variant="bare" className="sm:justify-between">
            <DialogClose render={<Button variant="tertiary" />} onClick={handleDismiss}>
              {tInstall("later")}
            </DialogClose>
            <Button onClick={handleEnable} isPending={busy}>
              <BellRing />
              {t("enable")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
};
