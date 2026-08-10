"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@louez/ui";
import { cn } from "@louez/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  className?: string;
}

/** The chat composer, shared by the full-page chat and the Cmd+Shift+K modal. */
export const ChatInput = ({ onSend, isLoading, className }: ChatInputProps) => {
  const t = useTranslations("dashboard.aiChat");
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep focus on textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el && !isLoading) {
      el.focus();
    }
  }, [isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div
      className={cn(
        // Same focus signature as the design system's Input: border swap plus a
        // 3px ring, nothing tinted.
        "has-focus-visible:border-ring has-focus-visible:ring-ring/24 mx-3 mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors duration-200 has-focus-visible:ring-[3px]",
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("placeholder")}
        disabled={isLoading}
        autoFocus
        rows={1}
        className="field-sizing-content placeholder:text-muted-foreground max-h-30 min-h-10 flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-50"
      />
      <Button
        type="button"
        size="icon-sm"
        className="shrink-0"
        disabled={!hasInput}
        isPending={isLoading}
        onClick={handleSend}
        aria-label={t("send")}
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
};
