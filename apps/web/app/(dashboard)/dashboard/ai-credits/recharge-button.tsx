"use client";

import type { ComponentProps } from "react";

import { CreditCard } from "lucide-react";

import { Button } from "@louez/ui";
import { cn } from "@louez/utils";

import { openAiCreditsTopup } from "@/components/dashboard/ai-credits-topup-host";

type RechargeButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  label: string;
};

/**
 * Opens the recharge modal from anywhere on the page. The modal itself is
 * mounted once per page by `AiCreditsTopupHost`; every call to action asks for
 * it through the shared window event instead of mounting its own copy.
 */
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
