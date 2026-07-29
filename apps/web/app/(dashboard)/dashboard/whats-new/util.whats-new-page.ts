import {
  WHATS_NEW_CATEGORY_ORDER,
  type WhatsNewAnnouncement,
  type WhatsNewCategory,
} from "@/lib/whats-new.constants";

/** `all` is a filter value only — it is never a category of an announcement. */
export type WhatsNewFilter = "all" | WhatsNewCategory;

/** Tab order of the changelog filter, driven by the shared category order. */
export const WHATS_NEW_FILTERS: WhatsNewFilter[] = ["all", ...WHATS_NEW_CATEGORY_ORDER];

/** `Tabs` hands its callback a bare `string`: narrow it instead of asserting. */
export const isWhatsNewFilter = (value: string): value is WhatsNewFilter =>
  WHATS_NEW_FILTERS.some((filter) => filter === value);

/** Tab counters. Categories with no entry yet must still render a `0`. */
export const countWhatsNewByFilter = (
  announcements: WhatsNewAnnouncement[],
): Record<WhatsNewFilter, number> => {
  const counts: Record<WhatsNewFilter, number> = {
    all: announcements.length,
    feature: 0,
    improvement: 0,
    fix: 0,
  };

  for (const announcement of announcements) {
    counts[announcement.category] += 1;
  }

  return counts;
};

export interface WhatsNewMonthGroup {
  announcements: WhatsNewAnnouncement[];
  /** First day of the month, so the heading can be formatted per locale. */
  date: Date;
  /** `YYYY-MM` — stable React key. */
  key: string;
}

/**
 * Splits the feed into month sections. Consecutive grouping is enough because
 * `announcements` is always newest first.
 */
export const groupWhatsNewByMonth = (
  announcements: WhatsNewAnnouncement[],
): WhatsNewMonthGroup[] => {
  const groups: WhatsNewMonthGroup[] = [];

  for (const announcement of announcements) {
    const [year, month] = announcement.date.split("-");
    const key = `${year}-${month}`;
    const currentGroup = groups.at(-1);

    if (currentGroup?.key === key) {
      currentGroup.announcements.push(announcement);
      continue;
    }

    groups.push({
      announcements: [announcement],
      // Local midnight: a UTC date would roll back to the previous month for
      // viewers in a negative offset.
      date: new Date(Number(year), Number(month) - 1, 1),
      key,
    });
  }

  return groups;
};
