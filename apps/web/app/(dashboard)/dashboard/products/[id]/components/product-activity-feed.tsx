import type { ComponentType } from 'react';

import { getTranslations } from 'next-intl/server';
// eslint-disable-next-line no-restricted-imports
import { formatDistanceToNow } from 'date-fns';
import { enUS, fr, type Locale } from 'date-fns/locale';
import {
  Activity,
  Ban,
  CheckCircle,
  MinusCircle,
  Pencil,
  PlusCircle,
  RotateCcw,
  Timer,
  Trash2,
  Wrench,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@louez/ui';

import { EmptyState } from '@/components/ui/empty-state';

import type { ProductUnitActivityItem } from '../queries';

type UnitEventType =
  | 'created'
  | 'deleted'
  | 'downtime_declared'
  | 'downtime_updated'
  | 'downtime_closed'
  | 'downtime_deleted'
  | 'retired'
  | 'reinstated'
  | 'assigned'
  | 'unassigned'
  | 'updated';

const EVENT_ICONS: Record<
  UnitEventType,
  ComponentType<{ className?: string }>
> = {
  created: PlusCircle,
  deleted: Trash2,
  downtime_declared: Wrench,
  downtime_updated: Wrench,
  downtime_closed: CheckCircle,
  downtime_deleted: MinusCircle,
  retired: Ban,
  reinstated: RotateCcw,
  assigned: Timer,
  unassigned: MinusCircle,
  updated: Pencil,
};

// Mirrors `apps/web/lib/utils/store-date.ts`'s LOCALE_MAP convention, scoped
// to the two locales this app actually ships (see apps/web/messages/).
const LOCALE_MAP: Record<string, Locale> = { fr, en: enUS };

interface ProductActivityFeedProps {
  activity: ProductUnitActivityItem[];
  locale: string;
}

export async function ProductActivityFeed({
  activity,
  locale,
}: ProductActivityFeedProps) {
  const t = await getTranslations('dashboard.products.detail.activity');
  const dateFnsLocale = LOCALE_MAP[locale] ?? fr;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState icon={Activity} title={t('empty')} />
        ) : (
          <ul className="space-y-3">
            {activity.map((event) => {
              const Icon = EVENT_ICONS[event.type as UnitEventType] ?? Pencil;

              return (
                <li key={event.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {t(`types.${event.type}`)}
                      </span>
                      {event.identifierSnapshot && (
                        <span className="text-muted-foreground">
                          {' '}
                          · {event.identifierSnapshot}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(event.createdAt, {
                        addSuffix: true,
                        locale: dateFnsLocale,
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
