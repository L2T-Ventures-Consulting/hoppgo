"use client";

import { usePathname } from "next/navigation";

import { useTranslations } from "next-intl";

import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@louez/ui";
import { WhatsNewGlassIcon } from "@louez/ui/icons/glass";
import { cn } from "@louez/utils";

import { SidebarLink } from "@/components/dashboard/sidebar-link";
import { usePeriodicFlip } from "@/components/dashboard/use-periodic-flip";
import { useWhatsNew } from "@/hooks/use-whats-new";
import { WHATS_NEW_PAGE_PATH } from "@/lib/whats-new.constants";

/**
 * Changelog entry point, sitting with the other utilities at the foot of the
 * sidebar. The counter is the only place the unread total is surfaced, so it
 * also has to survive the collapsed sidebar — where the badge is hidden and a
 * dot on the icon takes over.
 */
export const WhatsNewSidebarItem = () => {
  const t = useTranslations("dashboard.whatsNew");
  const pathname = usePathname();
  const { unseenCount } = useWhatsNew();

  const active = pathname === WHATS_NEW_PAGE_PATH || pathname.startsWith(`${WHATS_NEW_PAGE_PATH}/`);
  const { flipping, onFlipEnd } = usePeriodicFlip(unseenCount > 0);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        render={<SidebarLink href={WHATS_NEW_PAGE_PATH} />}
        tooltip={t("title")}
      >
        {/* Periodic 3D turn while entries are unread — the badge alone is easy
              to scroll past. */}
        <WhatsNewGlassIcon
          className={cn(flipping && "animate-whats-new-flip")}
          onAnimationEnd={onFlipEnd}
        />
        <span>{t("title")}</span>
      </SidebarMenuButton>
      {unseenCount > 0 && (
        <>
          {/* `top-2.5` has to be restated under the same `peer-data-[size]`
                variant as the default it replaces, otherwise the more specific
                default wins and the pill rides high on these `h-10` buttons. */}
          <SidebarMenuBadge className="bg-primary text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground rounded-full font-semibold peer-data-[size=default]/menu-button:top-2.5">
            {unseenCount > 9 ? "9+" : unseenCount}
            <span className="sr-only">{t("unread")}</span>
          </SidebarMenuBadge>
          {/* Collapsed sidebar: the badge is hidden by its own styles, so the
                icon carries a bare dot instead. */}
          <span
            aria-hidden
            className="bg-primary ring-sidebar absolute top-1 right-1.5 hidden size-2.5 rounded-full ring-2 group-data-[collapsible=icon]:block"
          />
        </>
      )}
    </SidebarMenuItem>
  );
};
