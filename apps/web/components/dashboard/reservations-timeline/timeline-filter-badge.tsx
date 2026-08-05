/**
 * Count bubble pinned to a timeline filter trigger. Shared by the reservations
 * planning toolbar and the product detail timeline so both read the same.
 *
 * `null` hides the badge; `0` is a real value ("no status shown").
 */
export const TimelineFilterBadge = ({ count }: { count: number | null }) => {
  if (count === null) return null;

  return (
    <span className="bg-primary text-primary-foreground absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold sm:top-0 sm:end-0">
      {count}
    </span>
  );
};
