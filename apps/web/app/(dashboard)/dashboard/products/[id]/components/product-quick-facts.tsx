import { getTranslations } from 'next-intl/server';
import { Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@louez/ui';
import { formatCurrency } from '@louez/utils';
import type { BookingAttributeAxis, ProductTaxSettings } from '@louez/types';

import { formatDate } from '@/lib/utils';

interface ProductQuickFactsProduct {
  createdAt: Date;
  updatedAt: Date;
  deposit: string | null;
  taxSettings: ProductTaxSettings | null;
  bookingAttributeAxes: BookingAttributeAxis[] | null;
}

interface ProductQuickFactsProps {
  product: ProductQuickFactsProduct;
  currency: string;
}

export async function ProductQuickFacts({
  product,
  currency,
}: ProductQuickFactsProps) {
  const t = await getTranslations('dashboard.products.detail.quickFacts');

  const depositAmount = product.deposit ? parseFloat(product.deposit) : 0;
  const taxLabel = product.taxSettings?.inheritFromStore
    ? t('taxInherited')
    : product.taxSettings?.customRate != null
      ? t('taxCustomRate', { rate: product.taxSettings.customRate })
      : t('taxInherited');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('createdAt')}</span>
          <span>{formatDate(product.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('updatedAt')}</span>
          <span>{formatDate(product.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('deposit')}</span>
          <span>
            {depositAmount > 0
              ? formatCurrency(depositAmount, currency)
              : t('noDeposit')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('tax')}</span>
          <span>{taxLabel}</span>
        </div>
        {product.bookingAttributeAxes &&
          product.bookingAttributeAxes.length > 0 && (
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">
                {t('bookingAxes')}
              </span>
              <span className="text-right">
                {product.bookingAttributeAxes
                  .map((axis) => axis.label)
                  .join(', ')}
              </span>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
