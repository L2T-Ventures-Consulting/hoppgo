"use client";

import { useState } from "react";

import { Check, Crop, Eraser, ImageIcon, Trash2, WandSparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { ProductImageHistory } from "@louez/types";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@louez/ui";
import { cn } from "@louez/utils";

interface ProductImageHistoryDrawerProps {
  open: boolean;
  currentUrl: string;
  history: ProductImageHistory | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  onDelete: (versionId: string) => void;
}

export const ProductImageHistoryDrawer = ({
  open,
  currentUrl,
  history,
  onOpenChange,
  onSelect,
  onDelete,
}: ProductImageHistoryDrawerProps) => {
  const t = useTranslations("dashboard.products.form");
  const format = useFormatter();
  const versions = [...(history?.versions ?? [])].reverse();
  const [versionToDeleteId, setVersionToDeleteId] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setVersionToDeleteId(null);
    onOpenChange(nextOpen);
  };

  const handleDelete = () => {
    if (!versionToDeleteId) return;
    onDelete(versionToDeleteId);
    setVersionToDeleteId(null);
  };

  return (
    <>
      <Drawer position="right" open={open} onOpenChange={handleOpenChange}>
        <DrawerPopup variant="inset" className="max-w-lg" showCloseButton>
          <DrawerHeader>
            <DrawerTitle>{t("imageHistoryTitle")}</DrawerTitle>
            <DrawerDescription>{t("imageHistoryDescription")}</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel className="space-y-3">
            {versions.map((version) => {
              const isCurrent = version.url === currentUrl;
              const label =
                version.kind === "cropped"
                  ? t("imageHistoryCropped")
                  : version.kind === "ai-enhanced"
                    ? t("imageHistoryAiEnhanced")
                    : version.kind === "background-removed"
                      ? t("imageHistoryBackgroundRemoved")
                      : t("imageHistoryOriginal");

              return (
                <div
                  key={version.id}
                  className={cn(
                    "group/history flex w-full items-stretch rounded-xl border transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40 hover:bg-accent/50",
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={isCurrent}
                    onClick={() => onSelect(version.url)}
                    className="focus-visible:ring-ring grid min-w-0 flex-1 grid-cols-[7rem_1fr] gap-3 rounded-xl p-2 text-left focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="bg-muted relative aspect-4/3 overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={version.url}
                        alt={label}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover/history:scale-[1.02] motion-reduce:transition-none"
                      />
                    </span>
                    <span className="flex min-w-0 flex-col justify-center gap-1.5 py-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                          {version.kind === "cropped" ? (
                            <Crop className="text-muted-foreground size-4 shrink-0" />
                          ) : version.kind === "ai-enhanced" ? (
                            <WandSparkles className="text-muted-foreground size-4 shrink-0" />
                          ) : version.kind === "background-removed" ? (
                            <Eraser className="text-muted-foreground size-4 shrink-0" />
                          ) : (
                            <ImageIcon className="text-muted-foreground size-4 shrink-0" />
                          )}
                          <span className="truncate">{label}</span>
                        </span>
                        {isCurrent ? (
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <Check className="size-3" />
                            {t("imageHistoryCurrent")}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {version.createdAt
                          ? format.dateTime(new Date(version.createdAt), {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : t("imageHistoryInitialVersion")}
                      </span>
                      {!isCurrent ? (
                        <span className="text-primary text-xs font-medium">
                          {t("imageHistoryUseVersion")}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {versions.length > 1 ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${t("imageHistoryDeleteVersion")} — ${label}`}
                      onClick={() => setVersionToDeleteId(version.id)}
                      className="text-muted-foreground hover:text-destructive my-auto mr-2 shrink-0"
                    >
                      <Trash2 data-slot="icon" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>

      <AlertDialog
        open={versionToDeleteId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setVersionToDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("imageHistoryDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("imageHistoryDeleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              {t("imageHistoryDeleteCancel")}
            </AlertDialogClose>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              {t("imageHistoryDeleteConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
