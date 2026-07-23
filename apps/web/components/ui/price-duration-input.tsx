'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { cn, getCurrencySymbol } from '@louez/utils';
import { InputDuration, InputPrice } from '@louez/ui';

export type DurationUnit = 'minute' | 'hour' | 'day' | 'week';

export interface PriceDurationValue {
  price: string;
  duration: number;
  unit: DurationUnit;
}

const DURATION_UNITS: DurationUnit[] = ['minute', 'hour', 'day', 'week'];

const UNIT_LABEL_KEYS: Record<DurationUnit, string> = {
  minute: 'minuteUnit',
  hour: 'hourUnit',
  day: 'dayUnit',
  week: 'weekUnit',
};

const DEFAULT_VALUE: PriceDurationValue = {
  price: '',
  duration: 1,
  unit: 'day',
};

/** Localized duration unit options, pluralized against the given amount. */
export function useDurationUnitOptions(count: number) {
  const t = useTranslations('common');
  return DURATION_UNITS.map((unit) => ({
    value: unit,
    label: t(UNIT_LABEL_KEYS[unit], { count }),
  }));
}

export interface PriceDurationInputProps {
  value?: PriceDurationValue;
  onChange?: (value: PriceDurationValue) => void;
  defaultValue?: PriceDurationValue;
  currency?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function PriceDurationInput({
  value: controlledValue,
  onChange,
  defaultValue,
  currency = 'EUR',
  className,
  disabled,
  invalid = false,
}: PriceDurationInputProps) {
  const t = useTranslations('common');
  const symbol = getCurrencySymbol(currency);
  const [uncontrolledValue, setUncontrolledValue] =
    useState<PriceDurationValue>(defaultValue ?? DEFAULT_VALUE);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const units = useDurationUnitOptions(value.duration);

  function handleChange(next: PriceDurationValue) {
    if (!isControlled) setUncontrolledValue(next);
    onChange?.(next);
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <InputPrice
        value={parseFloat(value.price.replace(',', '.')) || 0}
        onValueCommitted={(price) =>
          handleChange({ ...value, price: String(price) })
        }
        suffix={symbol}
        ariaLabel={t('price')}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className="w-32"
      />

      <span className="text-muted-foreground text-sm">/</span>

      <InputDuration
        value={value.duration}
        onValueCommitted={(duration) => handleChange({ ...value, duration })}
        unit={value.unit}
        onUnitChange={(unit) => handleChange({ ...value, unit })}
        units={units}
        ariaLabel={t('duration')}
        aria-invalid={invalid || undefined}
        disabled={disabled}
      />
    </div>
  );
}
