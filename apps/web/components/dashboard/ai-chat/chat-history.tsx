"use client";

import { useCallback, useEffect, useImperativeHandle, useState, useTransition } from "react";
import type { Ref } from "react";

import { MessageSquare, PenSquare, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Skeleton } from "@louez/ui";
import { cn } from "@louez/utils";

import { listChats, type ChatSummary } from "@/app/(dashboard)/dashboard/ai-chat-actions";

export interface ChatHistoryHandle {
  refresh: () => void;
}

interface ChatHistoryProps {
  ref?: Ref<ChatHistoryHandle>;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  open: boolean;
  /**
   * 'modal' (default) is the collapsible sidebar inside the chat modal, whose
   * width animates with `open`. 'page' is the always-open rail of the
   * full-page chat: the parent owns width/border/background, and the compact
   * header gives way to a full "new conversation" button.
   */
  variant?: "modal" | "page";
  className?: string;
}

/** Group conversations by relative date: today, yesterday, previous 7 days, older. */
const groupByDate = (
  chats: ChatSummary[],
  labels: { today: string; yesterday: string; week: string; older: string },
) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86_400_000);

  const groups: { label: string; items: ChatSummary[] }[] = [];
  const buckets = new Map<string, ChatSummary[]>();

  for (const chat of chats) {
    const t = new Date(chat.updatedAt).getTime();
    let label: string;
    if (t >= todayStart.getTime()) label = labels.today;
    else if (t >= yesterdayStart.getTime()) label = labels.yesterday;
    else if (t >= weekStart.getTime()) label = labels.week;
    else label = labels.older;

    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(chat);
  }

  // Maintain order: today → yesterday → week → older
  for (const label of [labels.today, labels.yesterday, labels.week, labels.older]) {
    const items = buckets.get(label);
    if (items?.length) groups.push({ label, items });
  }

  return groups;
};

export const ChatHistory = ({
  ref,
  activeChatId,
  onSelectChat,
  onNewChat,
  open,
  variant = "modal",
  className,
}: ChatHistoryProps) => {
  const t = useTranslations("dashboard.aiChat");
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isPending, startTransition] = useTransition();

  const fetchChats = useCallback(() => {
    startTransition(async () => {
      const result = await listChats();
      if (result.chats) setChats(result.chats);
    });
  }, []);

  // Expose refresh to parent
  useImperativeHandle(ref, () => ({ refresh: fetchChats }), [fetchChats]);

  // Fetch on open
  useEffect(() => {
    if (open) fetchChats();
  }, [open, fetchChats]);

  const groups = groupByDate(chats, {
    today: t("history.today"),
    yesterday: t("history.yesterday"),
    week: t("history.week"),
    older: t("history.older"),
  });

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        variant === "modal" &&
          "bg-muted/30 border-r transition-[width,opacity] duration-200 ease-out",
        variant === "modal" && (open ? "w-64 opacity-100" : "w-0 overflow-hidden opacity-0"),
        className,
      )}
    >
      {/* Header */}
      {variant === "page" ? (
        <div className="px-3 pt-3 pb-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onNewChat}
          >
            <PenSquare className="size-3.5" />
            {t("newConversation")}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-muted-foreground text-xs font-medium">{t("history.title")}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={onNewChat}
            aria-label={t("newConversation")}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isPending && chats.length === 0 ? (
          <div className="space-y-1 px-1 pt-1">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 rounded-xl" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <MessageSquare className="text-muted-foreground/60 mb-2 size-5" />
            <p className="text-muted-foreground text-xs">{t("history.empty")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-muted-foreground/60 mb-1 px-2 text-[10px] font-medium tracking-wider uppercase">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={cn(
                        "focus-visible:ring-ring flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
                        // Active reads as a raised chip (the sidebar pattern),
                        // never as a tinted surface.
                        chat.id === activeChatId
                          ? "bg-background text-foreground font-medium shadow-[0_0_0_1px_var(--color-border)]"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{chat.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
