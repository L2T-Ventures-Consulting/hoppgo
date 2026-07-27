"use client";

import { Fragment, useMemo, useState } from "react";
import type { ComponentType } from "react";

import { useHotkey } from "@tanstack/react-hotkeys";
import { ArrowDown, ArrowUp, CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";

import {
  Button,
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
  DialogTitle,
} from "@louez/ui";
import {
  AnalyticsIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ExternalLinkIcon,
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
} from "@louez/ui/icons";

import { cn } from "@louez/utils";

import { useStore } from "@/contexts/store-context";
import { env } from "@/env";
import { keyboardShortcuts } from "@/lib/keyboard-shortcuts";

import {
  SETTINGS_NAVIGATION_GROUPS,
  SETTINGS_NAVIGATION_ITEMS,
} from "../settings-navigation.constants";
import { buildSettingsSearchHref } from "../util.settings-search-focus";
import {
  getMessageText,
  getSearchableMessageText,
  getSettingsSearchScore,
  normalizeSettingsSearchText,
} from "../util.settings-search";
import { ChatModal } from "./chat-modal";

type CommandActionBase = {
  icon: ComponentType<{ className?: string }>;
  keywords: string;
  label: string;
  shortcut?: string;
  value: string;
};

type CommandAction =
  | (CommandActionBase & { href: string; kind: "navigate" })
  | (CommandActionBase & { href: string; kind: "external" })
  | (CommandActionBase & { kind: "createReservation" })
  | (CommandActionBase & { kind: "ai" })
  | (CommandActionBase & {
      description: string;
      href: string;
      itemId: string;
      kind: "settingsSearch";
    });

type CommandGroupDefinition = {
  items: CommandAction[];
  value: string;
};

type DashboardCommandPaletteProps = {
  isPlatformAdmin?: boolean;
  onCreateReservation: () => void;
  showAIChat: boolean;
};

export const DashboardCommandPalette = ({
  isPlatformAdmin = false,
  onCreateReservation,
  showAIChat,
}: DashboardCommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [aiChatOpen, setAIChatOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tSettingsNavigation = useTranslations("dashboard.settings.settingsNavigation");
  const messages = useMessages();
  const { storeSlug } = useStore();

  useHotkey(
    keyboardShortcuts.commandPalette.open.hotkey,
    () => {
      setQuery("");
      setOpen((currentOpen) => !currentOpen);
    },
    { ignoreInputs: false, requireReset: true },
  );

  useHotkey(
    keyboardShortcuts.commandPalette.ai.hotkey,
    () => {
      setOpen(false);
      setAIChatOpen(true);
    },
    { enabled: showAIChat, ignoreInputs: false, requireReset: true },
  );

  const toolActions: CommandAction[] = [
    {
      value: "view-storefront",
      label: t("sidebar.viewStore"),
      keywords: "boutique vitrine storefront store site public preview",
      icon: ExternalLinkIcon,
      kind: "external",
      href: `https://${storeSlug}.${env.NEXT_PUBLIC_APP_DOMAIN}`,
    },
  ];

  if (showAIChat) {
    toolActions.push({
      value: "open-ai-assistant",
      label: t("aiChat.open"),
      keywords: "ia ai assistant demander question aide help",
      icon: SparklesIcon,
      kind: "ai",
      shortcut: keyboardShortcuts.commandPalette.ai.label,
    });
  }

  const settingsSearchDocuments = useMemo(
    () =>
      SETTINGS_NAVIGATION_ITEMS.filter(
        (item) => !item.platformAdminOnly || isPlatformAdmin,
      ).map((item) => ({
        ...item,
        content: getSearchableMessageText(messages, item.searchPaths),
        description: getMessageText(messages, item.descriptionPath),
        label: getMessageText(messages, item.labelPath),
      })),
    [isPlatformAdmin, messages],
  );

  const trimmedQuery = query.trim();

  const settingsGroups: CommandGroupDefinition[] = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }

    const matches = settingsSearchDocuments
      .map((item) => {
        const score = getSettingsSearchScore({ ...item, query: trimmedQuery });

        return score === null ? null : { ...item, score };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => left.score - right.score);

    return SETTINGS_NAVIGATION_GROUPS.map((group) => ({
      value: `${t("navigation.settings")} · ${tSettingsNavigation(`groups.${group}`)}`,
      items: matches
        .filter((item) => item.group === group)
        .map(
          (item): CommandAction => ({
            value: `settings-${item.id}`,
            label: item.label,
            description: item.description,
            keywords: "",
            icon: item.icon,
            kind: "settingsSearch",
            href: item.href,
            itemId: item.id,
          }),
        ),
    })).filter((group) => group.items.length > 0);
  }, [settingsSearchDocuments, t, tSettingsNavigation, trimmedQuery]);

  const commandGroups = [
    {
      value: t("commandPalette.groups.create"),
      items: [
        {
          value: "new-reservation",
          label: t("sidebar.newReservation"),
          keywords: "reservation booking location commande creer ajouter new create",
          icon: CalendarIcon,
          kind: "createReservation",
        },
        {
          value: "new-product",
          label: t("products.addProduct"),
          keywords:
            "produit article materiel catalogue product item equipment creer ajouter new create",
          icon: PackageIcon,
          kind: "navigate",
          href: "/dashboard/products/new",
        },
        {
          value: "new-customer",
          label: t("customers.addCustomer"),
          keywords: "client locataire contact customer renter creer ajouter new create",
          icon: UsersIcon,
          kind: "navigate",
          href: "/dashboard/customers/new",
        },
      ],
    },
    {
      value: t("commandPalette.groups.navigate"),
      items: [
        {
          value: "dashboard",
          label: t("navigation.home"),
          keywords: "accueil home dashboard tableau de bord",
          icon: HomeIcon,
          kind: "navigate",
          href: "/dashboard",
        },
        {
          value: "calendar",
          label: t("navigation.calendar"),
          keywords: "calendrier planning agenda schedule disponibilites",
          icon: CalendarDaysIcon,
          kind: "navigate",
          href: "/dashboard/reservations?view=calendar",
        },
        {
          value: "reservations",
          label: t("navigation.reservations"),
          keywords: "reservations bookings locations commandes rentals",
          icon: CalendarIcon,
          kind: "navigate",
          href: "/dashboard/reservations",
        },
        {
          value: "products",
          label: t("navigation.products"),
          keywords: "produits articles materiel catalogue products items",
          icon: PackageIcon,
          kind: "navigate",
          href: "/dashboard/products",
        },
        {
          value: "customers",
          label: t("navigation.customers"),
          keywords: "clients locataires contacts customers renters",
          icon: UsersIcon,
          kind: "navigate",
          href: "/dashboard/customers",
        },
        {
          value: "analytics",
          label: t("navigation.analytics"),
          keywords:
            "analyses statistiques performance chiffre affaires revenus analytics statistics revenue",
          icon: AnalyticsIcon,
          kind: "navigate",
          href: "/dashboard/analytics",
        },
        {
          value: "settings",
          label: t("navigation.settings"),
          keywords: "parametres reglages configuration settings preferences",
          icon: SettingsIcon,
          kind: "navigate",
          href: "/dashboard/settings",
        },
      ],
    },
    {
      value: t("commandPalette.groups.tools"),
      items: toolActions,
    },
  ] satisfies CommandGroupDefinition[];

  const queryTokens = normalizeSettingsSearchText(trimmedQuery).split(/\s+/).filter(Boolean);

  const matchesQuery = (action: CommandAction) => {
    const searchableText = normalizeSettingsSearchText(`${action.label} ${action.keywords}`);

    return queryTokens.every((token) => searchableText.includes(token));
  };

  const visibleGroups: CommandGroupDefinition[] = [
    ...commandGroups
      .map((group) => ({
        ...group,
        items: queryTokens.length > 0 ? group.items.filter(matchesQuery) : group.items,
      }))
      .filter((group) => group.items.length > 0),
    ...settingsGroups,
  ];

  const runAction = (action: CommandAction) => {
    setOpen(false);

    if (action.kind === "settingsSearch") {
      router.push(
        buildSettingsSearchHref({ href: action.href, itemId: action.itemId, query: trimmedQuery }),
      );
      return;
    }

    if (action.kind === "navigate") {
      router.push(action.href);
      return;
    }

    if (action.kind === "external") {
      window.open(action.href, "_blank", "noopener,noreferrer");
      return;
    }

    if (action.kind === "createReservation") {
      onCreateReservation();
      return;
    }

    setAIChatOpen(true);
  };

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);

          if (nextOpen) {
            setQuery("");
          }
        }}
      >
        <CommandDialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="bg-background/70 text-muted-foreground hidden h-9 min-w-48 justify-start gap-2 hover:bg-background hover:text-foreground lg:flex"
            />
          }
        >
          <Search className="size-4" />
          <span className="min-w-0 flex-1 truncate text-left">{t("commandPalette.trigger")}</span>
          <kbd className="bg-muted text-muted-foreground/70 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium">
            {keyboardShortcuts.commandPalette.open.label}
          </kbd>
        </CommandDialogTrigger>

        <CommandDialogTrigger
          aria-label={t("commandPalette.title")}
          render={<Button type="button" variant="outline" size="icon" className="lg:hidden" />}
        >
          <Search className="size-4" />
        </CommandDialogTrigger>

        <CommandDialogPopup>
          <DialogTitle className="sr-only">{t("commandPalette.title")}</DialogTitle>
          <Command
            filter={null}
            items={visibleGroups}
            value={query}
            onValueChange={setQuery}
            itemToStringValue={(itemValue) => {
              if (
                typeof itemValue !== "object" ||
                itemValue === null ||
                !("label" in itemValue) ||
                typeof itemValue.label !== "string"
              ) {
                return "";
              }

              return itemValue.label;
            }}
          >
            <CommandInput
              aria-label={t("commandPalette.title")}
              placeholder={t("commandPalette.placeholder")}
            />
            <CommandPanel>
              <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>
              <CommandList>
                {(group: CommandGroupDefinition, groupIndex: number) => (
                  <Fragment key={group.value}>
                    <CommandGroup items={group.items}>
                      <CommandGroupLabel>{group.value}</CommandGroupLabel>
                      <CommandCollection>
                        {(action: CommandAction) => (
                          <CommandItem
                            key={action.value}
                            value={action}
                            onClick={() => runAction(action)}
                            className={cn(
                              "gap-2.5 py-2",
                              action.kind === "settingsSearch" && "items-start",
                            )}
                          >
                            <action.icon
                              className={cn(
                                "text-muted-foreground size-4 shrink-0",
                                action.kind === "settingsSearch" && "mt-0.5",
                              )}
                            />
                            {action.kind === "settingsSearch" ? (
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{action.label}</span>
                                <span className="text-muted-foreground line-clamp-2 block text-xs">
                                  {action.description}
                                </span>
                              </span>
                            ) : (
                              <span className="min-w-0 flex-1 truncate">{action.label}</span>
                            )}
                            {action.shortcut && (
                              <CommandShortcut>{action.shortcut}</CommandShortcut>
                            )}
                          </CommandItem>
                        )}
                      </CommandCollection>
                    </CommandGroup>
                    {groupIndex < visibleGroups.length - 1 && <CommandSeparator />}
                  </Fragment>
                )}
              </CommandList>
            </CommandPanel>
            <CommandFooter className="hidden sm:flex">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-muted rounded border p-0.5">
                      <ArrowUp className="size-3" />
                    </kbd>
                    <kbd className="bg-muted rounded border p-0.5">
                      <ArrowDown className="size-3" />
                    </kbd>
                  </span>
                  <span>{t("commandPalette.footer.navigate")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="bg-muted rounded border p-0.5">
                    <CornerDownLeft className="size-3" />
                  </kbd>
                  <span>{t("commandPalette.footer.open")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
                  Esc
                </kbd>
                <span>{t("commandPalette.footer.close")}</span>
              </div>
            </CommandFooter>
          </Command>
        </CommandDialogPopup>
      </CommandDialog>

      {showAIChat && <ChatModal open={aiChatOpen} onOpenChange={setAIChatOpen} />}
    </>
  );
};
