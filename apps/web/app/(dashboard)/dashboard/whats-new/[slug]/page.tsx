import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { Badge, Button } from "@louez/ui";
import { cn } from "@louez/utils";

import { DashboardBreadcrumbLabel } from "@/components/dashboard/dashboard-breadcrumbs-context";
import { getCurrentStore } from "@/lib/store-context";
import { getWhatsNewBodyHtml } from "@/lib/whats-new.content";
import {
  findWhatsNewAnnouncement,
  parseWhatsNewDate,
  WHATS_NEW_CATEGORIES,
  WHATS_NEW_PAGE_PATH,
} from "@/lib/whats-new.constants";

import { WhatsNewEntryMedia } from "../whats-new-entry-media";
import { WhatsNewEntryAnalytics } from "../whats-new-entry-analytics";
import { WhatsNewSeenMarker } from "../whats-new-seen-marker";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface WhatsNewEntryPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * One announcement, written up like a blog post. The metadata comes from a
 * module constant and the body from `content/whats-new/<slug>/<locale>.md`, so
 * the copy is edited as Markdown rather than as translation keys. An unknown
 * slug is a 404.
 */
export default async function WhatsNewEntryPage({ params }: WhatsNewEntryPageProps) {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const { slug } = await params;
  const announcement = findWhatsNewAnnouncement(slug);

  if (!announcement) {
    notFound();
  }

  const t = await getTranslations("dashboard.whatsNew");
  const format = await getFormatter();
  const locale = await getLocale();
  const bodyHtml = await getWhatsNewBodyHtml(announcement.id, locale);

  const category = WHATS_NEW_CATEGORIES[announcement.category];
  const title = t(announcement.titleKey);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Turns the last breadcrumb of `/dashboard/whats-new/<id>` into the title. */}
      <DashboardBreadcrumbLabel label={title} />
      <WhatsNewSeenMarker announcementId={announcement.id} />

      <Button
        className="-ml-2"
        render={<Link href={WHATS_NEW_PAGE_PATH} />}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="size-4" />
        {t("backToList")}
      </Button>

      <article className="mt-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={category.badgeVariant} size="sm">
              {t(category.labelKey)}
            </Badge>
            <time className="text-muted-foreground text-xs" dateTime={announcement.date}>
              {format.dateTime(parseWhatsNewDate(announcement.date), { dateStyle: "long" })}
            </time>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>

          <p className="text-muted-foreground mt-3 text-base text-pretty sm:text-lg">
            {t(announcement.descriptionKey)}
          </p>
        </header>

        {/* Nothing stands in for a missing demo: the write-up carries the page
            on its own until the video is recorded. */}
        {announcement.media && (
          <WhatsNewEntryMedia
            className="mt-8 rounded-xl border"
            label={title}
            media={announcement.media}
          />
        )}

        {bodyHtml && (
          <div
            className={cn(
              "prose prose-neutral dark:prose-invert mt-8 max-w-none",
              "prose-headings:tracking-tight prose-h2:text-lg prose-h2:font-semibold sm:prose-h2:text-xl",
              "prose-p:text-pretty prose-li:text-pretty prose-li:marker:text-muted-foreground",
              // A table must scroll inside itself rather than widen the page.
              "prose-table:block prose-table:overflow-x-auto",
              // Typography wraps inline code in literal backticks; keyboard
              // shortcuts read better as plain chips.
              "prose-code:bg-muted prose-code:text-foreground prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium prose-code:before:content-none prose-code:after:content-none",
            )}
            // Repo-authored Markdown compiled at request time — never user input.
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}

        {announcement.href && (
          <Button className="mt-8" render={<Link href={announcement.href} />}>
            {t("tryIt")}
            <ArrowRight className="size-4" />
          </Button>
        )}

        <WhatsNewEntryAnalytics
          announcementId={announcement.id}
          category={announcement.category}
          hasCta={announcement.href !== undefined}
          hasMedia={announcement.media !== undefined}
          releaseDate={announcement.date}
        />

        <footer className="mt-10 border-t pt-6">
          <Button render={<Link href={WHATS_NEW_PAGE_PATH} />} size="sm" variant="outline">
            <ArrowLeft className="size-4" />
            {t("backToList")}
          </Button>
        </footer>
      </article>
    </div>
  );
}
