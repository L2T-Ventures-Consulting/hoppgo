"use client";

import { MessagesSquare, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";
import { DashboardListRow } from "@/components/dashboard/shared/dashboard-list-row";

interface ChatDiscoveryCardProps {
  variant: "advisor" | "voice";
  /** Plan gate: with access the row invites activation, without it an upgrade. */
  hasAccess: boolean;
}

/**
 * Quiet pointer to a customer-facing AI surface (web advisor / voice agent)
 * that is not enabled yet — what remains of the retired marketing hero, now a
 * plain dashboard list row under the chat's action chips. It must never weigh
 * more than the chips themselves, hence the shared row shape rather than a
 * card of its own. Reuses the hero's translated value props so the pitch stays
 * identical everywhere it appears.
 */
export const ChatDiscoveryCard = ({ variant, hasAccess }: ChatDiscoveryCardProps) => {
  const t = useTranslations("dashboard.aiAssistant.hero");
  const icon = variant === "voice" ? PhoneCall : MessagesSquare;
  const href = hasAccess
    ? variant === "voice"
      ? "/dashboard/ai-assistant/voice"
      : "/dashboard/ai-assistant/advisor"
    : "/dashboard/subscription";

  return (
    <DashboardListRow
      href={href}
      leading={<DashboardIconTile icon={icon} accent="neutral" size="sm" />}
      title={<span className="truncate font-medium">{t(`${variant}.title`)}</span>}
      subtitle={<span className="truncate">{t(`${variant}.b1`)}</span>}
      // Phones have no room for the gate label next to a truncated pitch; the
      // chevron carries the affordance there.
      meta={
        <span className="text-muted-foreground text-xs font-medium max-sm:hidden">
          {hasAccess ? t("activate") : t("upgrade")}
        </span>
      }
    />
  );
};
