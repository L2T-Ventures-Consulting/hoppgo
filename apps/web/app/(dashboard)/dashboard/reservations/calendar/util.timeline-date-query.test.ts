import assert from "node:assert/strict";
import { test } from "node:test";

import { parseTimelineDateQuery } from "./util.timeline-date-query";

const REFERENCE_DATE = new Date(2026, 7, 5, 12);

const toDateKey = (date: Date | null) => {
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

test("parses localized natural-language dates", () => {
  assert.equal(toDateKey(parseTimelineDateQuery("demain", "fr", REFERENCE_DATE)), "2026-08-06");
  assert.equal(toDateKey(parseTimelineDateQuery("tomorrow", "en", REFERENCE_DATE)), "2026-08-06");
  assert.equal(toDateKey(parseTimelineDateQuery("15 août", "fr", REFERENCE_DATE)), "2026-08-15");
  assert.equal(
    toDateKey(parseTimelineDateQuery("vendredi prochain", "fr", REFERENCE_DATE)),
    "2026-08-14",
  );
  assert.equal(toDateKey(parseTimelineDateQuery("jutro", "pl", REFERENCE_DATE)), "2026-08-06");
  assert.equal(
    toDateKey(parseTimelineDateQuery("przyszły piątek", "pl", REFERENCE_DATE)),
    "2026-08-07",
  );
  assert.equal(
    toDateKey(parseTimelineDateQuery("15 sierpnia", "pl", REFERENCE_DATE)),
    "2026-08-15",
  );
});

test("parses explicit dates according to the locale", () => {
  assert.equal(toDateKey(parseTimelineDateQuery("05/09/2026", "fr", REFERENCE_DATE)), "2026-09-05");
  assert.equal(toDateKey(parseTimelineDateQuery("05/09/2026", "en", REFERENCE_DATE)), "2026-05-09");
  assert.equal(toDateKey(parseTimelineDateQuery("2027-01-12", "fr", REFERENCE_DATE)), "2027-01-12");
});

test("parses ISO week numbers and moves implicit past weeks forward", () => {
  assert.equal(toDateKey(parseTimelineDateQuery("semaine 36", "fr", REFERENCE_DATE)), "2026-08-31");
  assert.equal(toDateKey(parseTimelineDateQuery("week 2", "en", REFERENCE_DATE)), "2027-01-11");
  assert.equal(toDateKey(parseTimelineDateQuery("week 32", "en", REFERENCE_DATE)), "2026-08-03");
  assert.equal(
    toDateKey(parseTimelineDateQuery("Woche 53 2026", "de", REFERENCE_DATE)),
    "2026-12-28",
  );
});

test("parses a bare day number and skips months that are too short", () => {
  assert.equal(toDateKey(parseTimelineDateQuery("15", "fr", REFERENCE_DATE)), "2026-08-15");
  assert.equal(toDateKey(parseTimelineDateQuery("5", "fr", REFERENCE_DATE)), "2026-08-05");
  assert.equal(toDateKey(parseTimelineDateQuery("3", "fr", REFERENCE_DATE)), "2026-09-03");
  assert.equal(
    toDateKey(parseTimelineDateQuery("31", "fr", new Date(2027, 0, 31, 12))),
    "2027-01-31",
  );
  assert.equal(
    toDateKey(parseTimelineDateQuery("30", "fr", new Date(2027, 1, 1, 12))),
    "2027-03-30",
  );
  assert.equal(parseTimelineDateQuery("32", "fr", REFERENCE_DATE), null);
});

test("parses a bare month name and rolls past months over to next year", () => {
  assert.equal(toDateKey(parseTimelineDateQuery("septembre", "fr", REFERENCE_DATE)), "2026-09-01");
  assert.equal(toDateKey(parseTimelineDateQuery("août", "fr", REFERENCE_DATE)), "2026-08-01");
  assert.equal(toDateKey(parseTimelineDateQuery("juillet", "fr", REFERENCE_DATE)), "2027-07-01");
  assert.equal(toDateKey(parseTimelineDateQuery("September", "de", REFERENCE_DATE)), "2026-09-01");
  assert.equal(toDateKey(parseTimelineDateQuery("august", "en", REFERENCE_DATE)), "2026-08-01");
  assert.equal(toDateKey(parseTimelineDateQuery("wrzesnia", "pl", REFERENCE_DATE)), "2026-09-01");
  assert.equal(
    toDateKey(parseTimelineDateQuery("september 2027", "en", REFERENCE_DATE)),
    "2027-09-01",
  );
});

test("returns null when no date can be recognized", () => {
  assert.equal(parseTimelineDateQuery("réservation de Sophie", "fr", REFERENCE_DATE), null);
  assert.equal(parseTimelineDateQuery("", "fr", REFERENCE_DATE), null);
});
