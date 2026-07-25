import { and, desc, eq, lt, or } from "drizzle-orm";

import { db, productUnitEvents, productUnits } from "@louez/db";

export const PRODUCT_ACTIVITY_PAGE_SIZE = 12;

export interface ProductUnitActivityCursor {
  createdAt: string;
  id: string;
}

export interface ProductUnitActivityItem {
  id: string;
  productUnitId: string | null;
  identifierSnapshot: string | null;
  type: string;
  actorUserId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface ProductUnitActivityPage {
  items: ProductUnitActivityItem[];
  nextCursor: ProductUnitActivityCursor | null;
}

export const getProductUnitActivityPage = async ({
  storeId,
  productId,
  cursor,
  limit = PRODUCT_ACTIVITY_PAGE_SIZE,
}: {
  storeId: string;
  productId: string;
  cursor?: ProductUnitActivityCursor;
  limit?: number;
}): Promise<ProductUnitActivityPage> => {
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const cursorCondition =
    cursor && cursorDate
      ? or(
          lt(productUnitEvents.createdAt, cursorDate),
          and(eq(productUnitEvents.createdAt, cursorDate), lt(productUnitEvents.id, cursor.id)),
        )
      : undefined;

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
    .innerJoin(productUnits, eq(productUnitEvents.productUnitId, productUnits.id))
    .where(
      and(
        eq(productUnitEvents.storeId, storeId),
        eq(productUnits.productId, productId),
        cursorCondition,
      ),
    )
    .orderBy(desc(productUnitEvents.createdAt), desc(productUnitEvents.id))
    .limit(limit + 1);

  const hasNextPage = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
  const lastItem = items.at(-1);

  return {
    items,
    nextCursor: hasNextPage && lastItem ? { createdAt: lastItem.createdAt, id: lastItem.id } : null,
  };
};
