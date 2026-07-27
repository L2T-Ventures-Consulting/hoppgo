"use client";

import { useEffect } from "react";

import { useReservationsCalendarPrefetch } from "./use-reservations-calendar-prefetch";

const RESERVATIONS_CALENDAR_HREF = "/dashboard/reservations";

export const ReservationsCalendarPrefetch = () => {
  const prefetch = useReservationsCalendarPrefetch();

  useEffect(() => {
    prefetch(RESERVATIONS_CALENDAR_HREF);
  }, [prefetch]);

  return null;
};
