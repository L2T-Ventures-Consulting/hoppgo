"use client";

import { createElement, isValidElement } from "react";
import type { ComponentType, ReactElement } from "react";

import { getFieldError } from "@/hooks/form/form-context";
import { Label, Radio, RadioGroup } from "@louez/ui";
import { cn } from "@louez/utils";

type RadioCardOption<TValue extends string> = {
  value: TValue;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }> | ReactElement;
};

type FormRadioCardGroupProps<TValue extends string> = {
  value: TValue;
  onChange: (nextValue: TValue) => void;
  options: ReadonlyArray<RadioCardOption<TValue>>;
  label?: string;
  helpText?: string;
  errors?: unknown[];
  className?: string;
  columns?: 1 | 2 | 3;
};

const COLUMN_CLASSES = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
} as const;

export function FormRadioCardGroup<TValue extends string>({
  value,
  onChange,
  options,
  label,
  helpText,
  errors = [],
  className,
  columns = 2,
}: FormRadioCardGroupProps<TValue>) {
  return (
    <div className="grid gap-2">
      {label && <Label>{label}</Label>}
      <RadioGroup
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
        className={cn("grid gap-4", COLUMN_CLASSES[columns], className)}
      >
        {options.map((option) => (
          <Label
            key={option.value}
            className="flex items-start gap-2 rounded-lg border p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50"
          >
            <Radio value={option.value} />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {option.icon && (
                  <span className="text-muted-foreground shrink-0 [&_svg]:size-4">
                    {isValidElement(option.icon)
                      ? option.icon
                      : createElement(option.icon, { className: "size-4" })}
                  </span>
                )}
                <p className="text-sm font-semibold">{option.label}</p>
              </div>
              {option.description && (
                <p className="text-muted-foreground text-xs">{option.description}</p>
              )}
            </div>
          </Label>
        ))}
      </RadioGroup>
      {helpText && <p className="text-muted-foreground text-sm">{helpText}</p>}
      {errors.length > 0 && <p className="text-destructive text-sm">{getFieldError(errors[0])}</p>}
    </div>
  );
}
