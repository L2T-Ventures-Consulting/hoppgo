import Link from 'next/link';

import { getTranslations } from 'next-intl/server';
import { Boxes } from 'lucide-react';

import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@louez/ui';

import type { ProductInventoryDetail } from '../queries';
import { ProductUnitsTable } from './product-units-table';

interface ProductInventorySectionProps {
  productId: string;
  inventoryDetail: ProductInventoryDetail;
}

export async function ProductInventorySection({
  productId,
  inventoryDetail,
}: ProductInventorySectionProps) {
  const t = await getTranslations('dashboard.products.detail.inventory');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="h-4 w-4" />
          {t('title')}
        </CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/dashboard/products/${productId}/edit#section-stock`}
              />
            }
          >
            {t('manageStock')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {inventoryDetail.mode === 'simple' ? (
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-muted-foreground">{t('quantity')}</p>
              <p className="text-xl font-semibold">
                {inventoryDetail.quantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('available')}</p>
              <p className="text-xl font-semibold">
                {inventoryDetail.effectiveQuantity}
              </p>
            </div>
          </div>
        ) : (
          <ProductUnitsTable units={inventoryDetail.units} />
        )}
      </CardContent>
    </Card>
  );
}
