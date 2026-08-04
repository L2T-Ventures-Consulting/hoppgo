import { z } from "zod";

import { WHATS_NEW_ANNOUNCEMENTS } from "@/lib/whats-new.constants";

/**
 * What a user has already read. Persisted on `users.whats_new_progress` rather
 * than in `localStorage`, so the unread markers follow the account across
 * browsers and devices instead of being shared by everyone signing in on the
 * same machine.
 */
export const whatsNewProgressSchema = z
  .object({
    /** Feature ids whose contextual "New" badge was clicked away. */
    dismissedFeatureIds: z.array(z.string()).default([]),
    /** Announcement ids the user has been shown at least once. */
    seenIds: z.array(z.string()).default([]),
  })
  .strict();

export type WhatsNewProgress = z.infer<typeof whatsNewProgressSchema>;

export const EMPTY_WHATS_NEW_PROGRESS: WhatsNewProgress = {
  dismissedFeatureIds: [],
  seenIds: [],
};

/** A never-touched column, or a shape written by an older release, reads as empty. */
export const parseWhatsNewProgress = (value: unknown): WhatsNewProgress => {
  const result = whatsNewProgressSchema.safeParse(value);
  return result.success ? result.data : EMPTY_WHATS_NEW_PROGRESS;
};

/**
 * Ids retired from `WHATS_NEW_ANNOUNCEMENTS` are dropped on the way in, so the
 * stored arrays can never grow past the number of live announcements.
 */
export const keepKnownAnnouncementIds = (ids: string[]): string[] => {
  const known = new Set(WHATS_NEW_ANNOUNCEMENTS.map((announcement) => announcement.id));
  return ids.filter((id) => known.has(id));
};

/** Same guard for the contextual badges, keyed by `featureId`. */
export const keepKnownFeatureIds = (featureIds: string[]): string[] => {
  const known = new Set(
    WHATS_NEW_ANNOUNCEMENTS.map((announcement) => announcement.featureId).filter(
      (featureId): featureId is string => featureId !== undefined,
    ),
  );
  return featureIds.filter((featureId) => known.has(featureId));
};

/** Announcements the user has never been shown, newest first. */
export const getUnseenAnnouncementIds = (seenIds: string[]): string[] => {
  const seen = new Set(seenIds);
  return WHATS_NEW_ANNOUNCEMENTS.filter((announcement) => !seen.has(announcement.id)).map(
    (announcement) => announcement.id,
  );
};
