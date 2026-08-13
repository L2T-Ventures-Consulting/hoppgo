"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";

import { Badge, Button } from "@louez/ui";

interface FeaturePresentationProps {
  variant: "advisor" | "voice";
  /** Extra fact chips (e.g. the voice tariffs), already translated. */
  chips?: string[];
  onActivate: () => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
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
 * What a face of the assistant does, shown INSIDE its card while it is still
 * disabled — the merchant reads the value proposition right where the
 * activation happens, instead of meeting a bare switch.
 *
 * The page title and the breadcrumb already name the feature, so this card
 * deliberately carries no heading and no icon tile: only what the page does not
 * say yet — what it does for you, what it costs, and how to turn it on.
 */
export const FeaturePresentation = ({
  variant,
  chips = [],
  onActivate,
}: FeaturePresentationProps) => {
  const t = useTranslations(`dashboard.aiAssistant.hero.${variant}`);
  const tHero = useTranslations("dashboard.aiAssistant.hero");
  const reducedMotion = useReducedMotion();

  return (
    <div className="bg-card rounded-xl border p-5">
      <motion.div
        className="space-y-4"
        initial={reducedMotion ? false : "hidden"}
        animate="visible"
        variants={containerVariants}
      >
        <ul className="space-y-2">
          {(["b1", "b2", "b3"] as const).map((key) => (
            <motion.li key={key} variants={itemVariants} className="flex items-start gap-2 text-sm">
              <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-pretty">{t(key)}</span>
            </motion.li>
          ))}
        </ul>

        {chips.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Badge key={chip} variant="secondary" className="tabular-nums">
                {chip}
              </Badge>
            ))}
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <Button
            type="button"
            className="gap-1.5 transition-transform duration-150 ease-out active:scale-[0.96]"
            onClick={onActivate}
          >
            <Sparkles className="h-4 w-4" />
            {tHero("activate")}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
