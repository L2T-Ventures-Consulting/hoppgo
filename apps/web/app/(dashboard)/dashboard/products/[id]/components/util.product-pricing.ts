/**
 * Renders a tier period as the shortest unit that divides it evenly — `1w`
 * rather than `7d`, `90min` when nothing rounder fits.
 */
export const formatPeriodDuration = (minutes: number | null): string => {
  if (!minutes) return "—";
  if (minutes % (60 * 24 * 7) === 0) return `${minutes / (60 * 24 * 7)}w`;
  if (minutes % (60 * 24) === 0) return `${minutes / (60 * 24)}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}min`;
};
