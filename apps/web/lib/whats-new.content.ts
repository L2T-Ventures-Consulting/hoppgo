import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { marked } from "marked";

import { locales } from "@/i18n/config";

/**
 * Long-form body of an announcement, one Markdown file per locale:
 * `content/whats-new/<announcement-id>/<locale>.md`.
 *
 * Only the write-up lives here — title and description stay in the message
 * files, because the popover and the changelog list are client components that
 * cannot read the filesystem. Locales without their own file fall back to
 * English rather than showing an empty page.
 */
const CONTENT_ROOT = join(process.cwd(), "content", "whats-new");

const FALLBACK_LOCALE = "en";

/** Trusted, repo-authored content: GFM on, no sanitiser needed. */
marked.setOptions({ gfm: true });

const readBody = async (announcementId: string, locale: string) => {
  try {
    return await readFile(join(CONTENT_ROOT, announcementId, `${locale}.md`), "utf8");
  } catch {
    return null;
  }
};

/**
 * `null` when the announcement has no write-up at all — the detail page then
 * renders its header alone instead of an empty prose block.
 */
export const getWhatsNewBodyHtml = async (announcementId: string, locale: string) => {
  // A locale we never ship must not be turned into a filesystem lookup.
  const safeLocale = (locales as readonly string[]).includes(locale) ? locale : FALLBACK_LOCALE;

  const markdown =
    (await readBody(announcementId, safeLocale)) ??
    (safeLocale === FALLBACK_LOCALE ? null : await readBody(announcementId, FALLBACK_LOCALE));

  if (!markdown?.trim()) return null;

  return marked.parse(markdown, { async: false });
};
