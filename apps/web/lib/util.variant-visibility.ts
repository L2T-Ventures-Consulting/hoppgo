import { normalizeAxisKey } from '@louez/utils';

import { VARIANT_PRESETS } from '@/lib/variant-presets';

interface VariantActivityDefinition {
  key: string;
  label?: string;
  isActive: boolean;
}

interface VariantVisibilityDefault {
  key: string;
  label?: string;
  aliases?: readonly string[];
  defaultActive: boolean;
}

export const filterActiveVariantAxes = <
  TAxis extends { key: string; label: string },
>(
  axes: readonly TAxis[],
  definitions: readonly VariantActivityDefinition[],
  defaults: readonly VariantVisibilityDefault[] = VARIANT_PRESETS,
): TAxis[] => {
  const activityByKey = new Map<string, boolean>();
  const defaultKeyByAlias = new Map<string, string>();

  for (const preset of defaults) {
    const normalizedKey = normalizeAxisKey(preset.key);
    activityByKey.set(normalizedKey, preset.defaultActive);
    defaultKeyByAlias.set(normalizedKey, normalizedKey);

    for (const alias of [preset.label, ...(preset.aliases ?? [])]) {
      if (!alias) continue;
      const normalizedAlias = normalizeAxisKey(alias);
      activityByKey.set(normalizedAlias, preset.defaultActive);
      defaultKeyByAlias.set(normalizedAlias, normalizedKey);
    }
  }

  for (const definition of definitions) {
    const normalizedKey = normalizeAxisKey(definition.key);
    const normalizedLabel = definition.label
      ? normalizeAxisKey(definition.label)
      : '';
    const defaultKey =
      defaultKeyByAlias.get(normalizedKey) ||
      defaultKeyByAlias.get(normalizedLabel);

    activityByKey.set(normalizedKey, definition.isActive);
    if (normalizedLabel)
      activityByKey.set(normalizedLabel, definition.isActive);
    if (defaultKey) activityByKey.set(defaultKey, definition.isActive);
  }

  return axes.filter((axis) => {
    const keyActivity = activityByKey.get(normalizeAxisKey(axis.key));
    if (keyActivity !== undefined) return keyActivity;

    const labelActivity = activityByKey.get(normalizeAxisKey(axis.label));
    return labelActivity ?? true;
  });
};

export const pickActiveVariantAttributes = (
  axes: readonly { key: string }[],
  attributes: Readonly<Record<string, string>>,
): Record<string, string> =>
  Object.fromEntries(
    axes.flatMap((axis) => {
      const value = attributes[axis.key];
      return value ? [[axis.key, value] as const] : [];
    }),
  );
