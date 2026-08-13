import type * as React from "react";

interface PromptBenefit {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/**
 * The "why" behind an install / notification prompt: one icon, one short line.
 * Kept out of the sidebar on purpose — it only ever renders inside a dialog.
 */
export const PromptBenefits = ({ items }: { items: PromptBenefit[] }) => (
  <ul className="flex flex-col gap-3">
    {items.map(({ icon: Icon, label }) => (
      <li key={label} className="flex items-center gap-3 text-sm">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <span>{label}</span>
      </li>
    ))}
  </ul>
);
