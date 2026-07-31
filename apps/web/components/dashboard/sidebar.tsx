"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Gleap from "gleap";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { authClient } from "@louez/auth/client";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Logo,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Sidebar as UISidebar,
} from "@louez/ui";
import {
  AccentSparklesIcon,
  AdminShieldIcon,
  AudienceSolidIcon,
  BotIcon,
  ChartColumnSolidIcon,
  CogSolidIcon,
  CrownIcon,
  DashboardSolidIcon,
  LogoutIcon,
  OpenInNewIcon,
  ProductSolidIcon,
  ReservationsSolidIcon,
  SupportSolidIcon,
  TeamSolidIcon,
  WalletIcon,
} from "@louez/ui/icons";

// import { ReferralSidebarWidget } from '@/components/dashboard/referral-sidebar-widget';
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import { SidebarLink } from "@/components/dashboard/sidebar-link";
import { StoreSwitcher } from "@/components/dashboard/store-switcher";
import { ThemeMenuSub } from "@/components/dashboard/theme-toggle";
import { WhatsNewSidebarItem } from "@/components/dashboard/whats-new-sidebar-item";
import { LanguageMenuSub } from "@/components/ui/language-switcher";

import { useStorefrontUrl } from "@/hooks/use-storefront-url";
import { aiCreditsQueries } from "@/lib/queries/ai-credits.queries";
import { cn } from "@/lib/utils";

interface StoreWithRole {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: "owner" | "member" | "platform_admin";
}

interface DashboardSidebarProps {
  stores: StoreWithRole[];
  currentStoreId: string;
  storeSlug?: string;
  userId: string;
  userEmail: string;
  userImage?: string | null;
  planSlug?: string;
  isPlatformAdmin?: boolean;
  /**
   * null = paid AI credits disabled for this deployment: no wallet entry.
   * `credits` null = unlimited allowance (no count worth showing).
   */
  aiCredits?: { low: boolean; credits: number | null } | null;
}

const mainNavigation = [
  { key: "home", href: "/dashboard", icon: DashboardSolidIcon },
  { key: "reservations", href: "/dashboard/reservations", icon: ReservationsSolidIcon },
  { key: "customers", href: "/dashboard/customers", icon: AudienceSolidIcon },
  { key: "aiAssistant", href: "/dashboard/ai-assistant", icon: BotIcon },
];

const aiCreditsNavigationItem = {
  key: "aiCredits",
  href: "/dashboard/ai-credits",
  icon: WalletIcon,
};

const catalogNavigation = [
  { key: "products", href: "/dashboard/products", icon: ProductSolidIcon },
];

const analyticsNavigation = [
  { key: "analytics", href: "/dashboard/analytics", icon: ChartColumnSolidIcon },
];

const managementNavigation = [
  { key: "team", href: "/dashboard/team", icon: TeamSolidIcon },
  { key: "settings", href: "/dashboard/settings", icon: CogSolidIcon },
];

interface NavigationItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Draws the discreet warning marker (currently: AI credits running out). */
  alert?: boolean;
  /** Numeric badge on the entry (currently: the AI credit balance). */
  badgeCount?: number;
}

interface NavigationSection {
  labelKey?: string;
  items: NavigationItem[];
}

/**
 * The AI wallet only exists when the operator sells credits, so the manage group
 * is assembled per render rather than declared once.
 */
const buildNavigationSections = (
  aiCredits: { low: boolean; credits: number | null } | null,
): NavigationSection[] => [
  { items: mainNavigation },
  { labelKey: "catalog", items: catalogNavigation },
  { labelKey: "analytics", items: analyticsNavigation },
  {
    labelKey: "manage",
    items: aiCredits
      ? [
          ...managementNavigation,
          {
            ...aiCreditsNavigationItem,
            alert: aiCredits.low,
            badgeCount: aiCredits.credits ?? undefined,
          },
        ]
      : managementNavigation,
  },
];

const isNavigationItemActive = (pathname: string, href: string) => {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

const DashboardNavItem = ({ item, pathname }: { item: NavigationItem; pathname: string }) => {
  const t = useTranslations("dashboard.navigation");
  const tSidebar = useTranslations("dashboard.sidebar");
  const format = useFormatter();
  const active = isNavigationItemActive(pathname, item.href);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<SidebarLink href={item.href} />}
        isActive={active}
        tooltip={t(item.key)}
      >
        <item.icon />
        <span>{t(item.key)}</span>
      </SidebarMenuButton>
      {item.badgeCount != null ? (
        /* The vertical offset has to be restated under the same
           `peer-data-[size]` variant as the default it replaces, otherwise the
           more specific default wins and the badge rides high on these `h-10`
           buttons. */
        <SidebarMenuBadge
          className={cn(
            "rounded-full font-semibold peer-data-[size=default]/menu-button:top-2.5",
            item.alert
              ? "bg-badge-warning-background text-badge-warning-foreground peer-hover/menu-button:text-badge-warning-foreground peer-data-active/menu-button:text-badge-warning-foreground"
              : "bg-sidebar-accent",
          )}
        >
          {format.number(Math.floor(item.badgeCount), {
            maximumFractionDigits: 0,
            useGrouping: false,
          })}
          {item.alert && <span className="sr-only">{tSidebar("aiCreditsLow")}</span>}
        </SidebarMenuBadge>
      ) : (
        item.alert && (
          <SidebarMenuBadge className="bg-badge-warning-foreground peer-data-[size=default]/menu-button:top-4 size-2 min-w-0 rounded-full p-0">
            <span className="sr-only">{tSidebar("aiCreditsLow")}</span>
          </SidebarMenuBadge>
        )
      )}
      {item.alert && (
        /* Collapsed sidebar: the badge is hidden by its own styles, so the
           icon carries a bare dot instead. */
        <span
          aria-hidden
          className="bg-badge-warning-foreground ring-sidebar absolute top-1 right-1.5 hidden size-2.5 rounded-full ring-2 group-data-[collapsible=icon]:block"
        />
      )}
    </SidebarMenuItem>
  );
};

const DashboardNavSection = ({
  items,
  labelKey,
  pathname,
}: {
  items: NavigationItem[];
  labelKey?: string;
  pathname: string;
}) => {
  const t = useTranslations("dashboard.sidebar");

  return (
    <SidebarGroup>
      {labelKey && <SidebarGroupLabel>{t(labelKey)}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <DashboardNavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const StoreHeader = ({
  stores,
  currentStoreId,
  storeSlug,
  planSlug,
}: {
  stores: StoreWithRole[];
  currentStoreId: string;
  storeSlug?: string;
  planSlug?: string;
}) => {
  const t = useTranslations("dashboard.sidebar");
  const { getAbsoluteUrl } = useStorefrontUrl(storeSlug ?? "");

  return (
    <SidebarHeader className="border-sidebar-border gap-3 border-b px-0 max-md:px-2">
      <div className="flex min-w-0 items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[state=expanded]:pl-4 max-md:pl-2">
        <div className="flex items-center gap-2">
          <SidebarLink href="/dashboard" className="flex min-w-0 items-center gap-2">
            <Logo className="h-5 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            <Image
              src={"/favicon.svg"}
              width={32}
              height={32}
              alt="Logo"
              className="hidden size-8 shrink-0 group-data-[collapsible=icon]:block"
            />
          </SidebarLink>
          <PlanBadge planSlug={planSlug} />
        </div>

        {storeSlug && (
          <Tooltip>
            <TooltipTrigger
              render={
                <SidebarLink
                  href={getAbsoluteUrl()}
                  target="_blank"
                  className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-md transition-colors group-data-[collapsible=icon]:hidden"
                />
              }
            >
              <OpenInNewIcon className="h-4 w-4" />
              <span className="sr-only">{t("viewStore")}</span>
            </TooltipTrigger>
            <TooltipContent side="right">{t("viewStore")}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mx-auto w-fit group-data-[state=expanded]:w-full max-md:w-full">
        <StoreSwitcher stores={stores} currentStoreId={currentStoreId} />
      </div>
    </SidebarHeader>
  );
};

const UserMenu = ({
  userId,
  userEmail,
  userImage,
  isPlatformAdmin,
}: {
  userId: string;
  userEmail: string;
  userImage?: string | null;
  isPlatformAdmin?: boolean;
}) => {
  const t = useTranslations("dashboard.settings.accountSettings");
  const tAuth = useTranslations("auth");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="hover:bg-background aria-expanded:bg-background aria-expanded:shadow-[0_0_1px_0px_var(--color-border)] min-w-0 *:w-full h-12 w-full justify-start gap-3 px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0"
          />
        }
      >
        <UserAvatar src={userImage} seed={userId} size={32} />
        <span className="truncate min-w-0 text-left text-sm font-medium group-data-[collapsible=icon]:hidden">
          {userEmail}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <ThemeMenuSub />
        <LanguageMenuSub />
        <DropdownMenuItem render={<SidebarLink href="/dashboard/account" />}>
          {t("title")}
        </DropdownMenuItem>
        {isPlatformAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<SidebarLink href="/admin" />}>
              <AdminShieldIcon className="mr-2 h-4 w-4" />
              {t("administration")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/login";
                },
              },
            })
          }
          className="text-destructive cursor-pointer"
        >
          <LogoutIcon className="mr-2 h-4 w-4" />
          {tAuth("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Opens the Gleap widget — a button, not a route, but it reads as a nav row. */
const HelpButton = () => {
  const t = useTranslations("dashboard.sidebar");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={() => Gleap.open()} tooltip={t("help")}>
        <SupportSolidIcon />
        <span>{t("help")}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const DashboardSidebar = ({
  stores,
  currentStoreId,
  storeSlug,
  userId,
  userEmail,
  userImage,
  planSlug,
  isPlatformAdmin,
  aiCredits = null,
}: DashboardSidebarProps) => {
  const pathname = usePathname();
  const balanceQuery = useQuery({
    ...aiCreditsQueries.balance(),
    enabled: aiCredits !== null,
  });
  const liveAiCredits = balanceQuery.data
    ? balanceQuery.data.enabled
      ? { low: balanceQuery.data.low, credits: balanceQuery.data.totalCredits }
      : null
    : aiCredits;
  const navigationSections = buildNavigationSections(liveAiCredits);

  return (
    <TooltipProvider>
      <UISidebar variant="inset" collapsible="icon">
        <StoreHeader
          stores={stores}
          currentStoreId={currentStoreId}
          storeSlug={storeSlug}
          planSlug={planSlug}
        />

        <SidebarContent className="max-md:px-2 ">
          {navigationSections.map((section, index) => (
            <div key={section.labelKey || "main"} className="w-full">
              {index > 0 && <SidebarSeparator />}
              <DashboardNavSection
                items={section.items}
                labelKey={section.labelKey}
                pathname={pathname}
              />
            </div>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-sidebar-border border-t">
          <SidebarMenu>
            <WhatsNewSidebarItem />
            <HelpButton />
          </SidebarMenu>
          {/* <ReferralSidebarWidget /> */}
          <UserMenu
            userId={userId}
            userEmail={userEmail}
            userImage={userImage}
            isPlatformAdmin={isPlatformAdmin}
          />
        </SidebarFooter>
        {/* <SidebarRail /> */}
      </UISidebar>
    </TooltipProvider>
  );
};

function PlanBadge({ planSlug }: { planSlug?: string }) {
  const plan = planSlug || "pay_as_you_go";

  const planConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pro: {
      label: "Pro",
      className: "bg-primary/10 text-primary hover:bg-primary/20",
      icon: <AccentSparklesIcon className="h-3 w-3" />,
    },
    ultra: {
      label: "Ultra",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
      icon: <CrownIcon className="h-3 w-3" />,
    },
  };

  // Pay-as-you-go (the default) shows no plan badge next to the logo — only the
  // paid tiers get a badge.
  const config = planConfig[plan];
  if (!config) return null;

  return (
    <Link
      href="/dashboard/settings/subscription"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors group-data-[collapsible=icon]:hidden",
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </Link>
  );
}
