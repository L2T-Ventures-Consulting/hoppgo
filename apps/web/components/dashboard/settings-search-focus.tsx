"use client";

import { useEffect } from "react";

import { usePathname, useSearchParams } from "next/navigation";
import { useMessages } from "next-intl";

import { SETTINGS_NAVIGATION_ITEMS } from "./settings-navigation.constants";
import { getMessageText } from "./util.settings-search";
import {
  applySettingsSearchHighlight,
  findSettingsSearchTargets,
  removeSettingsSearchHighlight,
  removeSettingsSearchParamsFromUrl,
  SETTINGS_SEARCH_ITEM_PARAM,
  SETTINGS_SEARCH_QUERY_PARAM,
  type SettingsSearchTargets,
} from "./util.settings-search-focus";

export const SettingsSearchFocus = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const messages = useMessages();

  useEffect(() => {
    const query = searchParams.get(SETTINGS_SEARCH_QUERY_PARAM)?.trim();
    if (!query) {
      return;
    }
    const searchQuery = query;

    const itemId = searchParams.get(SETTINGS_SEARCH_ITEM_PARAM);
    const item = SETTINGS_NAVIGATION_ITEMS.find((candidate) => candidate.id === itemId);
    const fallbackLabel = item ? getMessageText(messages, item.labelPath) : "";
    const root = document.querySelector<HTMLElement>("[data-dashboard-content]");

    if (!root) {
      return;
    }
    const contentRoot = root;

    let activeTargets: SettingsSearchTargets | null = null;
    let animationFrame = 0;
    let fallbackTimer = 0;
    let removalTimer = 0;
    let expiryTimer = 0;
    let allowFallback = false;

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(tryFocusMatch);
    });

    const finish = (targets: SettingsSearchTargets) => {
      activeTargets = targets;
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(expiryTimer);
      applySettingsSearchHighlight(targets);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      targets.scrollTarget.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });

      removalTimer = window.setTimeout(() => {
        removeSettingsSearchHighlight(targets);
        removeSettingsSearchParamsFromUrl();
      }, 3600);
    };

    function tryFocusMatch() {
      if (activeTargets) {
        return;
      }

      const targets =
        findSettingsSearchTargets(contentRoot, searchQuery) ||
        (allowFallback && fallbackLabel
          ? findSettingsSearchTargets(contentRoot, fallbackLabel)
          : null);

      if (targets) {
        finish(targets);
      }
    }

    observer.observe(contentRoot, { childList: true, characterData: true, subtree: true });
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = window.requestAnimationFrame(tryFocusMatch);
    });
    fallbackTimer = window.setTimeout(() => {
      allowFallback = true;
      animationFrame = window.requestAnimationFrame(tryFocusMatch);
    }, 1200);
    expiryTimer = window.setTimeout(() => {
      observer.disconnect();
      removeSettingsSearchParamsFromUrl();
    }, 5000);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(expiryTimer);
      window.clearTimeout(removalTimer);
      if (activeTargets) {
        removeSettingsSearchHighlight(activeTargets);
      }
    };
  }, [messages, pathname, searchParams]);

  return null;
};
