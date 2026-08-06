"use client";

import { useTranslations } from "next-intl";

import type { DetailedDuration } from "../types";

/**
 * Human-readable rental length ("2 jours, 5 heures"), shared by every recap
 * surface so the summary panel and the confirmation sheet never disagree.
 * Falls back to whole days when the breakdown is unavailable or rounds to
 * nothing.
 */
export function useReservationDurationLabel(
  detailedDuration: DetailedDuration | null,
  duration: number,
): string {
  const t = useTranslations("dashboard.reservations.manualForm");
  const fallback = t("durationDays", { count: duration });

  if (!detailedDuration) {
    return fallback;
  }

  const parts = [
    detailedDuration.days > 0 && t("durationDays", { count: detailedDuration.days }),
    detailedDuration.hours > 0 && t("durationHours", { count: detailedDuration.hours }),
    // Minutes only carry the label when they are the whole story.
    detailedDuration.days === 0 &&
      detailedDuration.hours === 0 &&
      detailedDuration.minutes > 0 &&
      `${detailedDuration.minutes} min`,
  ].filter(Boolean);

  return parts.join(", ") || fallback;
}
