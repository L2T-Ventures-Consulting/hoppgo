'use client';

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { XIcon } from 'lucide-react';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { cn } from '@louez/utils';

import { Button } from './button';
import { ScrollArea } from './scroll-area';

type DrawerPosition = 'right' | 'left' | 'top' | 'bottom';

const DrawerContext = createContext<{ position: DrawerPosition }>({
  position: 'bottom',
});

const directionMap: Record<
  DrawerPosition,
  DrawerPrimitive.Root.Props['swipeDirection']
> = {
  bottom: 'down',
  left: 'left',
  right: 'right',
  top: 'up',
};

function Drawer({
  swipeDirection,
  position = 'bottom',
  ...props
}: DrawerPrimitive.Root.Props & {
  position?: DrawerPosition;
}) {
  return (
    <DrawerContext.Provider value={{ position }}>
      <DrawerPrimitive.Root
        swipeDirection={swipeDirection ?? directionMap[position]}
        {...props}
      />
    </DrawerContext.Provider>
  );
}

const DrawerPortal = DrawerPrimitive.Portal;

function DrawerTrigger(props: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      className={cn(
        'fixed inset-0 z-50 bg-black/32 opacity-[calc(1-var(--drawer-swipe-progress))] backdrop-blur-sm transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute',
        className,
      )}
      data-slot="drawer-backdrop"
      {...props}
    />
  );
}

function DrawerViewport({
  className,
  position,
  style,
  variant = 'default',
  ...props
}: DrawerPrimitive.Viewport.Props & {
  position: DrawerPosition;
  variant?: 'default' | 'straight' | 'inset';
}) {
  const visualViewport = useVisualViewportBounds(position === 'bottom');
  const viewportStyle = {
    ...style,
    '--drawer-visual-viewport-height': visualViewport.height
      ? `${visualViewport.height}px`
      : '100dvh',
    '--drawer-visual-viewport-top': `${visualViewport.offsetTop}px`,
  } as React.CSSProperties;

  return (
    <DrawerPrimitive.Viewport
      className={cn(
        'fixed inset-x-0 top-(--drawer-visual-viewport-top,0px) bottom-auto z-50 h-(--drawer-visual-viewport-height,100dvh) touch-none [--bleed:--spacing(12)] [--inset:--spacing(0)]',
        position === 'bottom' && 'grid grid-rows-[1fr_auto] pt-12',
        position === 'top' && 'grid grid-rows-[auto_1fr] pb-12',
        position === 'left' && 'flex justify-start',
        position === 'right' && 'flex justify-end',
        variant === 'inset' && 'px-(--inset) sm:[--inset:--spacing(4)]',
        variant === 'inset' && position !== 'bottom' && 'pt-(--inset)',
        variant === 'inset' && position !== 'top' && 'pb-(--inset)',
        className,
      )}
      data-slot="drawer-viewport"
      style={viewportStyle}
      {...props}
    />
  );
}

type VisualViewportBounds = {
  height: number;
  offsetTop: number;
};

function useVisualViewportBounds(enabled: boolean): VisualViewportBounds {
  const [bounds, setBounds] = useState<VisualViewportBounds>({
    height: 0,
    offsetTop: 0,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.visualViewport) {
      setBounds({ height: 0, offsetTop: 0 });
      return;
    }

    const visualViewport = window.visualViewport;
    const updateBounds = () => {
      const nextBounds = {
        height: Math.round(visualViewport.height),
        offsetTop: Math.round(visualViewport.offsetTop),
      };

      setBounds((currentBounds) =>
        currentBounds.height === nextBounds.height &&
        currentBounds.offsetTop === nextBounds.offsetTop
          ? currentBounds
          : nextBounds,
      );
    };

    updateBounds();
    visualViewport.addEventListener('resize', updateBounds);
    visualViewport.addEventListener('scroll', updateBounds);

    return () => {
      visualViewport.removeEventListener('resize', updateBounds);
      visualViewport.removeEventListener('scroll', updateBounds);
    };
  }, [enabled]);

  return bounds;
}

function DrawerPopup({
  className,
  children,
  showCloseButton = false,
  position: positionProp,
  variant = 'default',
  ...props
}: DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  position?: DrawerPosition;
  variant?: 'default' | 'straight' | 'inset';
}) {
  const { position: contextPosition } = useContext(DrawerContext);
  const position = positionProp ?? contextPosition;

  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DrawerViewport position={position} variant={variant}>
        <DrawerPrimitive.Popup
          className={cn(
            'relative flex max-h-full min-h-0 w-full min-w-0 flex-col bg-popover text-popover-foreground shadow-lg/5 outline-none transition-[transform,box-shadow,height,background-color] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform [--inset:--spacing(0)] before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] after:pointer-events-none after:absolute after:bg-popover data-swiping:select-none data-ending-style:shadow-transparent data-starting-style:shadow-transparent data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
            'touch-none',
            position === 'bottom' &&
              'row-start-2 border-t data-ending-style:transform-[translateY(calc(100%+env(safe-area-inset-bottom,0px)+var(--inset)))] data-starting-style:transform-[translateY(calc(100%+env(safe-area-inset-bottom,0px)+var(--inset)))] transform-[translateY(var(--drawer-swipe-movement-y))] after:inset-x-0 after:top-full after:h-(--bleed)',
            position === 'top' &&
              'border-b data-ending-style:transform-[translateY(calc(-100%-var(--inset)))] data-starting-style:transform-[translateY(calc(-100%-var(--inset)))] transform-[translateY(var(--drawer-swipe-movement-y))] after:inset-x-0 after:bottom-full after:h-(--bleed)',
            position === 'left' &&
              'w-[calc(100%-(--spacing(12)))] max-w-md border-e data-ending-style:transform-[translateX(calc(-100%-var(--inset)))] data-starting-style:transform-[translateX(calc(-100%-var(--inset)))] transform-[translateX(var(--drawer-swipe-movement-x))] after:inset-y-0 after:end-full after:w-(--bleed)',
            position === 'right' &&
              'col-start-2 w-[calc(100%-(--spacing(12)))] max-w-md border-s data-ending-style:transform-[translateX(calc(100%+var(--inset)))] data-starting-style:transform-[translateX(calc(100%+var(--inset)))] transform-[translateX(var(--drawer-swipe-movement-x))] after:inset-y-0 after:start-full after:w-(--bleed)',
            variant !== 'straight' &&
              cn(
                position === 'bottom' && 'rounded-t-2xl',
                position === 'top' && 'rounded-b-2xl',
                position === 'left' && 'rounded-e-2xl',
                position === 'right' && 'rounded-s-2xl',
              ),
            variant === 'default' &&
              cn(
                position === 'bottom' &&
                  'before:rounded-t-[calc(var(--radius-2xl)-1px)]',
                position === 'top' &&
                  'before:rounded-b-[calc(var(--radius-2xl)-1px)]',
                position === 'left' &&
                  'before:rounded-e-[calc(var(--radius-2xl)-1px)]',
                position === 'right' &&
                  'before:rounded-s-[calc(var(--radius-2xl)-1px)]',
              ),
            variant === 'inset' &&
              'before:hidden sm:rounded-2xl sm:border sm:after:bg-transparent sm:before:rounded-[calc(var(--radius-2xl)-1px)]',
            className,
          )}
          data-slot="drawer-popup"
          {...props}
        >
          {children}
          {showCloseButton && (
            <DrawerPrimitive.Close
              aria-label="Close"
              className="absolute end-2 top-2"
              render={<Button className="max-sm:size-11" size="icon" variant="ghost" />}
            >
              <XIcon />
            </DrawerPrimitive.Close>
          )}
        </DrawerPrimitive.Popup>
      </DrawerViewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex cursor-default flex-col gap-2 p-6 in-[[data-slot=drawer-popup]:has([data-slot=drawer-panel])]:pb-3 max-sm:pb-4',
        className,
      )}
      data-slot="drawer-header"
      {...props}
    />
  );
}

function DrawerFooter({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'bare';
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 px-4 max-sm:[&_[data-slot=button]]:min-h-12 max-sm:[&_[data-slot=button]]:min-w-12 sm:flex-row sm:justify-end sm:px-6',
        variant === 'default' &&
          'border-t bg-muted/72 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(3))] sm:pt-4 sm:pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))]',
        variant === 'bare' &&
          'in-[[data-slot=drawer-popup]:has([data-slot=drawer-panel])]:pt-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))] sm:pt-4 sm:pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(6))]',
        className,
      )}
      data-slot="drawer-footer"
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      className={cn(
        'font-heading text-xl leading-none font-semibold',
        className,
      )}
      data-slot="drawer-title"
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="drawer-description"
      {...props}
    />
  );
}

function DrawerPanel({
  className,
  scrollFade = true,
  ...props
}: React.ComponentProps<'div'> & { scrollFade?: boolean }) {
  return (
    <ScrollArea className="touch-auto" scrollFade={scrollFade}>
      <div
        className={cn(
          'p-6 in-[[data-slot=drawer-popup]:has([data-slot=drawer-header])]:pt-1 in-[[data-slot=drawer-popup]:has([data-slot=drawer-footer]:not(.border-t))]:pb-1',
          className,
        )}
        data-slot="drawer-panel"
        {...props}
      />
    </ScrollArea>
  );
}

export {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  DrawerViewport,
};
