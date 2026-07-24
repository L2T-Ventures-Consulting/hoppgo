"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Mail,
  FileText,
  MoreHorizontal,
  Printer,
  Copy,
  ExternalLink,
  Check,
  Pencil,
  Loader2,
} from "lucide-react";
import { toastManager } from "@louez/ui";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@louez/ui";
import { Badge } from "@louez/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@louez/ui";

import { PaymentStatusBadge } from "./payment-status-badge";
import { SendEmailModal } from "./send-email-modal";
import { STATUS_CONFIG } from "../reservations-utils";
import { generateAccessUrl } from "@/app/(dashboard)/dashboard/reservations/actions";
import { getDashboardReservationBackHref } from "@/lib/dashboard/util.reservation-navigation";

type ReservationStatus =
  | "pending"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "rejected"
  | "quote"
  | "declined";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ReservationHeaderProps {
  reservationId: string;
  reservationNumber: string;
  status: ReservationStatus;
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  customer: Customer;
  storeSlug: string;
  // Payment data
  rentalAmount: number;
  rentalPaid: number;
  depositAmount: number;
  depositCollected: number;
  depositReturned: number;
  totalAmount: number;
  // Optional
  sentEmails?: string[];
  currency?: string;
}

export function ReservationHeader({
  reservationId,
  reservationNumber,
  status,
  createdAt: _createdAt,
  startDate: _startDate,
  endDate: _endDate,
  customer,
  storeSlug: _storeSlug,
  rentalAmount,
  rentalPaid,
  depositAmount,
  depositCollected,
  depositReturned,
  totalAmount: _totalAmount,
  sentEmails = [],
  currency: _currency = "EUR",
}: ReservationHeaderProps) {
  const t = useTranslations("dashboard.reservations");
  const tCommon = useTranslations("common");

  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = getDashboardReservationBackHref(searchParams.get("returnTo"));

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const isFullyPaid =
    rentalPaid >= rentalAmount && (depositAmount === 0 || depositCollected >= depositAmount);
  const canEdit = !["completed", "cancelled", "rejected", "declined"].includes(status);

  const handleGenerateAccessUrl = async () => {
    setIsGeneratingLink(true);
    try {
      const result = await generateAccessUrl(reservationId);
      if ("error" in result) {
        toastManager.add({ title: t("accessLink.sendError"), type: "error" });
        return null;
      }
      return result.url;
    } catch {
      toastManager.add({ title: t("accessLink.sendError"), type: "error" });
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleViewAsCustomer = async () => {
    const url = await handleGenerateAccessUrl();
    if (url) window.open(url, "_blank");
  };

  const handleCopyLink = async () => {
    const url = await handleGenerateAccessUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toastManager.add({ title: t("linkCopied"), type: "success" });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadContract = () => {
    window.open(`/api/reservations/${reservationId}/contract`, "_blank");
  };

  return (
    <>
      <div className="flex flex-col gap-4 pb-6 border-b">
        {/* Top row: Back button + Title + Badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              render={<Link href={backHref} />}
              variant="ghost"
              size="icon"
              className="shrink-0 -ml-2 mt-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">{tCommon("back")}</span>
            </Button>

            <div className="space-y-1">
              {/* Reservation number + Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">#{reservationNumber}</h1>
                <Badge variant={STATUS_CONFIG[status].badgeVariant} className="font-medium">
                  {t(`status.${status}`)}
                </Badge>
                <PaymentStatusBadge
                  rentalAmount={rentalAmount}
                  rentalPaid={rentalPaid}
                  depositAmount={depositAmount}
                  depositCollected={depositCollected}
                  depositReturned={depositReturned}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Email button */}
            <Button
              variant="outline"
              onClick={() => setEmailModalOpen(true)}
              className="hidden sm:flex"
            >
              <Mail className="h-4 w-4 mr-2" />
              {t("actions.sendEmail")}
            </Button>

            {/* Contract download button - always visible */}
            <Button variant="outline" onClick={handleDownloadContract} className="hidden sm:flex">
              <FileText className="h-4 w-4 mr-2" />
              {t("contract.download")}
            </Button>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="icon" className="h-9 w-9" />}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{tCommon("actions")}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Mobile-only items */}
                <DropdownMenuItem onClick={() => setEmailModalOpen(true)} className="sm:hidden">
                  <Mail className="h-4 w-4 mr-2" />
                  {t("actions.sendEmail")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadContract} className="sm:hidden">
                  <FileText className="h-4 w-4 mr-2" />
                  {t("contract.download")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="sm:hidden" />

                {/* Edit reservation */}
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/reservations/${reservationId}/edit`)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("edit.button")}
                  </DropdownMenuItem>
                )}
                {canEdit && <DropdownMenuSeparator />}

                {/* Common items */}
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  {t("actions.print")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyLink}>
                  {copiedLink ? (
                    <Check className="h-4 w-4 mr-2 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {t("actions.copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewAsCustomer} disabled={isGeneratingLink}>
                  {isGeneratingLink ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  {t("actions.viewAsCustomer")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <SendEmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        reservationId={reservationId}
        reservationNumber={reservationNumber}
        customer={customer}
        status={status}
        isFullyPaid={isFullyPaid}
        sentEmails={sentEmails}
      />
    </>
  );
}
