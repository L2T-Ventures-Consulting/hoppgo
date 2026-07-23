import { getTranslations } from 'next-intl/server';
import { Package } from 'lucide-react';

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@louez/ui';
import type { UnitAttributes } from '@louez/types';

import { formatUnitAttributes } from '@/app/(dashboard)/dashboard/inventory/components/util.inventory-format';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

import type { ProductInventoryDetail } from '../queries';

type TrackedUnit = Extract<
  ProductInventoryDetail,
  { mode: 'tracked' }
>['units'][number];

interface ProductUnitsTableProps {
  units: TrackedUnit[];
}

function isUnitAttributes(value: unknown): value is UnitAttributes {
  return typeof value === 'object' && value !== null;
}

export async function ProductUnitsTable({ units }: ProductUnitsTableProps) {
  const t = await getTranslations('dashboard.products.detail.inventory');
  const tInventory = await getTranslations('dashboard.inventory');

  if (units.length === 0) {
    return <EmptyState icon={Package} title={t('noUnits')} />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('identifier')}</TableHead>
            <TableHead>{t('attributes')}</TableHead>
            <TableHead>{t('unitStatus')}</TableHead>
            <TableHead>{t('lifecycle')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => {
            const attributesLabel = formatUnitAttributes(
              isUnitAttributes(unit.attributes) ? unit.attributes : null,
            );
            const isRetired = unit.lifecycleStatus === 'retired';

            return (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.identifier}</TableCell>
                <TableCell className="text-muted-foreground">
                  {attributesLabel || '—'}
                </TableCell>
                <TableCell>
                  {isRetired ? (
                    <span className="text-xs text-muted-foreground">
                      {unit.retirementReason
                        ? tInventory(
                            `retirementReasons.${unit.retirementReason}`,
                          )
                        : '—'}
                      {unit.retiredAt ? ` · ${formatDate(unit.retiredAt)}` : ''}
                    </span>
                  ) : unit.currentDowntime ? (
                    <Badge variant="warning">{t('inDowntime')}</Badge>
                  ) : unit.isBusyToday ? (
                    <Badge variant="info">{t('busyToday')}</Badge>
                  ) : (
                    <Badge variant="success">{t('available')}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={isRetired ? 'secondary' : 'outline'}>
                    {isRetired ? t('retired') : t('active')}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
