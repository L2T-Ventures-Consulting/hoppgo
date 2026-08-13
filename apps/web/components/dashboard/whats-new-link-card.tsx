"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { AccentSparklesIcon, ArrowUpRightIcon } from "@louez/ui/icons";
import { cn } from "@louez/utils";

import { WhatsNewEntryThumbnail } from "@/components/dashboard/whats-new-entry-thumbnail";
import { findWhatsNewAnnouncement, getWhatsNewDetailHref } from "@/lib/whats-new.constants";

interface WhatsNewLinkCardProps {
  /** Must match an `id` declared in `WHATS_NEW_ANNOUNCEMENTS`. */
  announcementId: string;
  className?: string;
  /**
   * Forwarded from the demo's media viewer. A card sitting in a popover must
   * pass it on: the viewer is portalled to the body, so the popover has to be
   * held open for as long as it is up — a press in the viewer would otherwise
   * dismiss the popover and take the video down mid-play.
   */
  onMediaViewerOpenChange?: (open: boolean) => void;
}

/**
 * Sends a contextual explainer — a popover, a promo dialog — to the full
 * write-up of the matching announcement, where the feature is covered in
 * depth. Renders nothing when the announcement is not published (yet), so a
 * card never points at a 404.
 *
 * The demo comes along when the announcement has one: the same thumbnail as the
 * changelog, playing its loop in place and lifting into the media viewer on
 * click. It sits outside the link — a button inside an anchor is invalid, and
 * the two are answers to different questions: watch it here, or go read why.
 */
export const WhatsNewLinkCard = ({
  announcementId,
  className,
  onMediaViewerOpenChange,
}: WhatsNewLinkCardProps) => {
  const t = useTranslations("dashboard.whatsNew");
  const announcement = findWhatsNewAnnouncement(announcementId);

  if (!announcement) return null;

  const Icon = announcement.icon ?? AccentSparklesIcon;
  const title = t(announcement.titleKey);

  return (
    <div className={cn("bg-muted/40 space-y-2 rounded-lg border p-2", className)}>
      {announcement.media && (
        <WhatsNewEntryThumbnail
          className="w-full"
          label={title}
          media={announcement.media}
          onViewerOpenChange={onMediaViewerOpenChange}
        />
      )}

      <Link
        className="group hover:bg-muted flex items-center gap-3 rounded-md p-1 transition-colors"
        href={getWhatsNewDetailHref(announcement.id)}
        // A tab of its own: these cards sit inside forms, and navigating away
        // would drop whatever is being typed.
        rel="noreferrer"
        target="_blank"
      >
        <span className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground block text-xs">{t("title")}</span>
          <span className="line-clamp-2 block text-sm font-medium">{title}</span>
        </span>
        <ArrowUpRightIcon className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors" />
      </Link>
    </div>
  );
};
