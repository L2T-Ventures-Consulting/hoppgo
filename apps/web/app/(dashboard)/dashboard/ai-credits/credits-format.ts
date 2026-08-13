/** Display helpers shared by the credits page and its widgets. */

/** Whole credits stay whole; anything else keeps a single decimal. */
export const formatCredits = (credits: number): string => {
  const rounded = Math.round(credits * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

/** Billed call time, rounded up to the started minute (how it is charged). */
export const secondsToMinutes = (seconds: number): number =>
  seconds > 0 ? Math.ceil(seconds / 60) : 0;

/** Total balance under which the UI switches to its low-credit state. */
export const LOW_BALANCE_CREDITS = 5;
