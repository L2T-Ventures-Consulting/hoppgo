"use client";

import Link from "next/link";

import { Check } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge, Button } from "@louez/ui";
import { cn } from "@louez/utils";

import { useWhatsNew } from "@/hooks/use-whats-new";

import {
  getWhatsNewDetailHref,
  parseWhatsNewDate,
  WHATS_NEW_CATEGORIES,
  type WhatsNewAnnouncement,
} from "@/lib/whats-new.constants";

import { useWhatsNewAnchorId } from "./use-whats-new-anchor";
import { WhatsNewEntryThumbnail } from "./whats-new-entry-thumbnail";

interface WhatsNewEntryCardProps {
  announcement: WhatsNewAnnouncement;
  /** Never opened by this user — flagged so the feed can be scanned at a glance. */
  isUnread?: boolean;
  /** Puts the demo on the left. Alternated down the feed to break the rhythm. */
  isMediaLeading?: boolean;
}

/**
 * One changelog entry: text first, demo second. No card frame and no
 * illustration box — entries are separated by a rule, so what the reader scans
 * is the copy. `id` keeps the entry the target of the older `#<id>` deep links
 * — the router handles the scroll, and the ring highlights the entry the hash
 * points at. CSS `target:` cannot be used here: the App Router navigates with
 * `history.pushState`, which never sets the document's `:target` element.
 */
export const WhatsNewEntryCard = ({
  announcement,
  isMediaLeading = false,
  isUnread = false,
}: WhatsNewEntryCardProps) => {
  const t = useTranslations("dashboard.whatsNew");
  const format = useFormatter();
  const anchorId = useWhatsNewAnchorId();
  const { markSeen } = useWhatsNew();

  const category = WHATS_NEW_CATEGORIES[announcement.category];
  const title = t(announcement.titleKey);

  return (
    <article
      className={cn(
        "group relative isolate scroll-mt-24 rounded-2xl py-4",
        // Negative z keeps the stretch background behind copy; absolute ::after
        // would otherwise paint above in-flow children even without z-index.
        isUnread &&
          "after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:w-[calc(100%+2rem)] after:-mx-4 after:rounded-2xl after:bg-sidebar after:content-['']",
        anchorId === announcement.id && "ring-primary/60 ring-2 ring-offset-4",
      )}
      id={announcement.id}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={category.badgeVariant}>{t(category.labelKey)}</Badge>
        <time className="text-muted-foreground text-xs" dateTime={announcement.date}>
          {format.dateTime(parseWhatsNewDate(announcement.date), { dateStyle: "medium" })}
        </time>
        {isUnread && (
          /* `z-10`, not just `relative`: the title's stretch overlay comes
             later in the DOM and would otherwise paint over this button. */
          <Button
            className="relative z-10 ml-auto"
            onClick={() => markSeen(announcement.id)}
            size="sm"
            variant="ghost"
          >
            <Check className="size-4" />
            {t("markAsRead")}
          </Button>
        )}
      </div>

      {/* Copy and demo side by side, the side alternating down the feed. The
          meta line above spans both, so "mark as read" never collides with the
          video. Reversing with flex keeps the copy first in the DOM: the
          reading order stays title-then-demo whatever the visual order. */}
      <div
        className={cn(
          "mt-3 flex flex-col gap-4 sm:items-start sm:gap-6",
          isMediaLeading ? "sm:flex-row-reverse" : "sm:flex-row",
        )}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight text-balance sm:text-xl">
            {/* The `after` overlay stretches this link over the whole entry:
                anywhere on the card opens the announcement. The feed carries no
                action of its own — "Try it" lives on the announcement's page,
                once the reader knows what they would be trying. */}
            <Link
              className="focus-visible:ring-ring rounded-sm outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:ring-2"
              href={getWhatsNewDetailHref(announcement.id)}
            >
              {title}
            </Link>
          </h3>

          <p className="text-muted-foreground mt-2 text-sm text-pretty sm:text-base">
            {t(announcement.descriptionKey)}
          </p>
        </div>

        {announcement.media && (
          <WhatsNewEntryThumbnail
            className="w-full sm:w-64 lg:w-80"
            label={title}
            media={announcement.media}
          />
        )}
      </div>
    </article>
  );
};
