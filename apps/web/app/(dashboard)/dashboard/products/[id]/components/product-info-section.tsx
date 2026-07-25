import Link from 'next/link';

import { getTranslations } from 'next-intl/server';
import { FileText, Package } from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@louez/ui';
import { formatCurrency } from '@louez/utils';

import { ProductImage } from '@/components/product/product-image';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

import { sanitizeProductDescriptionHtml } from './util.product-description';

interface ProductInfoSectionPricingTier {
  id: string;
  period: number | null;
  minDuration: number | null;
  discountPercent: string | null;
  price: string | null;
}

interface ProductInfoSectionSeasonalPricing {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  price: string;
}

interface ProductInfoSectionAccessory {
  id: string;
  accessory: {
    id: string;
    name: string;
    price: string;
    images: string[] | null;
  };
}

interface ProductInfoSectionProduct {
  description: string | null;
  price: string;
  pricingMode: 'hour' | 'day' | 'week';
  images: string[] | null;
  pricingTiers: ProductInfoSectionPricingTier[];
  seasonalPricings: ProductInfoSectionSeasonalPricing[];
  accessories: ProductInfoSectionAccessory[];
}

interface ProductInfoSectionProps {
  product: ProductInfoSectionProduct;
  currency: string;
}

function formatPeriodDuration(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes % (60 * 24 * 7) === 0) return `${minutes / (60 * 24 * 7)}w`;
  if (minutes % (60 * 24) === 0) return `${minutes / (60 * 24)}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}min`;
}

export async function ProductInfoSection({
  product,
  currency,
}: ProductInfoSectionProps) {
  const t = await getTranslations('dashboard.products.detail.info');
  const tForm = await getTranslations('dashboard.products.form');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <div>
          {product.description ? (
            <div
              className="prose prose-sm dark:prose-invert prose-headings:text-foreground prose-a:text-primary prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base max-w-none text-sm text-muted-foreground break-words [&_a]:break-all [&_*]:min-w-0"
              dangerouslySetInnerHTML={{
                __html: sanitizeProductDescriptionHtml(product.description),
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('noDescription')}
            </p>
          )}
        </div>

        <Separator />

        {/* Pricing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">
              {formatCurrency(parseFloat(product.price), currency)}
            </p>
            <Badge variant="expired">{tForm(`pricingModes.${product.pricingMode}`)}</Badge>
          </div>

          {product.pricingTiers.length > 0 && (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      {tForm('pricingTiers.fromDuration')}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {tForm('pricePerDay')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.pricingTiers.map((tier) => (
                    <tr key={tier.id} className="border-t">
                      <td className="px-3 py-2">
                        {formatPeriodDuration(tier.period)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {tier.price
                          ? formatCurrency(parseFloat(tier.price), currency)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {product.seasonalPricings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t('seasonalPricing')}
              </p>
              <ul className="space-y-1 text-sm">
                {product.seasonalPricings.map((season) => (
                  <li
                    key={season.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {season.name} · {formatDate(season.startDate)} –{' '}
                      {formatDate(season.endDate)}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(season.price), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Separator />

        {/* Accessories */}
        <div className="space-y-3">
          <p className="text-sm font-medium">{t('accessories')}</p>
          {product.accessories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('noAccessories')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {product.accessories.map((link) => {
                const accessoryImage = link.accessory.images?.[0];
                return (
                  <Link
                    key={link.id}
                    href={`/dashboard/products/${link.accessory.id}`}
                    className="group overflow-hidden rounded-lg border transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <ProductImage
                      src={accessoryImage}
                      alt={link.accessory.name}
                      sizes="120px"
                      inset={false}
                      className="transition-transform group-hover:scale-[1.02]"
                      containerClassName="w-full rounded-none"
                    />
                    <div className="p-2">
                      <p className="truncate text-xs font-medium">
                        {link.accessory.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(
                          parseFloat(link.accessory.price),
                          currency,
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Image gallery */}
        {product.images && product.images.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('gallery')}</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((image, index) => (
                  <ProductImage
                    key={image}
                    src={image}
                    alt={t('galleryImageAlt', { index: index + 1 })}
                    sizes="112px"
                    containerClassName="h-20 w-28 shrink-0 border"
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {product.images?.length === 0 && (
          <EmptyState icon={Package} title={t('noImages')} className="py-6" />
        )}
      </CardContent>
    </Card>
  );
}
