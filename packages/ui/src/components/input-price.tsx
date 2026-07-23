"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@louez/utils";

import { Input } from "./input";

interface InputPriceProps {
  value: number;
  /**
   * Called with the parsed value when the user commits (blur or Enter).
   * Edits in progress stay local — the parent never sees intermediate values.
   */
  onValueCommitted: (value: number) => void;
  /** Unit hint rendered inside the field (e.g. "€", "€/j") */
  suffix: string;
  ariaLabel: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Called when the user cancels with Escape (the draft is discarded) */
  onCancel?: () => void;
  className?: string;
}

function InputPrice({
  value,
  onValueCommitted,
  suffix,
  ariaLabel,
  "aria-invalid": ariaInvalid,
  disabled,
  autoFocus,
  onCancel,
  className,
}: InputPriceProps) {
  const [localValue, setLocalValue] = useState(value.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalValue(value.toFixed(2));
    }
  }, [value]);

  function commit() {
    const parsed = parseFloat(localValue.replace(",", "."));
    const final = Number.isNaN(parsed) ? 0 : parsed;
    setLocalValue(final.toFixed(2));
    onValueCommitted(final);
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="relative cursor-text w-fit"
      // Focus the input when the padding or suffix area is clicked
      onMouseDown={(event) => {
        if (event.target !== inputRef.current) {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      <Input
        ref={inputRef}
        inputMode="decimal"
        value={localValue}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "" || /^\d*[.,]?\d{0,2}$/.test(raw)) {
            setLocalValue(raw);
          }
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setLocalValue(value.toFixed(2));
            onCancel?.();
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        autoFocus={autoFocus}
        className={cn("h-auto w-28 *:pr-0  *:min-w-0 pr-8 text-right tabular-nums", className)}
      />
      <span
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs select-none"
        aria-hidden="true"
      >
        {suffix}
      </span>
    </div>
  );
}

export { InputPrice, type InputPriceProps };
