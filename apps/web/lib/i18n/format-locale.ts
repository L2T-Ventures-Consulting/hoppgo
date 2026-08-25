import type { Locale as DateFnsLocale } from "date-fns";
import { de, enUS, es, fr, it, nl, pl, ptBR } from "date-fns/locale";

import { defaultLocale, locales, localeCountries, type Locale } from "@/i18n/config";

/**
 * BCP 47 tag used by every `Intl.*` formatter and `toLocaleString` call.
 *
 * Date and number formatting used to be pinned to `fr-FR` throughout, so a
 * German or Spanish instance still rendered "jeu. 27 août" even though every
 * surrounding label was translated. Formatting now follows the instance's
 * configured locale.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_FORMAT_LOCALE` — full BCP 47 tag, for regional variants
 *      that differ from the UI language (e.g. `de-AT` while the UI runs `de`).
 *   2. `NEXT_PUBLIC_DEFAULT_LOCALE` — one of the supported UI locales.
 *   3. `defaultLocale` from the i18n config, which keeps the previous
 *      behaviour for instances that configure neither.
 *
 * Read from `process.env` at module scope: these are build-time public values,
 * and formatting has to stay synchronous for the many non-async call sites.
 */

/** Region comes from the shared locale config so there is one table, not two. */
function withRegion(locale: Locale): string {
  return `${locale}-${localeCountries[locale]}`;
}

function resolve(): string {
  const explicit = process.env.NEXT_PUBLIC_FORMAT_LOCALE?.trim();
  if (explicit) return explicit;

  const configured = process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim();
  if (configured && locales.includes(configured as Locale)) {
    return withRegion(configured as Locale);
  }

  return withRegion(defaultLocale);
}

/** BCP 47 tag for `Intl.*` formatters. */
export const FORMAT_LOCALE = resolve();

/* -------------------------------------------------------------------------
 * date-fns
 * ---------------------------------------------------------------------- */

/**
 * date-fns locale matching {@link FORMAT_LOCALE}.
 *
 * Components across the storefront and dashboard call
 * `format(date, "EEE d MMM", { locale: fr })` with the French locale imported
 * directly, which renders "mer. 27 août" on a German instance. Use this
 * constant instead so weekday and month names follow the configured locale.
 */
const DATE_FNS_BY_LOCALE: Record<Locale, DateFnsLocale> = {
  fr,
  en: enUS,
  de,
  es,
  it,
  nl,
  pl,
  pt: ptBR,
};

function resolveDateFns(): DateFnsLocale {
  const configured = process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim();
  if (configured && locales.includes(configured as Locale)) {
    return DATE_FNS_BY_LOCALE[configured as Locale];
  }
  return DATE_FNS_BY_LOCALE[defaultLocale];
}

/** date-fns locale for `format()` and friends. */
export const FORMAT_DATE_FNS_LOCALE: DateFnsLocale = resolveDateFns();
