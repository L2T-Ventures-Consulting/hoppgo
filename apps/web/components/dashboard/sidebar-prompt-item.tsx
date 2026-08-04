"use client";

import * as React from "react";

import { X } from "lucide-react";

import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@louez/ui";

interface SidebarPromptItemProps {
  /** Glass icon, so the row reads as one of the nav entries. */
  icon: React.ComponentType<{ className?: string }>;
  /** Imperative and short — the row is the whole pitch, details live in the dialog. */
  label: string;
  onOpen: () => void;
  onDismiss: () => void;
  dismissLabel: string;
}

/**
 * A nudge (install the app, turn push on) shaped as a sidebar nav row rather
 * than a card: same glass icon, same height, same hover light. It carries a
 * single line of text and defers every explanation to the dialog it opens, so
 * the footer stays quiet until the user asks.
 *
 * The attention dot rides the icon rather than the right edge: that edge
 * belongs to the dismiss ×, which is permanently visible on touch (`showOnHover`
 * only hides it from `md` up) and would otherwise sit on top of the dot.
 */
export const SidebarPromptItem = ({
  icon: Icon,
  label,
  onOpen,
  onDismiss,
  dismissLabel,
}: SidebarPromptItemProps) => (
  <SidebarMenuItem>
    <SidebarMenuButton onClick={onOpen} tooltip={label}>
      <Icon />
      <span>{label}</span>
    </SidebarMenuButton>
    {/* Pinned to the icon's top-right corner: `left-5.5`/`top-2` is where that
        corner falls in an expanded `h-10 p-2` row with a `size-5` icon. Once
        collapsed the button is a centred 32px square, so the dot switches to
        the same right-hand offsets the other sidebar markers use. */}
    <span
      aria-hidden
      className="bg-primary ring-sidebar pointer-events-none absolute top-2 left-5.5 size-2.5 rounded-full ring-2 group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1.5 group-data-[collapsible=icon]:left-auto"
    />
    <SidebarMenuAction
      showOnHover
      onClick={onDismiss}
      aria-label={dismissLabel}
      className="top-1/2 -translate-y-1/2 peer-data-[size=default]/menu-button:top-1/2"
    >
      <X />
    </SidebarMenuAction>
  </SidebarMenuItem>
);
