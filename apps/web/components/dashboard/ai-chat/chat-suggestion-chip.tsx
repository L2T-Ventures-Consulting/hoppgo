"use client";

import type { ComponentType } from "react";

interface ChatSuggestionChipProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

/**
 * One tap-to-ask action in the chat's empty state, shared by the full page and
 * the modal so the copilot reads as one product across both surfaces. A flat
 * bordered row: the accent belongs to the answer, not to the invitation.
 */
export const ChatSuggestionChip = ({ icon: Icon, label, onClick }: ChatSuggestionChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:bg-muted/60 focus-visible:ring-ring flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
  >
    <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
    <span className="leading-snug">{label}</span>
  </button>
);
