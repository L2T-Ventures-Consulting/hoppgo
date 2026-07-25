import { Card } from '@louez/ui';

import type { Reservation } from '@/app/(dashboard)/dashboard/reservations/reservations-types';

import { ProductReservationsSectionBody } from './product-reservations-section-body';

interface ProductReservationsSectionProps {
  reservationsPage: { items: Reservation[]; total: number };
  currency: string;
  timezone?: string;
  productId: string;
  trackUnits: boolean;
  /** Active tracked units (empty for simple-quantity products) */
  units: { id: string; identifier: string }[];
  /** Stock quantity for simple-quantity products */
  quantity: number;
}

export function ProductReservationsSection({
  reservationsPage,
  currency,
  timezone,
  productId,
  trackUnits,
  units,
  quantity,
}: ProductReservationsSectionProps) {
  return (
    <Card>
      <ProductReservationsSectionBody
        reservationsPage={reservationsPage}
        currency={currency}
        timezone={timezone}
        productId={productId}
        trackUnits={trackUnits}
        units={units}
        quantity={quantity}
      />
    </Card>
  );
}
