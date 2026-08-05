import assert from "node:assert/strict";
import { test } from "node:test";

import { persistCalendarDateInHistory } from "./calendar-query";

test("persists the centered calendar date while preserving the current URL state", () => {
  const state = { navigation: "next" };
  let replacement: { state: unknown; url: string | URL | null | undefined } | null = null;
  const browserHistory = {
    state,
    replaceState(nextState: unknown, _unused: string, url?: string | URL | null) {
      replacement = { state: nextState, url };
    },
  } satisfies Pick<History, "state" | "replaceState">;
  const browserLocation = {
    pathname: "/dashboard/reservations",
    search: "?view=calendar&range=week",
    hash: "#timeline",
  } satisfies Pick<Location, "pathname" | "search" | "hash">;

  persistCalendarDateInHistory(new Date(2026, 6, 8, 15), browserLocation, browserHistory);

  assert.deepEqual(replacement, {
    state,
    url: "/dashboard/reservations?view=calendar&range=week&date=2026-07-08#timeline",
  });
});

test("replaces an existing calendar date without duplicating it", () => {
  let replacementUrl: string | URL | null | undefined;
  const browserHistory = {
    state: null,
    replaceState(_state: unknown, _unused: string, url?: string | URL | null) {
      replacementUrl = url;
    },
  } satisfies Pick<History, "state" | "replaceState">;
  const browserLocation = {
    pathname: "/dashboard/reservations",
    search: "?date=today&view=calendar",
    hash: "",
  } satisfies Pick<Location, "pathname" | "search" | "hash">;

  persistCalendarDateInHistory(new Date(2026, 7, 5), browserLocation, browserHistory);

  assert.equal(replacementUrl, "/dashboard/reservations?date=2026-08-05&view=calendar");
});
