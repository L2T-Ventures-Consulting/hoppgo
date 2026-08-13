"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, users } from "@louez/db";

import { auth } from "@/lib/auth";
import {
  keepKnownAnnouncementIds,
  keepKnownFeatureIds,
  parseWhatsNewProgress,
  type WhatsNewProgress,
} from "@/lib/whats-new.progress";

const announcementIdsSchema = z.array(z.string()).max(100);
const featureIdSchema = z.string().min(1).max(64);

/**
 * Reads the stored progress, merges the new ids in and writes it back. Merging
 * server-side (rather than letting the client send the whole object) keeps a
 * second tab from erasing what the first one just marked as read.
 */
async function persistWhatsNewProgress(
  userId: string,
  merge: (current: WhatsNewProgress) => WhatsNewProgress,
) {
  const row = await db.query.users.findFirst({
    columns: { whatsNewProgress: true },
    where: eq(users.id, userId),
  });

  await db
    .update(users)
    .set({
      updatedAt: new Date(),
      whatsNewProgress: merge(parseWhatsNewProgress(row?.whatsNewProgress)),
    })
    .where(eq(users.id, userId));
}

/** Called when the changelog is opened, and when a single entry is read. */
export async function markWhatsNewAnnouncementsSeen(announcementIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false as const, error: "errors.unauthorized" };
  }

  const parsed = announcementIdsSchema.safeParse(announcementIds);
  if (!parsed.success) {
    return { success: false as const, error: "errors.invalidData" };
  }

  const seenIds = keepKnownAnnouncementIds(parsed.data);
  if (seenIds.length === 0) {
    return { success: true as const };
  }

  await persistWhatsNewProgress(session.user.id, (current) => ({
    ...current,
    seenIds: [...new Set([...current.seenIds, ...seenIds])],
  }));

  return { success: true as const };
}

/** Called when a contextual `NewFeatureBadge` is clicked away. */
export async function dismissWhatsNewFeature(featureId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false as const, error: "errors.unauthorized" };
  }

  const parsed = featureIdSchema.safeParse(featureId);
  if (!parsed.success) {
    return { success: false as const, error: "errors.invalidData" };
  }

  const dismissedFeatureIds = keepKnownFeatureIds([parsed.data]);
  if (dismissedFeatureIds.length === 0) {
    return { success: true as const };
  }

  await persistWhatsNewProgress(session.user.id, (current) => ({
    ...current,
    dismissedFeatureIds: [...new Set([...current.dismissedFeatureIds, ...dismissedFeatureIds])],
  }));

  return { success: true as const };
}
