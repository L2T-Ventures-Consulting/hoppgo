"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  ChevronLeft,
  ChevronRight,
  History,
  ImagePlus,
  MessagesSquare,
  Phone,
  PhoneCall,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTab,
} from "@louez/ui";

import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";
import { DashboardSectionCard } from "@/components/dashboard/shared/dashboard-section-card";

import { formatCredits, secondsToMinutes } from "./credits-format";

export type AiCreditsUsageRow = {
  id: string;
  kind: "usage" | "number_rental" | "image_enhancement";
  conversationId: string | null;
  credits: number;
  audioSeconds: number;
  createdAt: string;
};

export type AiCreditsPurchaseRow = {
  id: string;
  type: "grant" | "topup" | "auto_topup" | "adjustment";
  credits: number;
  amountCents: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
};

export type AiCreditsHistoryTab = "usage" | "purchases";

interface AiCreditsHistoryProps {
  tab: AiCreditsHistoryTab;
  usage: AiCreditsUsageRow[];
  usageTotal: number;
  page: number;
  pageSize: number;
  purchases: AiCreditsPurchaseRow[];
}

const STATUS_VARIANT: Record<AiCreditsPurchaseRow["status"], "success" | "pending" | "failed"> = {
  completed: "success",
  pending: "pending",
  failed: "failed",
};

/**
 * The wallet's two ledgers side by side: what was spent (with a way back into
 * the conversation that spent it) and what was bought. Paging lives in the URL
 * so a shared or reloaded link lands on the same page of the same tab.
 */
export const AiCreditsHistory = ({
  tab,
  usage,
  usageTotal,
  page,
  pageSize,
  purchases,
}: AiCreditsHistoryProps) => {
  const t = useTranslations("dashboard.aiCredits");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();

  const totalPages = Math.max(1, Math.ceil(usageTotal / pageSize));

  const hrefFor = (nextTab: AiCreditsHistoryTab, nextPage: number) =>
    `${pathname}?tab=${nextTab}${nextPage > 1 ? `&page=${nextPage}` : ""}`;

  const handleTabChange = (value: unknown) => {
    if (value === "usage" || value === "purchases") {
      router.replace(hrefFor(value, 1), { scroll: false });
    }
  };

  const describeUsage = (
    row: AiCreditsUsageRow,
  ): { icon: ComponentType<{ className?: string }>; label: string; detail?: string } => {
    if (row.kind === "number_rental") {
      return { icon: Phone, label: t("page.usageNumberRental") };
    }
    if (row.kind === "image_enhancement") {
      return { icon: ImagePlus, label: t("page.usageImageEnhancement") };
    }
    if (row.audioSeconds > 0) {
      return {
        icon: PhoneCall,
        label: t("page.usageVoiceCall"),
        detail: t("page.usageCallDuration", { minutes: secondsToMinutes(row.audioSeconds) }),
      };
    }
    return { icon: MessagesSquare, label: t("page.usageConversation") };
  };

  return (
    <DashboardSectionCard
      title={t("page.historyTitle")}
      description={t("page.historyDescription")}
      icon={History}
      accent="neutral"
      contentClassName="space-y-4"
    >
      <>
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="w-full sm:w-auto">
            <TabsTab value="usage" className="flex-1 sm:flex-none">
              {t("page.tabUsage")}
            </TabsTab>
            <TabsTab value="purchases" className="flex-1 sm:flex-none">
              {t("page.tabPurchases")}
            </TabsTab>
          </TabsList>
        </Tabs>

        {tab === "usage" ? (
          usage.length === 0 ? (
            <DashboardEmptyState
              icon={MessagesSquare}
              title={t("page.usageEmpty")}
              description={t("page.usageEmptyDescription")}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("page.columnDate")}</TableHead>
                      <TableHead>{t("page.columnDetail")}</TableHead>
                      <TableHead className="text-right">{t("page.columnCredits")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.map((row) => {
                      const { icon: Icon, label, detail } = describeUsage(row);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                            {format.dateTime(new Date(row.createdAt), {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                              <div className="min-w-0">
                                {row.conversationId ? (
                                  <Link
                                    href={`/dashboard/ai-assistant?conversation=${row.conversationId}`}
                                    className="hover:text-primary truncate text-sm font-medium underline-offset-4 hover:underline"
                                  >
                                    {label}
                                  </Link>
                                ) : (
                                  <p className="truncate text-sm font-medium">{label}</p>
                                )}
                                {detail && (
                                  <p className="text-muted-foreground truncate text-xs tabular-nums">
                                    {detail}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            −{formatCredits(row.credits)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {usageTotal > pageSize && (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    {t("page.pagination", { page, totalPages })}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t("page.previousPage")}
                      disabled={page <= 1}
                      render={page > 1 ? <Link href={hrefFor("usage", page - 1)} /> : undefined}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t("page.nextPage")}
                      disabled={page >= totalPages}
                      render={
                        page < totalPages ? <Link href={hrefFor("usage", page + 1)} /> : undefined
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
        ) : purchases.length === 0 ? (
          <DashboardEmptyState
            icon={History}
            title={t("page.purchasesEmpty")}
            description={t("page.purchasesEmptyDescription")}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("page.columnDate")}</TableHead>
                  <TableHead>{t("page.columnDetail")}</TableHead>
                  <TableHead className="text-right">{t("page.columnCredits")}</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    {t("page.columnAmount")}
                  </TableHead>
                  <TableHead className="text-right">{t("page.columnStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {format.dateTime(new Date(row.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {t(`history.type.${row.type}`)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      +{formatCredits(row.credits)}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-right text-sm tabular-nums sm:table-cell">
                      {row.amountCents > 0
                        ? format.number(row.amountCents / 100, {
                            style: "currency",
                            currency: row.currency.toUpperCase(),
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={STATUS_VARIANT[row.status]}>
                        {t(`page.status.${row.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    </DashboardSectionCard>
  );
};
