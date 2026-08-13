"use client";

import type { ReactNode } from "react";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import { cn } from "@louez/utils";

import { QuestionCircleIcon } from "../icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

type LabelProps = useRender.ComponentProps<"label"> & {
  /** Content displayed in an information tooltip next to the label. */
  helper?: ReactNode;
  /** Accessible name for the helper trigger when `helper` is not plain text. */
  helperAriaLabel?: string;
};

const Label = ({ children, className, helper, helperAriaLabel, render, ...props }: LabelProps) => {
  const defaultProps = {
    className: cn(
      "inline-flex items-center gap-2 text-base/4.5 sm:text-sm/4 font-medium text-foreground",
      className,
    ),
    "data-slot": "label",
    children,
  };

  const label = useRender({
    defaultTagName: "label",
    props: mergeProps<"label">(defaultProps, props),
    render,
  });

  if (helper === undefined || helper === null) {
    return label;
  }

  const accessibleHelperLabel =
    helperAriaLabel ?? (typeof helper === "string" ? helper : "More information");

  return (
    <span className="inline-flex items-center gap-2" data-slot="label-with-helper">
      {label}
      <TooltipProvider delay={100}>
        <Tooltip>
          <TooltipTrigger
            aria-label={accessibleHelperLabel}
            render={
              <button
                className="focus-visible:ring-ring inline-flex shrink-0 cursor-help rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                type="button"
              />
            }
          >
            <QuestionCircleIcon aria-hidden="true" className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{helper}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
};

export { Label, type LabelProps };
