"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Package,
  Sparkles,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardIconTile } from "@/components/dashboard/shared/dashboard-icon-tile";

import { ChatDiscoveryCard } from "./chat-discovery-card";
import { ChatSuggestionChip } from "./chat-suggestion-chip";

/** Whether a customer-facing surface should be advertised, and behind which CTA. */
export type ChatDiscovery = "hidden" | "activate" | "upgrade";

interface ChatEmptyStateProps {
  onPrompt: (text: string) => void;
  /** Defaults to hidden so the modal can reuse this without the page's plan lookups. */
  advisorDiscovery?: ChatDiscovery;
  voiceDiscovery?: ChatDiscovery;
}

/** Every chip is phrased against a real tool (calendar_upcoming, get_revenue_report, …). */
const SUGGESTIONS = [
  { key: "reservations", icon: CalendarDays },
  { key: "stats", icon: BarChart3 },
  { key: "products", icon: Package },
  { key: "customers", icon: Users },
  { key: "overdue", icon: CalendarClock },
  { key: "pending", icon: ClipboardList },
] as const;

// One orchestrated page-load moment: each chunk fades up with a light blur,
// mirroring the entrance the assistant pages already use.
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: [0.2, 0, 0, 1] as const },
  },
};

/**
 * The chat's welcome, shared by the full page and the modal: a greeting, the
 * most frequent actions as one-click chips, and — only while a customer-facing
 * surface is still disabled — a quiet footer pointing at it. Deliberately not
 * a marketing hero: the chips ARE the content.
 */
export const ChatEmptyState = ({
  onPrompt,
  advisorDiscovery = "hidden",
  voiceDiscovery = "hidden",
}: ChatEmptyStateProps) => {
  const t = useTranslations("dashboard.aiChat");
  const tHero = useTranslations("dashboard.aiAssistant.hero");
  const reducedMotion = useReducedMotion();

  const showDiscovery = advisorDiscovery !== "hidden" || voiceDiscovery !== "hidden";

  return (
    <motion.div
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 py-4 sm:gap-8"
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 text-center">
        <DashboardIconTile icon={Sparkles} accent="primary" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-balance sm:text-xl">
            {t("emptyState")}
          </h2>
          <p className="text-muted-foreground text-sm text-balance">{t("emptyStateHint")}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map(({ key, icon }) => {
          const prompt = t(`suggestions.${key}`);
          return (
            <ChatSuggestionChip
              key={key}
              icon={icon}
              label={prompt}
              onClick={() => onPrompt(prompt)}
            />
          );
        })}
      </motion.div>

      {showDiscovery && (
        <motion.div variants={itemVariants} className="border-t pt-4">
          <p className="text-muted-foreground px-2 text-xs sm:px-3">{tHero("eyebrow")}</p>
          <div className="-mx-2 mt-1 space-y-0.5 sm:-mx-3">
            {advisorDiscovery !== "hidden" && (
              <ChatDiscoveryCard variant="advisor" hasAccess={advisorDiscovery === "activate"} />
            )}
            {voiceDiscovery !== "hidden" && (
              <ChatDiscoveryCard variant="voice" hasAccess={voiceDiscovery === "activate"} />
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
