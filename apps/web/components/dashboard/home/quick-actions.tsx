"use client";

import type { ComponentType } from "react";

import { useTranslations } from "next-intl";

import { CalendarSolidIcon, ProductSolidIcon, ZapSolidIcon } from "@louez/ui/icons";

import type { HomeAccent } from "./home-accent";
import { HomeIconTile } from "./home-icon-tile";
import { HomeListRow } from "./home-list-row";
import { HomeSectionCard } from "./home-section-card";
import type { StoreState } from "./home-types";

interface QuickAction {
  key: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  accent: HomeAccent;
}

const ADD_PRODUCT: QuickAction = {
  key: "addProduct",
  icon: ProductSolidIcon,
  href: "/dashboard/products/new",
  accent: "neutral",
};

const ADD_RESERVATION: QuickAction = {
  key: "addReservation",
  icon: CalendarSolidIcon,
  href: "/dashboard/reservations/new?source=quick_action",
  accent: "neutral",
};

/** The next best action is accented; the others stay neutral. */
const getQuickActions = (storeState: StoreState): QuickAction[] => {
  if (storeState === "virgin") {
    return [{ ...ADD_PRODUCT, accent: "primary" }];
  }

  if (storeState === "building") {
    return [ADD_PRODUCT, { ...ADD_RESERVATION, accent: "primary" }];
  }

  return [ADD_PRODUCT, ADD_RESERVATION];
};

interface QuickActionsProps {
  storeState: StoreState;
  className?: string;
}

export const QuickActions = ({ storeState, className }: QuickActionsProps) => {
  const t = useTranslations("dashboard.home");

  return (
    <HomeSectionCard
      title={t("quickActions.title")}
      description={t("quickActions.description")}
      icon={ZapSolidIcon}
      accent="review"
      className={className}
    >
      <div className="-mx-2 space-y-0.5 sm:-mx-3">
        {getQuickActions(storeState).map((action) => (
          <HomeListRow
            key={action.key}
            href={action.href}
            leading={<HomeIconTile icon={action.icon} accent={action.accent} />}
            title={
              <span className="truncate font-medium">{t(`quickActions.${action.key}.title`)}</span>
            }
            subtitle={
              <span className="truncate">{t(`quickActions.${action.key}.description`)}</span>
            }
          />
        ))}
      </div>
    </HomeSectionCard>
  );
};
