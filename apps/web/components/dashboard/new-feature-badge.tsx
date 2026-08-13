"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@louez/ui";
import { cn } from "@louez/utils";

import { useWhatsNew } from "@/hooks/use-whats-new";

interface NewFeatureBadgeProps {
  className?: string;
  /** Renders the indicator as a button that clears itself on click. */
  dismissOnClick?: boolean;
  /** Must match a `featureId` declared in `WHATS_NEW_ANNOUNCEMENTS`. */
  featureId: string;
  /** `badge` shows the translated "New" pill, `dot` a bare indicator for tight spots. */
  mode?: "badge" | "dot";
}

export const NewFeatureBadge = ({
  className,
  dismissOnClick = false,
  featureId,
  mode = "badge",
}: NewFeatureBadgeProps) => {
  const { dismissFeature, isFeatureNew } = useWhatsNew();
  const t = useTranslations("dashboard.whatsNew");

  if (!isFeatureNew(featureId)) return null;

  const label = mode === "dot" ? t("newFeatureLabel") : t("newLabel");
  const handleDismiss = () => dismissFeature(featureId);

  if (mode === "dot") {
    // The ring in the surface colour detaches the dot from whatever edge it
    // sits on — without it an 8px dot on a bordered button reads as noise.
    const dotClassName = cn(
      "bg-primary ring-background inline-block size-2.5 shrink-0 rounded-full ring-2",
      className,
    );

    return dismissOnClick ? (
      <button aria-label={label} className={dotClassName} onClick={handleDismiss} type="button" />
    ) : (
      <span className={dotClassName}>
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Badge
      className={cn("uppercase", className)}
      onClick={dismissOnClick ? handleDismiss : undefined}
      render={dismissOnClick ? <button aria-label={label} type="button" /> : undefined}
      size="sm"
      variant="default"
    >
      {label}
    </Badge>
  );
};
