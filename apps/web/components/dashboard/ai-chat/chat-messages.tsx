"use client";

import type { ReactNode } from "react";

import type { UIMessage } from "@ai-sdk/react";

import { cn } from "@louez/utils";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export const ChatMessages = ({ messages, isLoading }: ChatMessagesProps) => (
  <div className="space-y-4 pb-2">
    {messages.map((message) => (
      <div
        key={message.id}
        className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "text-sm leading-relaxed",
            message.role === "user"
              ? // Neutral, not `bg-primary`: `--primary` is near-white in dark
                // mode, which turned the merchant's own bubble into a glare.
                "bg-muted text-foreground max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2"
              : // No avatar, so the answer itself carries the turn: full width
                // reads as the page speaking, a capped column as a stray bubble.
                "text-foreground min-w-0 flex-1 pt-0.5",
          )}
        >
          <MessageParts parts={message.parts} />
        </div>
      </div>
    ))}

    {isLoading && messages[messages.length - 1]?.role === "user" && (
      <div className="flex items-start">
        <span className="flex gap-1.5 pt-1">
          <span className="bg-muted-foreground/50 size-1.5 rounded-full motion-safe:animate-bounce" />
          <span className="bg-muted-foreground/50 size-1.5 rounded-full [animation-delay:150ms] motion-safe:animate-bounce" />
          <span className="bg-muted-foreground/50 size-1.5 rounded-full [animation-delay:300ms] motion-safe:animate-bounce" />
        </span>
      </div>
    )}
  </div>
);

const MessageParts = ({ parts }: { parts: UIMessage["parts"] }) => (
  <>
    {parts.map((part, i) => {
      if (part.type === "text") {
        return <TextContent key={i} text={part.text} />;
      }
      return null;
    })}
  </>
);

/** Render inline formatting: **bold**, `code`, *italic* */
const InlineFormat = ({ text }: { text: string }) => {
  // Split on **bold**, `code`, and *italic* (in order of priority)
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\*[^*]+\*)/);
  return (
    <>
      {parts.map((segment, j) => {
        if (segment.startsWith("**") && segment.endsWith("**")) {
          return (
            <strong key={j} className="font-semibold">
              {segment.slice(2, -2)}
            </strong>
          );
        }
        if (segment.startsWith("`") && segment.endsWith("`")) {
          return (
            <code
              key={j}
              className="bg-foreground/8 text-foreground rounded-md px-1.5 py-0.5 text-xs"
            >
              {segment.slice(1, -1)}
            </code>
          );
        }
        if (segment.startsWith("*") && segment.endsWith("*") && segment.length > 2) {
          return <em key={j}>{segment.slice(1, -1)}</em>;
        }
        return segment;
      })}
    </>
  );
};

const TextContent = ({ text }: { text: string }) => {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" = "ul";
  let listStart = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const Tag = listType;
    elements.push(
      <Tag
        key={`list-${listStart}`}
        className={cn(
          "marker:text-muted-foreground/60 my-1.5 ml-4 space-y-1",
          listType === "ul" ? "list-disc" : "list-decimal",
        )}
      >
        {listItems.map((item, j) => (
          <li key={j}>
            <InlineFormat text={item} />
          </li>
        ))}
      </Tag>,
    );
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<br key={i} />);
      continue;
    }

    // Headers: ## or ###
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const className =
        level === 1
          ? "mt-3 mb-1 text-sm font-semibold"
          : level === 2
            ? "mt-2.5 mb-1 text-sm font-semibold"
            : "text-muted-foreground mt-2 mb-0.5 text-xs font-medium tracking-wide uppercase";
      elements.push(
        <p key={i} className={className}>
          <InlineFormat text={content} />
        </p>,
      );
      continue;
    }

    // Unordered list: - item or * item
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listItems.length === 0) {
        listStart = i;
        listType = "ul";
      }
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list: 1. item
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listItems.length === 0) {
        listStart = i;
        listType = "ol";
      }
      listItems.push(olMatch[1]);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={i}>
        <InlineFormat text={trimmed} />
      </p>,
    );
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
};
