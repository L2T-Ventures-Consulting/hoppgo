"use client";

import { useEffect } from "react";

import { useWhatsNew } from "@/hooks/use-whats-new";

/**
 * Renders nothing: it only records that an announcement has been read, so
 * opening an entry straight from a "New" badge clears it from the unread count
 * without a detour through the changelog. The detail page is a server
 * component, hence this client sliver.
 */
export const WhatsNewSeenMarker = ({ announcementId }: { announcementId: string }) => {
  const { markSeen } = useWhatsNew();

  useEffect(() => {
    markSeen(announcementId);
  }, [announcementId, markSeen]);

  return null;
};
