'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@louez/ui';
import { ArrowLeftIcon, DatabaseIcon } from '@louez/ui/icons';

import {
  StockModeIndicator,
  UnitTrackingEditor,
} from '@/components/dashboard/unit-tracking-editor';

import type { ProductFormComponentApi, ProductFormValues } from '../types';

type QuantityFieldMeta = {
  errorMap?: Record<string, unknown>;
};

interface ProductFormSectionStockProps {
  form: ProductFormComponentApi;
  productId?: string;
  watchedValues: ProductFormValues;
  currency: string;
  disabled?: boolean;
  showValidationErrors?: boolean;
}

export function ProductFormSectionStock({
  form,
  productId,
  watchedValues,
  currency,
  disabled,
  showValidationErrors = false,
}: ProductFormSectionStockProps) {
  const t = useTranslations('dashboard.products.form');
  const tInventory = useTranslations('dashboard.inventory.productScoped');
  const tUnitTracking = useTranslations('dashboard.products.form.unitTracking');

  // Stock mode stepper: editing an existing product always lands directly on
  // the second step (mode already established).
  const [modeChosen, setModeChosen] = useState(
    () =>
      Boolean(productId) ||
      Boolean(watchedValues.trackUnits) ||
      (watchedValues.units?.length ?? 0) > 0 ||
      (parseInt(watchedValues.quantity || '1', 10) || 1) > 1,
  );

  // "Vélo gravel VFD" → "VELO-" : accent-stripped first word, used as the
  // suggested reference prefix for generated units.
  const defaultPrefix = useMemo(() => {
    const firstWord = (watchedValues.name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    return firstWord ? `${firstWord}-` : '';
  }, [watchedValues.name]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {modeChosen ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-6 w-6"
                onClick={() => setModeChosen(false)}
                aria-label={tUnitTracking('changeMode')}
              >
                <ArrowLeftIcon data-slot="icon" />
              </Button>
            ) : null}
            <CardTitle className="flex items-center gap-2">
              {' '}
              <DatabaseIcon className="text-primary h-5 w-5 shrink-0 stroke-2" />
              {t('stock')}
            </CardTitle>
            <StockModeIndicator
              modeChosen={modeChosen}
              trackUnits={watchedValues.trackUnits || false}
              onBack={() => setModeChosen(false)}
              disabled={disabled}
            />
          </div>
          <CardDescription>{t('quantityHelp')}</CardDescription>
        </div>
        {productId ? (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/dashboard/products/${productId}`} />
            }
          >
            <DatabaseIcon className="h-4 w-4" />
            {tInventory('openInventory')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <UnitTrackingEditor
          currency={currency}
          trackUnits={watchedValues.trackUnits || false}
          onTrackUnitsChange={(value) =>
            form.setFieldValue('trackUnits', value)
          }
          bookingAttributeAxes={watchedValues.bookingAttributeAxes || []}
          onBookingAttributeAxesChange={(axes) =>
            form.setFieldValue('bookingAttributeAxes', axes)
          }
          units={watchedValues.units || []}
          onChange={(units) => form.setFieldValue('units', units)}
          quantity={watchedValues.quantity || '1'}
          onQuantityChange={(value) => {
            form.setFieldMeta(
              'quantity',
              (prev: QuantityFieldMeta | undefined) => ({
                ...prev,
                errorMap: { ...prev?.errorMap, onSubmit: undefined },
              }),
            );
            form.setFieldValue('quantity', value);
          }}
          modeChosen={modeChosen}
          onModeChosenChange={setModeChosen}
          defaultPrefix={defaultPrefix}
          disabled={disabled}
          showValidationErrors={showValidationErrors}
          productId={productId}
        />
      </CardContent>
    </Card>
  );
}
