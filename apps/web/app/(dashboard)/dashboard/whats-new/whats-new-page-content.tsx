"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { CheckCheck, Sparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { usePostHog } from "posthog-js/react";

import { Button, Card, Separator } from "@louez/ui";

import { DashboardEmptyState } from "@/components/dashboard/shared/dashboard-empty-state";
import { useWhatsNew } from "@/hooks/use-whats-new";
import {
  productAnalyticsEvents,
  whatsNewAnalyticsBaseProperties,
} from "@/lib/product-analytics/analytics-events";

import {
  countWhatsNewByFilter,
  groupWhatsNewByMonth,
  type WhatsNewFilter,
} from "./util.whats-new-page";
import { WhatsNewEntryCard } from "./whats-new-entry-card";
import { WhatsNewFilters } from "./whats-new-filters";

export const WhatsNewPageContent = () => {
  const t = useTranslations("dashboard.whatsNew");
  const format = useFormatter();
  const posthog = usePostHog();
  const { announcements, markAllSeen, unseenCount, unseenIds } = useWhatsNew();
  const hasTrackedView = useRef(false);
  // Starts on `all` so a `#<id>` deep link always resolves.
  const [filter, setFilter] = useState<WhatsNewFilter>("all");
  // Landing on the changelog does not mark anything read: an entry is read
  // when it is opened, or when it is dismissed from here.
  const unread = useMemo(() => new Set(unseenIds), [unseenIds]);

  const counts = useMemo(() => countWhatsNewByFilter(announcements), [announcements]);

  const groups = useMemo(
    () =>
      groupWhatsNewByMonth(
        filter === "all"
          ? announcements
          : announcements.filter((announcement) => announcement.category === filter),
      ),
    [announcements, filter],
  );

  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;

    posthog.capture(productAnalyticsEvents.whatsNewListViewed, {
      ...whatsNewAnalyticsBaseProperties,
      announcement_count: announcements.length,
      unseen_count: unseenCount,
    });
  }, [announcements.length, posthog, unseenCount]);

  // Which entries put their demo on the left. Only entries that actually carry
  // media are counted, and the tally runs across month sections: a text-only
  // entry between two demos must not flip the rhythm, and neither must the
  // boundary between two months.
  const mediaLeadingIds = useMemo(() => {
    const ids = new Set<string>();
    let seen = 0;

    for (const group of groups) {
      for (const announcement of group.announcements) {
        if (!announcement.media) continue;
        if (seen % 2 === 1) ids.add(announcement.id);
        seen += 1;
      }
    }

    return ids;
  }, [groups]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <WhatsNewFilters counts={counts} onValueChange={setFilter} value={filter} />
        </div>
        {unread.size > 0 && (
          <Button onClick={markAllSeen} size="sm" variant="outline">
            <CheckCheck className="size-4" />
            {t("markAllAsRead")}
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <Card>
          <DashboardEmptyState
            description={t(filter === "all" ? "empty" : "filterEmpty")}
            icon={Sparkles}
            title={t("emptyTitle")}
          />
        </Card>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {format.dateTime(group.date, { month: "long", year: "numeric" })}
              </h2>
              <div className="mt-4 space-y-0">
                {group.announcements.map((announcement, index) => (
                  <Fragment key={announcement.id}>
                    <WhatsNewEntryCard
                      announcement={announcement}
                      isMediaLeading={mediaLeadingIds.has(announcement.id)}
                      isUnread={unread.has(announcement.id)}
                    />
                    {index < group.announcements.length - 1 && <Separator className="my-2" />}
                  </Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
