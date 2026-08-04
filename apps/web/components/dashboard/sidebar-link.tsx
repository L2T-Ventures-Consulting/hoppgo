"use client";

import Link from "next/link";

import { useSidebar } from "@louez/ui";

/**
 * A `Link` for anything living inside the sidebar: on mobile the sidebar is a
 * drawer covering the page, so following a link there has to close it.
 */
export const SidebarLink = ({ onClick, ...props }: React.ComponentProps<typeof Link>) => {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (isMobile && !event.defaultPrevented) {
          setOpenMobile(false);
        }
      }}
    />
  );
};
