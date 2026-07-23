import 'server-only';

import { db, variantDefinitions } from '@louez/db';
import { asc, eq } from 'drizzle-orm';

export const getStoreVariantActivity = (storeId: string) =>
  db
    .select({
      key: variantDefinitions.key,
      label: variantDefinitions.label,
      isActive: variantDefinitions.isActive,
    })
    .from(variantDefinitions)
    .where(eq(variantDefinitions.storeId, storeId))
    .orderBy(asc(variantDefinitions.position));
