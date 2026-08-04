/**
 * Twilio's number search has two narrowing parameters with different coverage:
 * `AreaCode` only works for NANP numbers (US/CA), while `Contains` matches a
 * digit sequence anywhere in the number and works for every country. The UI
 * shows a single filter field and this predicate decides which parameter it
 * feeds — shared by the search form and the server action so they can't drift.
 */
export const supportsAreaCodeFilter = (country: string): boolean =>
  country === "US" || country === "CA";
