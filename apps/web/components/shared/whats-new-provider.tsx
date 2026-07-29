"use client";

import { createContext, useCallback, useMemo, useRef, useState } from "react";

import { log } from "evlog/next/client";

import {
  dismissWhatsNewFeature,
  markWhatsNewAnnouncementsSeen,
} from "@/app/(dashboard)/dashboard/whats-new/actions";

import { getUnseenAnnouncementIds, type WhatsNewProgress } from "@/lib/whats-new.progress";

export type WhatsNewContextValue = {
  dismissFeature: (featureId: string) => void;
  isFeatureDismissed: (featureId: string) => boolean;
  markSeen: (announcementIds: string[]) => void;
  /** Announcements the user has never been shown, newest first. */
  unseenIds: string[];
};

export const WhatsNewContext = createContext<WhatsNewContextValue | null>(null);

/**
 * Holds the current user's What's New reading state for the whole dashboard:
 * the sidebar counter, the changelog cards and every contextual
 * `NewFeatureBadge` read from here. Writes land in the UI first and are
 * persisted in the background — a read marker is not worth blocking on, and a
 * failed write only means the entry shows up unread again on the next load.
 */
export const WhatsNewProvider = ({
  children,
  initialProgress,
}: {
  children: React.ReactNode;
  initialProgress: WhatsNewProgress;
}) => {
  const [progress, setProgress] = useState(initialProgress);
  // Mirrors the state so the two callbacks below can stay referentially stable
  // while still deduplicating against what was written a moment earlier: the
  // changelog marks everything read from an effect, which must not fire a
  // second write when React re-runs it.
  const progressRef = useRef(initialProgress);

  const commit = useCallback((next: WhatsNewProgress) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  const markSeen = useCallback(
    (announcementIds: string[]) => {
      const seen = new Set(progressRef.current.seenIds);
      const missing = announcementIds.filter((id) => !seen.has(id));
      if (missing.length === 0) return;

      commit({
        ...progressRef.current,
        seenIds: [...progressRef.current.seenIds, ...missing],
      });

      void markWhatsNewAnnouncementsSeen(missing).catch((error: unknown) => {
        log.warn({ action: "whats_new_mark_seen_failed", error: String(error) });
      });
    },
    [commit],
  );

  const dismissFeature = useCallback(
    (featureId: string) => {
      if (progressRef.current.dismissedFeatureIds.includes(featureId)) return;

      commit({
        ...progressRef.current,
        dismissedFeatureIds: [...progressRef.current.dismissedFeatureIds, featureId],
      });

      void dismissWhatsNewFeature(featureId).catch((error: unknown) => {
        log.warn({ action: "whats_new_dismiss_feature_failed", error: String(error) });
      });
    },
    [commit],
  );

  const value = useMemo<WhatsNewContextValue>(
    () => ({
      dismissFeature,
      isFeatureDismissed: (featureId) => progress.dismissedFeatureIds.includes(featureId),
      markSeen,
      unseenIds: getUnseenAnnouncementIds(progress.seenIds),
    }),
    [dismissFeature, markSeen, progress],
  );

  return <WhatsNewContext.Provider value={value}>{children}</WhatsNewContext.Provider>;
};
