"use client";

import * as React from "react";

import { Check, Download, EllipsisVertical, ExternalLink, SquarePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  toastManager,
} from "@louez/ui";

import { useInstallPrompt } from "@/hooks/use-install-prompt";

export const InstallPrompt = () => {
  const t = useTranslations("dashboard.installPrompt");
  const { status, promptInstall, dismiss } = useInstallPrompt();
  const [installing, setInstalling] = React.useState(false);
  const [iosSheetOpen, setIosSheetOpen] = React.useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toastManager.add({ title: t("installedToast"), type: "success" });
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIosSheetOpen(false);
    dismiss();
  };

  if (status === "hidden") return null;

  const isActionable = status === "android" || status === "desktop";
  const isWebview = status === "in-app";
  const canShowIosSteps = status === "ios-safari" || status === "ios-other";
  const LeadIcon = isWebview ? ExternalLink : Download;

  return (
    <>
      <Alert
        variant="info"
        className="grid-cols-[1rem_1fr] gap-x-2 pr-9 group-data-[collapsible=icon]:hidden"
      >
        <LeadIcon />
        <AlertTitle className="leading-tight">{t("title")}</AlertTitle>
        <AlertDescription className="text-xs leading-snug">
          <p>{isWebview ? t("inApp") : t("subtitle")}</p>
          {isActionable && (
            <Button size="sm" className="w-full" onClick={handleInstall} isPending={installing}>
              <Download />
              {t("install")}
            </Button>
          )}
          {canShowIosSteps && (
            <Button size="sm" className="w-full" onClick={() => setIosSheetOpen(true)}>
              {t("ios.cta")}
            </Button>
          )}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          aria-label={t("close")}
          className="text-muted-foreground hover:text-foreground absolute top-1.5 right-1.5 size-7"
        >
          <X className="size-3.5" />
        </Button>
      </Alert>

      <Sheet open={iosSheetOpen} onOpenChange={setIosSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{t("ios.title")}</SheetTitle>
            <SheetDescription>{t("subtitle")}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-6 pb-8">
            <div className="flex items-center gap-3">
              <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                1
              </span>
              <span className="text-primary shrink-0">
                {status === "ios-safari" ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <path d="M12 3v12" />
                    <path d="m8 7 4-4 4 4" />
                    <path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
                  </svg>
                ) : (
                  <EllipsisVertical className="size-5" />
                )}
              </span>
              <p className="text-sm">
                {status === "ios-safari" ? t("ios.step1") : t("ios.step1Other")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                2
              </span>
              <SquarePlus className="text-primary size-5 shrink-0" />
              <p className="text-sm">{t("ios.step2")}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                3
              </span>
              <Check className="text-primary size-5 shrink-0" />
              <p className="text-sm">{t("ios.step3")}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
