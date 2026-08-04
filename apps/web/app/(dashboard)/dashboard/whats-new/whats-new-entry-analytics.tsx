"use client";

import { useEffect, useRef } from "react";

import { usePostHog } from "posthog-js/react";

import {
  productAnalyticsEvents,
  whatsNewAnalyticsBaseProperties,
} from "@/lib/product-analytics/analytics-events";
import type { WhatsNewCategory } from "@/lib/whats-new.constants";

interface WhatsNewEntryAnalyticsProps {
  announcementId: string;
  category: WhatsNewCategory;
  hasCta: boolean;
  hasMedia: boolean;
  releaseDate: string;
}

/** Tracks an announcement opening and the first time its end enters the viewport. */
export const WhatsNewEntryAnalytics = ({
  announcementId,
  category,
  hasCta,
  hasMedia,
  releaseDate,
}: WhatsNewEntryAnalyticsProps) => {
  const posthog = usePostHog();
  const completionMarkerRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const hasTrackedCompletion = useRef(false);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    const properties = {
      ...whatsNewAnalyticsBaseProperties,
      announcement_id: announcementId,
      category,
      has_cta: hasCta,
      has_media: hasMedia,
      release_date: releaseDate,
    };

    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      posthog.capture(productAnalyticsEvents.whatsNewAnnouncementViewed, properties);
    }

    const marker = completionMarkerRef.current;
    if (!marker) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasTrackedCompletion.current) return;

        hasTrackedCompletion.current = true;
        posthog.capture(productAnalyticsEvents.whatsNewAnnouncementCompleted, {
          ...properties,
          completion_seconds: Math.round((Date.now() - openedAt.current) / 1000),
        });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [announcementId, category, hasCta, hasMedia, posthog, releaseDate]);

  return <div aria-hidden className="h-px w-full" ref={completionMarkerRef} />;
};
