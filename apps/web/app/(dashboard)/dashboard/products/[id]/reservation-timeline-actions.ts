"use server";

import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import {
  customers,
  db,
  productUnitDowntimes,
  productUnits,
  products,
  reservationItemUnits,
  reservationItems,
  reservations,
} from "@louez/db";

import {
  type TimelineDowntime,
  type TimelineReservation,
  type TimelineReservationItem,
  compareByDisplayOrder,
} from "@/components/dashboard/reservations-timeline/timeline-utils";
import { getCurrentStore } from "@/lib/store-context";

export type ProductTimelineReservation = TimelineReservation;

export type ProductTimelineDowntime = TimelineDowntime;

export interface ProductTimelineData {
  reservations: ProductTimelineReservation[];
  downtimes: ProductTimelineDowntime[];
}

/**
 * Fetches everything the product reservations timeline needs for a date range:
 * reservations containing the product (with per-product quantity and explicit
 * unit assignments) and unit downtimes overlapping the range.
 *
 * Scoped to the product on the server so the payload stays small no matter how
 * busy the rest of the store is.
 */
export async function fetchProductReservationTimeline(input: {
  productId: string;
  startDateISO: string;
  endDateISO: string;
}): Promise<{ data: ProductTimelineData } | { error: string }> {
  const store = await getCurrentStore();

  if (!store) {
    return { error: "errors.unauthorized" };
  }

  const start = new Date(input.startDateISO);
  const end = new Date(input.endDateISO);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return { error: "errors.invalidData" };
  }

  try {
    const [itemRows, downtimeRows] = await Promise.all([
      db
        .select({
          reservationId: reservations.id,
          number: reservations.number,
          status: reservations.status,
          startDate: reservations.startDate,
          endDate: reservations.endDate,
          customerId: customers.id,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          totalAmount: reservations.totalAmount,
          itemId: reservationItems.id,
          quantity: reservationItems.quantity,
        })
        .from(reservationItems)
        .innerJoin(reservations, eq(reservationItems.reservationId, reservations.id))
        .leftJoin(customers, eq(reservations.customerId, customers.id))
        .where(
          and(
            eq(reservations.storeId, store.id),
            eq(reservationItems.productId, input.productId),
            lte(reservations.startDate, end),
            gte(reservations.endDate, start),
          ),
        ),
      db
        .select({
          id: productUnitDowntimes.id,
          unitId: productUnits.id,
          reason: productUnitDowntimes.reason,
          startsAt: productUnitDowntimes.startsAt,
          endsAt: productUnitDowntimes.endsAt,
        })
        .from(productUnitDowntimes)
        .innerJoin(productUnits, eq(productUnitDowntimes.productUnitId, productUnits.id))
        .where(
          and(
            eq(productUnitDowntimes.storeId, store.id),
            eq(productUnits.productId, input.productId),
            lte(productUnitDowntimes.startsAt, end),
            or(isNull(productUnitDowntimes.endsAt), gte(productUnitDowntimes.endsAt, start)),
          ),
        ),
    ]);

    const itemIds = itemRows.map((row) => row.itemId);
    const reservationIds = Array.from(new Set(itemRows.map((row) => row.reservationId)));

    const [assignmentRows, contentRows] = await Promise.all([
      itemIds.length
        ? db
            .select({
              reservationItemId: reservationItemUnits.reservationItemId,
              productUnitId: reservationItemUnits.productUnitId,
            })
            .from(reservationItemUnits)
            .where(inArray(reservationItemUnits.reservationItemId, itemIds))
        : [],
      // Everything else going out with this product, so the tooltip tells the
      // merchant what the whole reservation contains.
      reservationIds.length
        ? db
            .select({
              reservationId: reservationItems.reservationId,
              productId: reservationItems.productId,
              productName: products.name,
              productImages: products.images,
              displayOrder: products.displayOrder,
              quantity: reservationItems.quantity,
            })
            .from(reservationItems)
            .innerJoin(products, eq(reservationItems.productId, products.id))
            .where(inArray(reservationItems.reservationId, reservationIds))
        : [],
    ]);

    const assignmentsByItem = new Map<string, string[]>();
    for (const assignment of assignmentRows) {
      if (!assignment.productUnitId) continue;
      const list = assignmentsByItem.get(assignment.reservationItemId) ?? [];
      list.push(assignment.productUnitId);
      assignmentsByItem.set(assignment.reservationItemId, list);
    }

    // Aggregate per (reservation, product), then order like the catalog.
    const contentsByReservation = new Map<
      string,
      Map<string, TimelineReservationItem & { displayOrder: number }>
    >();
    for (const row of contentRows) {
      if (!row.productId) continue;
      let byProduct = contentsByReservation.get(row.reservationId);
      if (!byProduct) {
        byProduct = new Map();
        contentsByReservation.set(row.reservationId, byProduct);
      }

      const existing = byProduct.get(row.productId);
      if (existing) {
        existing.quantity += row.quantity;
        continue;
      }

      byProduct.set(row.productId, {
        productId: row.productId,
        name: row.productName,
        quantity: row.quantity,
        imageUrl: row.productImages?.[0] ?? null,
        displayOrder: row.displayOrder ?? 0,
      });
    }

    const itemsByReservation = new Map<string, TimelineReservationItem[]>();
    for (const [reservationId, byProduct] of contentsByReservation) {
      itemsByReservation.set(
        reservationId,
        Array.from(byProduct.values())
          .sort(compareByDisplayOrder)
          .map(({ displayOrder: _displayOrder, ...item }) => item),
      );
    }

    // A reservation can (rarely) contain several line items for the same
    // product — merge them into a single timeline entry per reservation.
    const byReservation = new Map<string, ProductTimelineReservation>();
    for (const row of itemRows) {
      const existing = byReservation.get(row.reservationId);
      const assignedUnitIds = assignmentsByItem.get(row.itemId) ?? [];

      if (existing) {
        existing.quantity += row.quantity;
        existing.assignedUnitIds.push(...assignedUnitIds);
        continue;
      }

      byReservation.set(row.reservationId, {
        id: row.reservationId,
        number: row.number,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        customerId: row.customerId,
        customerName:
          [row.customerFirstName, row.customerLastName].filter(Boolean).join(" ") || "—",
        totalAmount: row.totalAmount,
        quantity: row.quantity,
        assignedUnitIds,
        items: itemsByReservation.get(row.reservationId) ?? [],
      });
    }

    return {
      data: {
        reservations: Array.from(byReservation.values()),
        downtimes: downtimeRows,
      },
    };
  } catch (error) {
    console.error("Failed to fetch product reservation timeline:", error);
    return { error: "errors.generic" };
  }
}
