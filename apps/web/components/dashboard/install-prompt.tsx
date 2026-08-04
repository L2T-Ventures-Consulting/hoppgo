"use client";

import * as React from "react";

import { BellRing, Check, Download, EllipsisVertical, Maximize2, SquarePlus } from "lucide-react";
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
import { InstallAppGlassIcon } from "@louez/ui/icons/glass";

import { PromptBenefits } from "@/components/dashboard/prompt-benefits";
import { SidebarPromptItem } from "@/components/dashboard/sidebar-prompt-item";

import { useInstallPrompt } from "@/hooks/use-install-prompt";

/** iOS has no install API, so the dialog walks through the manual steps. */
const IosSteps = ({ safari }: { safari: boolean }) => {
  const t = useTranslations("dashboard.installPrompt.ios");

  const steps = [
    {
      icon: safari ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M12 3v12" />
          <path d="m8 7 4-4 4 4" />
          <path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
        </svg>
      ) : (
        <EllipsisVertical className="size-4" />
      ),
      label: safari ? t("step1") : t("step1Other"),
    },
    { icon: <SquarePlus className="size-4" />, label: t("step2") },
    { icon: <Check className="size-4" />, label: t("step3") },
  ];

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-3 text-sm">
          <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {index + 1}
          </span>
          <span className="text-muted-foreground shrink-0">{step.icon}</span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
};

/**
 * Sidebar nudge to install the PWA. The row carries the offer in one line and
 * the dialog carries everything else — the benefits, and on iOS the manual
 * "Add to Home Screen" steps that have no programmatic equivalent.
 */
export const InstallPrompt = () => {
  const t = useTranslations("dashboard.installPrompt");
  const { status, promptInstall, dismiss } = useInstallPrompt();
  const [installing, setInstalling] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setOpen(false);
        toastManager.add({ title: t("installedToast"), type: "success" });
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setOpen(false);
    dismiss();
  };

  if (status === "hidden") return null;

  const isActionable = status === "android" || status === "desktop";
  const isWebview = status === "in-app";
  const showIosSteps = status === "ios-safari" || status === "ios-other";

  return (
    <>
      <SidebarPromptItem
        icon={InstallAppGlassIcon}
        label={t("sidebarLabel")}
        onOpen={() => setOpen(true)}
        onDismiss={handleDismiss}
        dismissLabel={t("close")}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{showIosSteps ? t("ios.title") : t("title")}</DialogTitle>
            <DialogDescription>{isWebview ? t("inApp") : t("subtitle")}</DialogDescription>
          </DialogHeader>
          {/* A webview can't install at all: the description is the whole
              answer, so there is nothing to put in the panel. */}
          {!isWebview && (
            <DialogPanel>
              {showIosSteps ? (
                <IosSteps safari={status === "ios-safari"} />
              ) : (
                <PromptBenefits
                  items={[
                    { icon: SquarePlus, label: t("benefits.home") },
                    { icon: Maximize2, label: t("benefits.fullscreen") },
                    { icon: BellRing, label: t("benefits.push") },
                  ]}
                />
              )}
            </DialogPanel>
          )}
          {/* Dismiss on the left, commit on the right — the row never reverses,
              not even stacked on mobile. */}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <DialogClose render={<Button variant="ghost" />} onClick={handleDismiss}>
              {t("later")}
            </DialogClose>
            {isActionable && (
              <Button onClick={handleInstall} isPending={installing}>
                <Download />
                {t("install")}
              </Button>
            )}
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
};
