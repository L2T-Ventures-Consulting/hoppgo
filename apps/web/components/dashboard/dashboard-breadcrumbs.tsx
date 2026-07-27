'use client';

import { Fragment } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useDashboardBreadcrumbs } from './dashboard-breadcrumbs-context';
import { getDashboardBreadcrumbItems } from './util.dashboard-breadcrumbs';

export const DashboardBreadcrumbs = () => {
  const pathname = usePathname();
  const t = useTranslations('dashboard.breadcrumbs');
  const { labels } = useDashboardBreadcrumbs();
  const breadcrumbItems = getDashboardBreadcrumbItems(pathname, labels);

  return (
    <nav
      aria-label={t('label')}
      className="ml-1 min-w-0 flex-1 overflow-hidden"
    >
      <ol className="text-muted-foreground flex min-w-0 items-center gap-1.5 overflow-hidden text-sm">
        <li className="shrink-0">
          {pathname !== '/dashboard' ? (
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              {t('home')}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{t('home')}</span>
          )}
        </li>
        {breadcrumbItems.map((item) => {
          const isCurrentPage = item.href === pathname;
          const label =
            'translationKey' in item
              ? t(item.translationKey)
              : item.label;

          return (
            <Fragment key={item.href}>
              <li aria-hidden="true" className="shrink-0">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li className="min-w-0">
                {isCurrentPage ? (
                  <span
                    aria-current="page"
                    className="text-foreground block truncate font-medium"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-foreground block truncate transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
