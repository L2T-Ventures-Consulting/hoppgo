import Link from 'next/link';

import { getTranslations } from 'next-intl/server';
import { CalendarRange } from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@louez/ui';
import { formatCurrency } from '@louez/utils';

import type { ReservationStatus } from '@/app/(dashboard)/dashboard/reservations/reservations-types';
import { STATUS_CONFIG } from '@/app/(dashboard)/dashboard/reservations/reservations-utils';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

import type { ProductReservationsPageItem } from '../queries';

interface ProductReservationsSectionProps {
  reservationsPage: { items: ProductReservationsPageItem[]; total: number };
  currency: string;
}

export async function ProductReservationsSection({
  reservationsPage,
  currency,
}: ProductReservationsSectionProps) {
  const t = await getTranslations('dashboard.products.detail.reservations');
  const tReservations = await getTranslations('dashboard.reservations');
  const tCommon = await getTranslations('common');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reservationsPage.items.length === 0 ? (
          <EmptyState icon={CalendarRange} title={t('empty')} />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tReservations('number')}</TableHead>
                    <TableHead>{tReservations('customer')}</TableHead>
                    <TableHead>{t('dates')}</TableHead>
                    <TableHead className="text-center">
                      {t('quantity')}
                    </TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
                    <TableHead className="text-right">
                      {tReservations('total')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservationsPage.items.map((item, index) => {
                    const status = (item.status ||
                      'pending') as ReservationStatus;
                    const statusConfig = STATUS_CONFIG[status];
                    const customerName =
                      [item.customerFirstName, item.customerLastName]
                        .filter(Boolean)
                        .join(' ') || '—';

                    return (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell>
                          <Link
                            href={`/dashboard/reservations/${item.id}`}
                            className="font-medium hover:underline"
                          >
                            #{item.number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/reservations/${item.id}`}
                            className="hover:underline"
                          >
                            {customerName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.startDate)} –{' '}
                          {formatDate(item.endDate)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`gap-1 border-0 ${statusConfig.bgClass} ${statusConfig.className}`}
                          >
                            {tReservations(`status.${status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            parseFloat(item.totalPrice),
                            currency,
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {reservationsPage.total > reservationsPage.items.length && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t('viewAllHint', { total: reservationsPage.total })}{' '}
                <Link href="/dashboard/reservations" className="underline">
                  {t('viewAllLink')}
                </Link>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
