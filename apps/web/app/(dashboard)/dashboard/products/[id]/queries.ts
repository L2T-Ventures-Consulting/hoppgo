import {
  endOfDay,
  endOfMonth,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';

import {
  BLOCKING_RESERVATION_STATUSES,
  customers,
  db,
  findBusyUnitIds,
  getBlockingReservationStatuses,
  payments,
  productUnitDowntimes,
  productUnitEvents,
  productUnits,
  products,
  reservationItemUnits,
  reservationItems,
  reservations,
  stores,
} from '@louez/db';

/**
 * Read-only data-layer queries for the product dashboard (view) page.
 *
 * These are plain server-side reads (no `'use server'` directive) meant to be
 * called directly from a server component. They intentionally do not mutate
 * anything.
 */

// ============================================================================
// 1. Revenue stats
// ============================================================================

export interface ProductRevenueStats {
  allTimeRevenue: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  reservationCount: number;
}

interface ProductRentalPaymentStats {
  revenue: number;
  reservationCount: number;
}

/**
 * Mirrors `getRentalPaymentStats` in `apps/web/lib/dashboard/metrics.ts`, scoped
 * down to payments belonging to reservations that include `productId` as a
 * line item.
 *
 * A reservation can (rarely) contain more than one line item for the same
 * product (e.g. two different variants of the same product booked together).
 * To avoid multiplying `payments.amount` when joining reservationItems
 * directly onto the payments aggregation, we first resolve the DISTINCT set
 * of matching reservation ids in a subquery, then filter payments by
 * `reservationId IN (...)`. Duplicate reservation ids inside that subquery
 * are harmless for an `IN` filter.
 */
async function getProductRentalPaymentStats(params: {
  storeId: string;
  productId: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<ProductRentalPaymentStats> {
  const { storeId, productId, startDate, endDate } = params;

  const matchingReservationIds = db
    .select({ id: reservations.id })
    .from(reservations)
    .innerJoin(
      reservationItems,
      eq(reservationItems.reservationId, reservations.id),
    )
    .where(
      and(
        eq(reservations.storeId, storeId),
        eq(reservationItems.productId, productId),
      ),
    );

  const dateConditions = [
    ...(startDate
      ? [
          sql`COALESCE(${payments.paidAt}, ${payments.createdAt}) >= ${startDate}`,
        ]
      : []),
    ...(endDate
      ? [sql`COALESCE(${payments.paidAt}, ${payments.createdAt}) <= ${endDate}`]
      : []),
  ];

  const result = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      reservationCount: sql<number>`COUNT(DISTINCT ${payments.reservationId})`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.status, 'completed'),
        eq(payments.type, 'rental'),
        inArray(payments.reservationId, matchingReservationIds),
        ...dateConditions,
      ),
    );

  return {
    revenue: parseFloat(result[0]?.revenue || '0'),
    reservationCount: result[0]?.reservationCount || 0,
  };
}

export async function getProductRevenueStats(params: {
  storeId: string;
  productId: string;
}): Promise<ProductRevenueStats> {
  const { storeId, productId } = params;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [currentMonth, lastMonth, allTime] = await Promise.all([
    getProductRentalPaymentStats({
      storeId,
      productId,
      startDate: currentMonthStart,
    }),
    getProductRentalPaymentStats({
      storeId,
      productId,
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
    }),
    getProductRentalPaymentStats({ storeId, productId }),
  ]);

  const revenueGrowth =
    lastMonth.revenue > 0
      ? ((currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100
      : 0;

  return {
    allTimeRevenue: allTime.revenue,
    currentMonthRevenue: currentMonth.revenue,
    lastMonthRevenue: lastMonth.revenue,
    revenueGrowth,
    reservationCount: allTime.reservationCount,
  };
}

// ============================================================================
// 2. Reservation counts by status
// ============================================================================

const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'ongoing',
  'completed',
  'cancelled',
  'rejected',
  'quote',
  'declined',
] as const;

export type ProductReservationStatus = (typeof RESERVATION_STATUSES)[number];

/**
 * Reservation counts for a product, keyed by `reservations.status`. All eight
 * statuses are always present (defaulted to 0) so callers don't need to guard
 * against missing keys.
 */
export async function getProductReservationCounts(params: {
  storeId: string;
  productId: string;
}): Promise<Record<ProductReservationStatus, number>> {
  const { storeId, productId } = params;

  const rows = await db
    .select({
      status: reservations.status,
      // A reservation could (rarely) have more than one line item for this
      // product; dedupe by reservation id so it's only counted once.
      count: sql<number>`COUNT(DISTINCT ${reservations.id})`,
    })
    .from(reservationItems)
    .innerJoin(
      reservations,
      eq(reservationItems.reservationId, reservations.id),
    )
    .where(
      and(
        eq(reservations.storeId, storeId),
        eq(reservationItems.productId, productId),
      ),
    )
    .groupBy(reservations.status);

  const counts = Object.fromEntries(
    RESERVATION_STATUSES.map((status) => [status, 0]),
  ) as Record<ProductReservationStatus, number>;

  for (const row of rows) {
    counts[row.status] = Number(row.count);
  }

  return counts;
}

// ============================================================================
// 3. Utilization rate
// ============================================================================

export interface ProductUtilizationRate {
  /** Fraction in [0, 1] of capacity-days used over the window (NOT a 0-100 percentage). */
  rate: number;
  busyDays: number;
  totalCapacityDays: number;
}

/**
 * Computes how much of a product's capacity was used over a trailing window.
 *
 * `rate` is expressed as a FRACTION in [0, 1] (e.g. 0.42 = 42% utilized), not
 * a 0-100 percentage — multiply by 100 to render as a percentage.
 *
 * `totalUnits` means different things depending on `trackUnits`:
 * - trackUnits = true: the number of units to treat as "total capacity" for
 *   this calculation (e.g. the active unit count). The caller decides this.
 * - trackUnits = false: the product's flat `quantity` stock.
 *
 * "Busy" is defined using the same blocking-reservation-status set used for
 * unit availability everywhere else (`BLOCKING_RESERVATION_STATUSES`:
 * pending/confirmed/ongoing) — this intentionally does NOT consult the
 * store's `pendingBlocksAvailability` setting, since this metric describes
 * historical/ongoing occupancy rather than "can this be booked right now".
 */
export async function getProductUtilizationRate(params: {
  storeId: string;
  productId: string;
  trackUnits: boolean;
  totalUnits: number;
  windowDays?: number;
}): Promise<ProductUtilizationRate> {
  const {
    storeId,
    productId,
    trackUnits,
    totalUnits,
    windowDays = 30,
  } = params;
  const now = new Date();
  const windowStart = subDays(now, windowDays);

  // Overlap (in days) between each reservation's [startDate, endDate] and the
  // trailing window [windowStart, now], clamped to >= 0. MySQL-compatible
  // (GREATEST/LEAST/TIMESTAMPDIFF), no Postgres-only syntax.
  const overlapDaysExpr = sql`GREATEST(
    0,
    TIMESTAMPDIFF(
      SECOND,
      GREATEST(${reservations.startDate}, ${windowStart}),
      LEAST(${reservations.endDate}, ${now})
    ) / 86400
  )`;

  const [row] = trackUnits
    ? await db
        .select({
          busyUnitDays: sql<string>`COALESCE(SUM(${overlapDaysExpr}), 0)`,
        })
        .from(reservationItemUnits)
        .innerJoin(
          reservationItems,
          eq(reservationItemUnits.reservationItemId, reservationItems.id),
        )
        .innerJoin(
          reservations,
          eq(reservationItems.reservationId, reservations.id),
        )
        .where(
          and(
            eq(reservations.storeId, storeId),
            eq(reservationItems.productId, productId),
            inArray(reservations.status, BLOCKING_RESERVATION_STATUSES),
          ),
        )
    : await db
        .select({
          busyUnitDays: sql<string>`COALESCE(SUM(${reservationItems.quantity} * ${overlapDaysExpr}), 0)`,
        })
        .from(reservationItems)
        .innerJoin(
          reservations,
          eq(reservationItems.reservationId, reservations.id),
        )
        .where(
          and(
            eq(reservations.storeId, storeId),
            eq(reservationItems.productId, productId),
            inArray(reservations.status, BLOCKING_RESERVATION_STATUSES),
          ),
        );

  const busyDays = parseFloat(row?.busyUnitDays || '0');
  const totalCapacityDays = totalUnits * windowDays;
  const rate =
    totalCapacityDays > 0
      ? Math.min(1, Math.max(0, busyDays / totalCapacityDays))
      : 0;

  return { rate, busyDays, totalCapacityDays };
}

// ============================================================================
// 4. Inventory detail
// ============================================================================

export type ProductInventoryDetail =
  | {
      mode: 'simple';
      quantity: number;
      effectiveQuantity: number;
    }
  | {
      mode: 'tracked';
      units: Array<{
        id: string;
        identifier: string;
        attributes: unknown;
        lifecycleStatus: 'active' | 'retired';
        retiredAt: Date | null;
        retirementReason: string | null;
        currentDowntime: {
          reason: string;
          startsAt: Date;
          endsAt: Date | null;
        } | null;
        isBusyToday: boolean;
      }>;
    };

/**
 * Full inventory view for a product (unlike the edit form, which only loads
 * active units — this includes retired units too, for a complete history).
 */
export async function getProductInventoryDetail(params: {
  storeId: string;
  productId: string;
  trackUnits: boolean;
}): Promise<ProductInventoryDetail> {
  const { storeId, productId, trackUnits } = params;

  if (!trackUnits) {
    // getEffectiveProductQuantities only aggregates active productUnits rows
    // and is meaningless for non-tracked products (it wouldn't return an
    // entry for them at all) — for simple-mode products, effective quantity
    // is just the flat `quantity` column.
    const [product] = await db
      .select({ quantity: products.quantity })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));

    const quantity = product?.quantity ?? 0;
    return { mode: 'simple', quantity, effectiveQuantity: quantity };
  }

  const units = await db
    .select()
    .from(productUnits)
    .where(eq(productUnits.productId, productId))
    .orderBy(asc(productUnits.identifier));

  if (units.length === 0) {
    return { mode: 'tracked', units: [] };
  }

  const unitIds = units.map((unit) => unit.id);
  const now = new Date();

  const [store, openDowntimes] = await Promise.all([
    db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      columns: { settings: true },
    }),
    db
      .select()
      .from(productUnitDowntimes)
      .where(
        and(
          inArray(productUnitDowntimes.productUnitId, unitIds),
          eq(productUnitDowntimes.storeId, storeId),
          or(
            isNull(productUnitDowntimes.endsAt),
            gt(productUnitDowntimes.endsAt, now),
          ),
        ),
      ),
  ]);

  // Mirrors apps/web/app/(dashboard)/dashboard/products/[id]/page.tsx's
  // edit-page pattern for deriving the blocking statuses from the store's
  // `pendingBlocksAvailability` setting.
  const blockingStatuses = getBlockingReservationStatuses(
    store?.settings?.pendingBlocksAvailability ?? true,
  );
  const turnoverBufferMinutes = store?.settings?.turnoverBufferMinutes ?? 0;

  const busyUnitIds = await findBusyUnitIds(db, {
    unitIds,
    start: now,
    end: endOfDay(now),
    blockingStatuses,
    turnoverBufferMinutes,
  });

  const openDowntimeByUnit = new Map<string, (typeof openDowntimes)[number]>();
  for (const downtime of openDowntimes) {
    if (!downtime.productUnitId) continue;
    if (!openDowntimeByUnit.has(downtime.productUnitId)) {
      openDowntimeByUnit.set(downtime.productUnitId, downtime);
    }
  }

  return {
    mode: 'tracked',
    units: units.map((unit) => {
      const downtime = openDowntimeByUnit.get(unit.id);

      return {
        id: unit.id,
        identifier: unit.identifier,
        attributes: unit.attributes,
        lifecycleStatus: unit.lifecycleStatus,
        retiredAt: unit.retiredAt,
        retirementReason: unit.retirementReason,
        currentDowntime: downtime
          ? {
              reason: downtime.reason,
              startsAt: downtime.startsAt,
              endsAt: downtime.endsAt,
            }
          : null,
        isBusyToday: busyUnitIds.has(unit.id),
      };
    }),
  };
}

// ============================================================================
// 5. Reservations page (paginated)
// ============================================================================

export interface ProductReservationsPageItem {
  id: string;
  number: string;
  status: string;
  startDate: Date;
  endDate: Date;
  quantity: number;
  totalPrice: string;
  customerFirstName: string | null;
  customerLastName: string | null;
}

/**
 * Paginated list of reservations that include this product.
 *
 * A reservation can (rarely) contain more than one line item for the same
 * product (e.g. two variants of the same product booked together). This
 * intentionally returns ONE ROW PER LINE ITEM (not deduped per reservation),
 * so `quantity`/`totalPrice` accurately reflect what was booked for that
 * specific line item — `total` counts line items too, matching what's
 * returned. `page` is zero-indexed.
 */
export async function getProductReservationsPage(params: {
  storeId: string;
  productId: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ProductReservationsPageItem[]; total: number }> {
  const { storeId, productId, page, pageSize } = params;

  const whereClause = and(
    eq(reservations.storeId, storeId),
    eq(reservationItems.productId, productId),
  );

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: reservations.id,
        number: reservations.number,
        status: reservations.status,
        startDate: reservations.startDate,
        endDate: reservations.endDate,
        quantity: reservationItems.quantity,
        totalPrice: reservationItems.totalPrice,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
      })
      .from(reservationItems)
      .innerJoin(
        reservations,
        eq(reservationItems.reservationId, reservations.id),
      )
      .innerJoin(customers, eq(reservations.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(reservations.startDate))
      .limit(pageSize)
      .offset(page * pageSize),
    db
      .select({ total: count() })
      .from(reservationItems)
      .innerJoin(
        reservations,
        eq(reservationItems.reservationId, reservations.id),
      )
      .where(whereClause),
  ]);

  return { items, total };
}

// ============================================================================
// 6. Unit activity feed
// ============================================================================

export interface ProductUnitActivityItem {
  id: string;
  productUnitId: string | null;
  identifierSnapshot: string | null;
  type: string;
  actorUserId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: Date;
}

export async function getProductUnitActivity(params: {
  storeId: string;
  productId: string;
  limit?: number;
}): Promise<ProductUnitActivityItem[]> {
  const { storeId, productId, limit = 15 } = params;

  const rows = await db
    .select({
      id: productUnitEvents.id,
      productUnitId: productUnitEvents.productUnitId,
      identifierSnapshot: productUnitEvents.identifierSnapshot,
      type: productUnitEvents.type,
      actorUserId: productUnitEvents.actorUserId,
      payload: productUnitEvents.payload,
      createdAt: productUnitEvents.createdAt,
    })
    .from(productUnitEvents)
    .innerJoin(
      productUnits,
      eq(productUnitEvents.productUnitId, productUnits.id),
    )
    .where(
      and(
        eq(productUnitEvents.storeId, storeId),
        eq(productUnits.productId, productId),
      ),
    )
    .orderBy(desc(productUnitEvents.createdAt))
    .limit(limit);

  return rows;
}
