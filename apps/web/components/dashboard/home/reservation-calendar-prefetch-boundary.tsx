"use client";

import type { ReactNode } from "react";

import { useReservationsCalendarPrefetch } from "./use-reservations-calendar-prefetch";

interface ReservationCalendarPrefetchBoundaryProps {
  href: string;
  children: ReactNode;
}

export const ReservationCalendarPrefetchBoundary = ({
  href,
  children,
}: ReservationCalendarPrefetchBoundaryProps) => {
  const prefetch = useReservationsCalendarPrefetch();
  const handleIntent = () => prefetch(href);

  return (
    <div
      className="contents"
      onFocusCapture={handleIntent}
      onMouseEnter={handleIntent}
      onTouchStart={handleIntent}
    >
      {children}
    </div>
  );
};
