"use client";

import { useCallback, useContext, useMemo } from "react";

import { WhatsNewContext } from "@/components/shared/whats-new-provider";

import {
  parseWhatsNewDate,
  WHATS_NEW_ANNOUNCEMENTS,
  WHATS_NEW_FEATURE_TTL_MS,
  type WhatsNewAnnouncement,
} from "@/lib/whats-new.constants";

function isWithinBadgeWindow(announcement: WhatsNewAnnouncement): boolean {
  const shippedAt = parseWhatsNewDate(announcement.date).getTime();
  return Number.isFinite(shippedAt) && Date.now() - shippedAt < WHATS_NEW_FEATURE_TTL_MS;
}

export interface UseWhatsNew {
  announcements: WhatsNewAnnouncement[];
  dismissFeature: (featureId: string) => void;
  /** `false` once dismissed, and once the 30-day window closed. */
  isFeatureNew: (featureId: string) => boolean;
  /** Marks the whole changelog read — the sidebar counter drops to zero. */
  markAllSeen: () => void;
  /** Marks a single entry read, e.g. when its own page is opened. */
  markSeen: (announcementId: string) => void;
  unseenCount: number;
  /** Ids of the announcements still unread, newest first. */
  unseenIds: string[];
}

/**
 * Reading state of the current user's changelog. Backed by the account (see
 * `WhatsNewProvider`), so what counts as unread follows the user rather than
 * the browser they happen to be signed in on.
 */
export function useWhatsNew(): UseWhatsNew {
  const context = useContext(WhatsNewContext);
  if (!context) {
    throw new Error("useWhatsNew must be used within a WhatsNewProvider.");
  }

  const { dismissFeature, isFeatureDismissed, markSeen, unseenIds } = context;

  const markAllSeen = useCallback(() => {
    markSeen(WHATS_NEW_ANNOUNCEMENTS.map((announcement) => announcement.id));
  }, [markSeen]);

  const markOneSeen = useCallback(
    (announcementId: string) => markSeen([announcementId]),
    [markSeen],
  );

  const isFeatureNew = useCallback(
    (featureId: string) => {
      if (isFeatureDismissed(featureId)) return false;
      const announcement = WHATS_NEW_ANNOUNCEMENTS.find((item) => item.featureId === featureId);
      return announcement !== undefined && isWithinBadgeWindow(announcement);
    },
    [isFeatureDismissed],
  );

  return useMemo(
    () => ({
      announcements: WHATS_NEW_ANNOUNCEMENTS,
      dismissFeature,
      isFeatureNew,
      markAllSeen,
      markSeen: markOneSeen,
      unseenCount: unseenIds.length,
      unseenIds,
    }),
    [dismissFeature, isFeatureNew, markAllSeen, markOneSeen, unseenIds],
  );
}
