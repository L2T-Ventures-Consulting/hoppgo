"use server";

import { db } from "@louez/db";
import {
  customers,
  products,
  reservationItemUnits,
  reservationItems,
  reservations,
  stores,
} from "@louez/db";
import {
  type TimelineReservation,
  formatDeliveryAddress,
} from "@/components/dashboard/reservations-timeline/timeline-utils";
import { getGoogleCalendarIntegrationForStore } from "@/lib/integrations/calendar/state";
import { getCurrentStore } from "@/lib/store-context";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getCalendarProducts, getReservationsForPeriod } from "./data";

export interface StoreTimelineReservation extends TimelineReservation {
  productId: string;
}

/**
 * Timeline entries for ALL products of the store over a date range — one entry
 * per (reservation, product) pair so the planning view can place each product's
 * bars on its own rows.
 */
export async function fetchStoreReservationTimeline(
  startDateISO: string,
  endDateISO: string,
): Promise<{ data: StoreTimelineReservation[] } | { error: string }> {
  const store = await getCurrentStore();

  if (!store) {
    return { error: "errors.unauthorized" };
  }

  const start = new Date(startDateISO);
  const end = new Date(endDateISO);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return { error: "errors.invalidData" };
  }

  try {
    const rows = await db
      .select({
        reservationId: reservations.id,
        number: reservations.number,
        status: reservations.status,
        startDate: reservations.startDate,
        endDate: reservations.endDate,
        customerId: customers.id,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        subtotalAmount: reservations.subtotalAmount,
        depositAmount: reservations.depositAmount,
        totalAmount: reservations.totalAmount,
        itemId: reservationItems.id,
        productId: reservationItems.productId,
        productName: products.name,
        productImages: products.images,
        quantity: reservationItems.quantity,
        outboundMethod: reservations.outboundMethod,
        returnMethod: reservations.returnMethod,
        deliveryAddress: reservations.deliveryAddress,
        deliveryCity: reservations.deliveryCity,
        deliveryPostalCode: reservations.deliveryPostalCode,
        deliveryCountry: reservations.deliveryCountry,
        returnAddress: reservations.returnAddress,
        returnCity: reservations.returnCity,
        returnPostalCode: reservations.returnPostalCode,
        returnCountry: reservations.returnCountry,
      })
      .from(reservationItems)
      .innerJoin(reservations, eq(reservationItems.reservationId, reservations.id))
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .leftJoin(products, eq(reservationItems.productId, products.id))
      .where(
        and(
          eq(reservations.storeId, store.id),
          lte(reservations.startDate, end),
          gte(reservations.endDate, start),
        ),
      );

    // Unit assignments, so unit-tracked products land on their real unit row
    // instead of an arbitrary slot.
    const itemIds = rows.map((row) => row.itemId);
    const assignmentRows = itemIds.length
      ? await db
          .select({
            reservationItemId: reservationItemUnits.reservationItemId,
            productUnitId: reservationItemUnits.productUnitId,
          })
          .from(reservationItemUnits)
          .where(inArray(reservationItemUnits.reservationItemId, itemIds))
      : [];

    const assignmentsByItem = new Map<string, string[]>();
    for (const assignment of assignmentRows) {
      if (!assignment.productUnitId) continue;
      const list = assignmentsByItem.get(assignment.reservationItemId) ?? [];
      list.push(assignment.productUnitId);
      assignmentsByItem.set(assignment.reservationItemId, list);
    }

    // A reservation can (rarely) contain several line items for the same
    // product — merge them into a single timeline entry per pair.
    const byPair = new Map<string, StoreTimelineReservation>();
    for (const row of rows) {
      if (!row.productId) continue;

      const assignedUnitIds = assignmentsByItem.get(row.itemId) ?? [];
      const key = `${row.reservationId}_${row.productId}`;
      const existing = byPair.get(key);
      if (existing) {
        existing.quantity += row.quantity;
        existing.assignedUnitIds.push(...assignedUnitIds);
        if (existing.items?.[0]) existing.items[0].quantity += row.quantity;
        continue;
      }

      byPair.set(key, {
        id: row.reservationId,
        productId: row.productId,
        number: row.number,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        customerId: row.customerId,
        customerName:
          [row.customerFirstName, row.customerLastName].filter(Boolean).join(" ") || "—",
        subtotalAmount: row.subtotalAmount,
        depositAmount: row.depositAmount,
        totalAmount: row.totalAmount,
        quantity: row.quantity,
        assignedUnitIds,
        items: row.productName
          ? [
              {
                productId: row.productId,
                name: row.productName,
                quantity: row.quantity,
                imageUrl: row.productImages?.[0] ?? null,
              },
            ]
          : [],
        outboundDeliveryAddress:
          row.outboundMethod === "address"
            ? formatDeliveryAddress({
                address: row.deliveryAddress,
                city: row.deliveryCity,
                postalCode: row.deliveryPostalCode,
                country: row.deliveryCountry,
              })
            : null,
        returnDeliveryAddress:
          row.returnMethod === "address"
            ? formatDeliveryAddress({
                address: row.returnAddress,
                city: row.returnCity,
                postalCode: row.returnPostalCode,
                country: row.returnCountry,
              })
            : null,
      });
    }

    return { data: Array.from(byPair.values()) };
  } catch (error) {
    console.error("Failed to fetch store reservation timeline:", error);
    return { error: "errors.generic" };
  }
}

export async function fetchPlanningProducts() {
  const store = await getCurrentStore();

  if (!store) {
    return { error: "errors.unauthorized" };
  }

  try {
    const storeProducts = await getCalendarProducts(store.id);

    return { data: storeProducts };
  } catch (error) {
    console.error("Failed to fetch planning products:", error);
    return { error: "errors.generic" };
  }
}

export async function fetchReservationsForPeriod(startDateISO: string, endDateISO: string) {
  const store = await getCurrentStore();

  if (!store) {
    return { error: "errors.unauthorized" };
  }

  try {
    const storeReservations = await getReservationsForPeriod(
      store.id,
      new Date(startDateISO),
      new Date(endDateISO),
    );

    return { data: storeReservations };
  } catch (error) {
    console.error("Failed to fetch reservations for period:", error);
    return { error: "errors.generic" };
  }
}

export async function generateIcsToken() {
  const store = await getCurrentStore();

  if (!store) {
    return { error: "errors.unauthorized" };
  }

  // Generate a new 32-character token
  const token = nanoid(32);

  await db
    .update(stores)
    .set({
      icsToken: token,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, store.id));

  return { success: true, token };
}

export async function getIcsToken() {
  const store = await getCurrentStore();

  if (!store) {
    return { error: "errors.unauthorized" };
  }

  // Return existing token or generate one if it doesn't exist
  if (store.icsToken) {
    return { success: true, token: store.icsToken };
  }

  // Generate and save a new token
  return generateIcsToken();
}

export async function regenerateIcsToken() {
  // Simply generate a new token, which invalidates the old one
  return generateIcsToken();
}

/**
 * Everything the sync-calendar dialog needs in a single round trip: the ICS
 * token (created on the fly the first time) and whether Google Calendar is
 * already connected, so the dialog can offer "connect" or "manage".
 */
export async function getCalendarSyncState(): Promise<
  { success: true; token: string; googleConnected: boolean } | { error: string }
> {
  const store = await getCurrentStore();

  if (!store) {
    return { error: "errors.unauthorized" };
  }

  const [tokenResult, googleIntegration] = await Promise.all([
    getIcsToken(),
    getGoogleCalendarIntegrationForStore(store.id),
  ]);

  if ("error" in tokenResult || !tokenResult.token) {
    return { error: "errors.generic" };
  }

  return {
    success: true,
    token: tokenResult.token,
    googleConnected: Boolean(googleIntegration?.credentials?.refreshTokenEncrypted),
  };
}
