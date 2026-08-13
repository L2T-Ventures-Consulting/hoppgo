"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@louez/utils";

function ScrollArea({
  className,
  children,
  orientation = "both",
  scrollFade = false,
  scrollbarGutter = false,
  scrollbarClassName,
  viewportClassName,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  orientation?: "horizontal" | "vertical" | "both";
  scrollFade?: boolean;
  scrollbarGutter?: boolean;
  scrollbarClassName?: string;
  viewportClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn(
        orientation === "horizontal" ? "h-auto w-full min-h-0" : "size-full min-h-0",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        className={cn(
          "overscroll-contain rounded-[inherit] outline-none transition-shadows focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-has-overflow-x:overscroll-x-contain",
          orientation === "horizontal" ? "h-auto !overflow-y-hidden" : "h-full",
          orientation === "vertical" && "!overflow-x-hidden",
          "touch-pan-y",
          scrollFade && "[--fade-size:1.5rem]",
          scrollFade &&
            orientation !== "horizontal" &&
            "mask-t-from-[calc(100%-min(var(--fade-size),round(up,var(--scroll-area-overflow-y-start),var(--fade-size))))] mask-b-from-[calc(100%-min(var(--fade-size),round(up,var(--scroll-area-overflow-y-end),var(--fade-size))))]",
          scrollFade &&
            orientation !== "vertical" &&
            "mask-l-from-[calc(100%-min(var(--fade-size),round(up,var(--scroll-area-overflow-x-start),var(--fade-size))))] mask-r-from-[calc(100%-min(var(--fade-size),round(up,var(--scroll-area-overflow-x-end),var(--fade-size))))]",
          scrollbarGutter && "data-has-overflow-y:pe-2.5 data-has-overflow-x:pb-2.5",
          viewportClassName,
        )}
        data-slot="scroll-area-viewport"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" && (
        <ScrollBar className={scrollbarClassName} orientation="vertical" />
      )}
      {orientation !== "vertical" && (
        <ScrollBar className={scrollbarClassName} orientation="horizontal" />
      )}
      {orientation === "both" && <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      className={cn(
        "m-1 flex opacity-0 transition-opacity delay-300 data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5 data-[orientation=horizontal]:flex-col data-hovering:opacity-100 data-scrolling:opacity-100 data-hovering:delay-0 data-scrolling:delay-0 data-hovering:duration-100 data-scrolling:duration-100",
        className,
      )}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        className="relative flex-1 rounded-full bg-foreground/20"
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
