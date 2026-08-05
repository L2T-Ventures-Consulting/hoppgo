import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  isValid,
  parse,
  startOfDay,
  startOfISOWeek,
  startOfMonth,
} from "date-fns";
import { de, en, es, fr, it, nl, pt, type ParsedResult, type ParsingOption } from "chrono-node";

type ChronoLocale = {
  parse: (text: string, referenceDate?: Date, options?: ParsingOption) => ParsedResult[];
};

const CHRONO_LOCALES: Record<string, ChronoLocale> = {
  de,
  en,
  es,
  fr,
  it,
  nl,
  pt,
};

const ISO_WEEK_QUERY =
  /^(?:semaine|week|woche|semana|settimana|tydzien)\s*(\d{1,2})(?:\s+(\d{4}))?$/i;

const DAY_ONLY_QUERY = /^(\d{1,2})$/;

const MONTH_ONLY_QUERY = /^\p{L}{3,}$/u;

const normalizeQuery = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const getLanguage = (locale: string) => locale.toLowerCase().split("-")[0] ?? "en";

const normalizePolishQuery = (value: string) => {
  const replacements: Array<[RegExp, string]> = [
    [/\bdzisiaj\b/g, "today"],
    [/\bjutro\b/g, "tomorrow"],
    [/\bpojutrze\b/g, "day after tomorrow"],
    [/\b(?:przyszly|nastepny)\b/g, "next"],
    [/\bponiedzialek\b/g, "monday"],
    [/\bwtorek\b/g, "tuesday"],
    [/\bsroda\b/g, "wednesday"],
    [/\bczwartek\b/g, "thursday"],
    [/\bpiatek\b/g, "friday"],
    [/\bsobota\b/g, "saturday"],
    [/\bniedziela\b/g, "sunday"],
    [/\bstycznia\b/g, "january"],
    [/\blutego\b/g, "february"],
    [/\bmarca\b/g, "march"],
    [/\bkwietnia\b/g, "april"],
    [/\bmaja\b/g, "may"],
    [/\bczerwca\b/g, "june"],
    [/\blipca\b/g, "july"],
    [/\bsierpnia\b/g, "august"],
    [/\bwrzesnia\b/g, "september"],
    [/\bpazdziernika\b/g, "october"],
    [/\blistopada\b/g, "november"],
    [/\bgrudnia\b/g, "december"],
  ];

  return replacements.reduce(
    (query, [pattern, replacement]) => query.replace(pattern, replacement),
    normalizeQuery(value).toLowerCase(),
  );
};

const parseExplicitDate = (value: string, locale: string, referenceDate: Date) => {
  const language = getLanguage(locale);
  const localizedFormats =
    language === "en"
      ? ["M/d/yyyy", "MM/dd/yyyy", "M/d", "MM/dd"]
      : ["d/M/yyyy", "dd/MM/yyyy", "d/M", "dd/MM"];
  const formats = ["yyyy-MM-dd", "d-M-yyyy", "dd-MM-yyyy", ...localizedFormats];

  for (const format of formats) {
    const parsed = parse(value, format, referenceDate);
    if (isValid(parsed)) return parsed;
  }

  return null;
};

const getISOWeekStart = (week: number, year: number) => {
  if (week < 1 || week > 53) return null;

  const firstWeekStart = startOfISOWeek(new Date(year, 0, 4));
  const date = addDays(firstWeekStart, (week - 1) * 7);

  const thursday = addDays(date, 3);
  if (thursday.getFullYear() !== year) return null;

  return date;
};

const parseISOWeek = (value: string, referenceDate: Date) => {
  const match = normalizeQuery(value).match(ISO_WEEK_QUERY);
  if (!match) return null;

  const week = Number(match[1]);
  let year = match[2] ? Number(match[2]) : referenceDate.getFullYear();
  let date = getISOWeekStart(week, year);

  if (!match[2] && date && addDays(date, 7) <= referenceDate) {
    year += 1;
    date = getISOWeekStart(week, year);
  }

  return date;
};

/**
 * A bare day number — the shortest thing to type on a phone — lands on the next
 * occurrence of that day, skipping months too short to hold it ("31" in February).
 */
const parseDayOfMonth = (value: string, referenceDate: Date) => {
  const match = value.match(DAY_ONLY_QUERY);
  if (!match) return null;

  const day = Number(match[1]);
  if (day < 1 || day > 31) return null;

  const reference = startOfDay(referenceDate);

  for (let offset = 0; offset < 12; offset += 1) {
    const month = addMonths(startOfMonth(reference), offset);
    const candidate = new Date(month.getFullYear(), month.getMonth(), day);

    if (candidate.getMonth() === month.getMonth() && candidate >= reference) return candidate;
  }

  return null;
};

/**
 * A month with no day covers the whole month, so it lands on its first day —
 * of next year once this year's is over.
 */
const startOfMonthInReferenceYear = (month: number, referenceDate: Date) => {
  const monthStart = new Date(referenceDate.getFullYear(), month, 1);

  return endOfMonth(monthStart) < startOfDay(referenceDate) ? addYears(monthStart, 1) : monthStart;
};

/**
 * Fallback for the locales where chrono only recognizes a month once a day is
 * attached ("septembre" alone yields nothing, "1 septembre" resolves).
 */
const parseMonthName = (value: string, referenceDate: Date, chrono: ChronoLocale) => {
  if (!MONTH_ONLY_QUERY.test(value)) return null;

  const parsed = [`1 ${value}`, `1. ${value}`]
    .map((candidate) => chrono.parse(candidate, referenceDate)[0]?.start.date())
    .find((date) => date && !Number.isNaN(date.getTime()));

  return parsed ? startOfMonthInReferenceYear(parsed.getMonth(), referenceDate) : null;
};

export const parseTimelineDateQuery = (
  value: string,
  locale: string,
  referenceDate = new Date(),
): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const explicitDate = parseExplicitDate(trimmed, locale, referenceDate);
  if (explicitDate) return explicitDate;

  const weekDate = parseISOWeek(trimmed, referenceDate);
  if (weekDate) return weekDate;

  const dayOfMonth = parseDayOfMonth(trimmed, referenceDate);
  if (dayOfMonth) return dayOfMonth;

  const language = getLanguage(locale);
  const chrono = CHRONO_LOCALES[language] ?? en;
  const chronoInput = language === "pl" ? normalizePolishQuery(trimmed) : trimmed;
  const result = chrono.parse(chronoInput, referenceDate, { forwardDate: true })[0];
  const date = result?.start.date();

  if (!result || !date || Number.isNaN(date.getTime())) {
    return parseMonthName(chronoInput, referenceDate, chrono);
  }

  // "August" alone: chrono forward-dates it a year out, the user means the
  // month that is about to happen.
  if (result.start.isCertain("month") && !result.start.isCertain("day")) {
    return result.start.isCertain("year")
      ? startOfMonth(date)
      : startOfMonthInReferenceYear(date.getMonth(), referenceDate);
  }

  date.setHours(0, 0, 0, 0);
  return date;
};
