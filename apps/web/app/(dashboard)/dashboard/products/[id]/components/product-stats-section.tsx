import { getTranslations } from 'next-intl/server';

import { BarChart3, Boxes, CalendarRange, Euro } from 'lucide-react';

import { formatCurrency } from '@louez/utils';

import type {
  ProductInventoryDetail,
  ProductReservationStatus,
  ProductRevenueStats,
  ProductUtilizationRate,
} from '../queries';
import { ProductStatCard } from './product-stat-card';

interface ProductStatsSectionProps {
  revenueStats: ProductRevenueStats;
  reservationCounts: Record<ProductReservationStatus, number>;
  utilization: ProductUtilizationRate;
  inventoryDetail: ProductInventoryDetail;
  currency: string;
}

export async function ProductStatsSection({
  revenueStats,
  reservationCounts,
  utilization,
  inventoryDetail,
  currency,
}: ProductStatsSectionProps) {
  const t = await getTranslations('dashboard.products.detail.stats');

  const upcomingCount =
    reservationCounts.pending +
    reservationCounts.confirmed +
    reservationCounts.ongoing;

  const stockValue =
    inventoryDetail.mode === 'simple'
      ? inventoryDetail.effectiveQuantity
      : t('unitsActiveValue', {
          active: inventoryDetail.units.filter(
            (unit) => unit.lifecycleStatus === 'active',
          ).length,
          total: inventoryDetail.units.length,
        });

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <ProductStatCard
        title={t('revenue')}
        value={formatCurrency(revenueStats.allTimeRevenue, currency)}
        icon={Euro}
        trend={{
          value: revenueStats.revenueGrowth,
          label: t('vsPrevious30Days'),
        }}
      />
      <ProductStatCard
        title={t('reservations')}
        value={revenueStats.reservationCount}
        subtitle={t('reservationsSubtitle', {
          upcoming: upcomingCount,
          completed: reservationCounts.completed,
        })}
        icon={CalendarRange}
      />
      <ProductStatCard
        title={t('utilization')}
        value={`${Math.round(utilization.rate * 100)}%`}
        subtitle={t('utilizationSubtitle')}
        icon={BarChart3}
      />
      <ProductStatCard title={t('stock')} value={stockValue} icon={Boxes} />
    </div>
  );
}
