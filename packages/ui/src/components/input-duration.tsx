'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@louez/utils';

import { InputGroup, InputGroupInput } from './input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

interface DurationUnitOption<TUnit extends string = string> {
  value: TUnit;
  label: string;
}

interface InputDurationProps<TUnit extends string = string> {
  value: number;
  /**
   * Called with the parsed amount when the user commits (blur or Enter).
   * Edits in progress stay local — the parent never sees intermediate values.
   */
  onValueCommitted: (value: number) => void;
  unit: TUnit;
  onUnitChange: (unit: TUnit) => void;
  units: DurationUnitOption<TUnit>[];
  ariaLabel: string;
  unitAriaLabel?: string;
  'aria-invalid'?: boolean;
  disabled?: boolean;
  /** Called when the user cancels with Escape (the draft is discarded) */
  onCancel?: () => void;
  className?: string;
}

/** An amount of 0 renders as an empty field */
function formatAmount(value: number) {
  return value === 0 ? '' : String(value);
}

function InputDuration<TUnit extends string = string>({
  value,
  onValueCommitted,
  unit,
  onUnitChange,
  units,
  ariaLabel,
  unitAriaLabel,
  'aria-invalid': ariaInvalid,
  disabled,
  onCancel,
  className,
}: InputDurationProps<TUnit>) {
  const [localValue, setLocalValue] = useState(formatAmount(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalValue(formatAmount(value));
    }
  }, [value]);

  const selectedUnit = units.find((option) => option.value === unit);

  function commit() {
    const parsed = parseInt(localValue, 10);
    const final = Number.isNaN(parsed) ? 0 : parsed;
    setLocalValue(formatAmount(final));
    onValueCommitted(final);
  }

  return (
    <InputGroup className={cn('w-32', className)}>
      <InputGroupInput
        ref={inputRef}
        inputMode="numeric"
        value={localValue}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === '' || /^\d+$/.test(raw)) {
            setLocalValue(raw);
          }
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setLocalValue(formatAmount(value));
            onCancel?.();
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className="tabular-nums"
      />
      <Select
        value={unit}
        onValueChange={(next) => {
          if (next !== null) {
            onUnitChange(next as TUnit);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          data-slot="input-group-control"
          aria-label={unitAriaLabel}
          className="bg-muted/50 text-muted-foreground min-h-0 w-auto min-w-0 gap-1.5 self-stretch rounded-none rounded-r-[calc(var(--radius-lg)-1px)] border-0 border-l px-2.5 text-sm before:hidden focus-visible:ring-0 sm:text-sm [&_svg]:me-0 [&_svg]:size-3.5"
        >
          <SelectValue>{selectedUnit?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {units.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              label={option.label}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </InputGroup>
  );
}

export { InputDuration, type InputDurationProps, type DurationUnitOption };
