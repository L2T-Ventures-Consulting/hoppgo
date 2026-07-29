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

/**
 * `process.cwd()` is not the same folder everywhere: `apps/web` under `next dev`
 * and turbo, but the monorepo root in the standalone build, whose entrypoint is
 * `node apps/web/server.js` from `/app`. Both roots are tried, and the one that
 * answers is kept — a single hardcoded path would silently serve announcements
 * with no body in production.
 */
const CONTENT_ROOTS = [
  join(process.cwd(), "content", "whats-new"),
  join(process.cwd(), "apps", "web", "content", "whats-new"),
];

const FALLBACK_LOCALE = "en";

/** Trusted, repo-authored content: GFM on, no sanitiser needed. */
marked.setOptions({ gfm: true });

/** Set on the first successful read, so later requests skip the probing. */
let resolvedRoot: string | null = null;

const readBody = async (announcementId: string, locale: string) => {
  const roots = resolvedRoot ? [resolvedRoot] : CONTENT_ROOTS;

  for (const root of roots) {
    try {
      const markdown = await readFile(join(root, announcementId, `${locale}.md`), "utf8");
      resolvedRoot = root;
      return markdown;
    } catch {
      // Missing translation or wrong root — try the next one, then give up.
    }
  }

  return null;
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
