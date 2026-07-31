"use client";

import type { ComponentProps } from "react";

import { CreditCard } from "lucide-react";

import { Button } from "@louez/ui";
import { cn } from "@louez/utils";

/**
 * The recharge modal lives once, in the sticky header, next to the balance it
 * refills. Every other call to action on the page asks for it through this
 * window event instead of mounting its own copy.
 */
export const OPEN_AI_CREDITS_TOPUP_EVENT = "ai-credits:open-topup";

export const openAiCreditsTopup = () => {
  window.dispatchEvent(new Event(OPEN_AI_CREDITS_TOPUP_EVENT));
};

type RechargeButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  label: string;
};

/** Opens the recharge modal from anywhere on the credits page. */
export const RechargeButton = ({ label, className, ...props }: RechargeButtonProps) => (
  <Button
    type="button"
    {...props}
    className={cn("transition-transform duration-150 ease-out active:scale-[0.96]", className)}
    onClick={openAiCreditsTopup}
  >
    <CreditCard className="mr-2 h-4 w-4" />
    {label}
  </Button>
);
