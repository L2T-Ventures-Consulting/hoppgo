"use client";

import { useCallback, useEffect, useRef } from "react";

import type { UIMessage } from "@ai-sdk/react";

/**
 * How close to the bottom (px) still counts as "reading the latest". Inside
 * that band the transcript follows the stream; outside it the merchant is the
 * one driving the viewport.
 */
const STICK_THRESHOLD = 80;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Keeps a chat transcript pinned to its latest message without ever seizing
 * the viewport — shared by the full-page chat and the Cmd+Shift+K modal, which
 * both used to force a smooth `scrollTo(bottom)` on every streamed delta and
 * dragged a merchant scrolling back through the answer down again each token.
 *
 * The follow only breaks on a deliberate scroll *up*: the smooth scrolls this
 * hook triggers itself only ever increase `scrollTop`, so they can never unpin
 * themselves mid-animation. Coming back near the bottom re-arms it.
 */
export const useStickToBottom = (messages: UIMessage[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const scrolledUp = element.scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = element.scrollTop;

    if (distanceFromBottom < STICK_THRESHOLD) isPinnedRef.current = true;
    else if (scrolledUp) isPinnedRef.current = false;
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const firstId = messages[0]?.id ?? null;
    const lastMessage = messages[messages.length - 1];
    const lastId = lastMessage?.id ?? null;
    const isNewMessage = lastId !== lastMessageIdRef.current;
    const isNewConversation = firstId !== firstMessageIdRef.current;

    lastMessageIdRef.current = lastId;
    firstMessageIdRef.current = firstId;

    // What the merchant just sent — and a conversation they just opened from
    // the history — always outrank wherever they had scrolled to.
    if (isNewConversation || (isNewMessage && lastMessage?.role === "user")) {
      isPinnedRef.current = true;
    }

    if (!isPinnedRef.current) return;

    element.scrollTo({
      top: element.scrollHeight,
      // A streamed delta lands every few milliseconds: animating each one never
      // settles, so only a whole new message earns a smooth scroll. `instant`
      // rather than `auto`, which would defer to the container's
      // `motion-safe:scroll-smooth`.
      behavior: isNewMessage && !prefersReducedMotion() ? "smooth" : "instant",
    });
  }, [messages]);

  return { scrollRef, onScroll: handleScroll };
};
