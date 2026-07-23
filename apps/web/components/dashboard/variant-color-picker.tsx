'use client';

import { useId, useState } from 'react';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@louez/ui';
import { cn } from '@louez/utils';

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;
const COLOR_SUGGESTIONS = [
  '#171717',
  '#FAFAFA',
  '#6B7280',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#92400E',
  '#D6C7A1',
] as const;

const normalizeHexColor = (value: string) => {
  const normalized = value.startsWith('#') ? value : `#${value}`;
  return normalized.toUpperCase();
};

export const VariantColorPicker = ({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) => {
  const t = useTranslations('dashboard.products.form.unitTracking');
  const inputId = useId();
  const normalizedValue = normalizeHexColor(value);
  const [draft, setDraft] = useState<{
    sourceValue: string;
    value: string;
  } | null>(null);
  const draftValue =
    draft?.sourceValue === normalizedValue ? draft.value : normalizedValue;
  const draftIsValid = HEX_COLOR_PATTERN.test(normalizeHexColor(draftValue));

  const selectColor = (nextColor: string) => {
    const normalized = normalizeHexColor(nextColor);
    setDraft(null);
    onChange(normalized);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn('h-8 w-10 shrink-0 p-1', className)}
            disabled={disabled}
            aria-label={t('chooseColor')}
          />
        }
      >
        <span
          className="size-full rounded-md border border-black/10 shadow-xs dark:border-white/15"
          style={{ backgroundColor: normalizedValue }}
        />
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={10}
        className="w-72"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <PopoverTitle className="text-sm">
                {t('presets.color.label')}
              </PopoverTitle>
              <PopoverDescription className="text-xs">
                {t('colorPickerDescription')}
              </PopoverDescription>
            </div>
            <span
              className="size-9 shrink-0 rounded-lg border border-black/10 shadow-xs dark:border-white/15"
              style={{ backgroundColor: normalizedValue }}
            />
          </div>

          <label
            className="group relative flex h-16 cursor-pointer items-end overflow-hidden rounded-lg border border-black/10 p-2 shadow-inner dark:border-white/15"
            style={{ backgroundColor: normalizedValue }}
          >
            <span className="rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white transition-colors group-hover:bg-black/70">
              {t('chooseColor')}
            </span>
            <input
              type="color"
              value={normalizedValue}
              onChange={(event) => selectColor(event.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label={t('chooseColor')}
              disabled={disabled}
            />
          </label>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">
              {t('presetSuggestions')}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_SUGGESTIONS.map((color) => {
                const selected = color === normalizedValue;
                return (
                  <button
                    key={color}
                    type="button"
                    className="ring-ring relative aspect-square rounded-md border border-black/10 shadow-xs outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-white/15"
                    style={{ backgroundColor: color }}
                    onClick={() => selectColor(color)}
                    aria-label={color}
                    aria-pressed={selected}
                  >
                    {selected && (
                      <Check
                        className={cn(
                          'absolute inset-0 m-auto size-3.5',
                          color === '#FAFAFA' || color === '#D6C7A1'
                            ? 'text-black'
                            : 'text-white',
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-xs font-medium">
              {t('hexColor')}
            </label>
            <Input
              id={inputId}
              value={draftValue}
              onChange={(event) => {
                const nextDraft = event.target.value.toUpperCase();
                setDraft({ sourceValue: normalizedValue, value: nextDraft });
                const normalized = normalizeHexColor(nextDraft);
                if (HEX_COLOR_PATTERN.test(normalized)) onChange(normalized);
              }}
              onBlur={() => {
                if (!draftIsValid) setDraft(null);
              }}
              className="font-mono uppercase"
              aria-invalid={!draftIsValid}
              spellCheck={false}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
