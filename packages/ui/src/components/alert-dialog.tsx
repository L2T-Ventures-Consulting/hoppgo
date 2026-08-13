"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type React from "react";
import { useState } from "react";

import {
  type DialogMobileVariant,
  DialogModeContext,
  useDialogMode,
  useResolvedDialogMode,
} from "@louez/ui/hooks/use-dialog-mode";

import {
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "./dialog";

/**
 * Base UI builds its alert dialog out of the very same parts as the dialog —
 * only the root and the trigger differ (forced modality, no pointer dismissal,
 * `role="alertdialog"`). So the mobile bottom-sheet treatment is not
 * reimplemented here: the parts are the dialog's, and the root below hands
 * them the same mode through `DialogModeContext`. One chrome, one source of
 * truth, no second copy to drift out of sync.
 */

type AlertDialogChangeEventDetails =
  | AlertDialogPrimitive.Root.ChangeEventDetails
  | DrawerPrimitive.Root.ChangeEventDetails;
type AlertDialogProps<Payload = unknown> = Omit<
  AlertDialogPrimitive.Root.Props<Payload>,
  "onOpenChange"
> & {
  mobileVariant?: DialogMobileVariant;
  onOpenChange?: (open: boolean, eventDetails: AlertDialogChangeEventDetails) => void;
};

const AlertDialogCreateHandle = AlertDialogPrimitive.createHandle;

const AlertDialog = <Payload,>({
  defaultOpen = false,
  mobileVariant = "drawer",
  onOpenChange,
  open: openProp,
  ...props
}: AlertDialogProps<Payload>) => {
  const mode = useResolvedDialogMode(mobileVariant);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const openProps = openProp === undefined ? { defaultOpen: uncontrolledOpen } : { open: openProp };

  const handleAlertDialogOpenChange = (
    open: boolean,
    eventDetails: AlertDialogPrimitive.Root.ChangeEventDetails,
  ) => {
    if (openProp === undefined) {
      setUncontrolledOpen(open);
    }

    onOpenChange?.(open, eventDetails);
  };

  const handleDrawerOpenChange = (
    open: boolean,
    eventDetails: DrawerPrimitive.Root.ChangeEventDetails,
  ) => {
    // An alert asks a question and wants it answered. Base UI already refuses
    // outside presses for the alert dialog, and `disablePointerDismissal` gets
    // the sheet the same treatment — but a bottom sheet has one more way out
    // the dialog never had, so the swipe is turned down here. Base UI reads
    // the cancellation and springs the sheet back.
    if (!open && eventDetails.reason === "swipe") {
      eventDetails.cancel();
      return;
    }

    if (openProp === undefined) {
      setUncontrolledOpen(open);
    }

    onOpenChange?.(open, eventDetails);
  };

  return (
    <DialogModeContext.Provider value={mode}>
      {mode === "drawer" ? (
        <DrawerPrimitive.Root
          {...props}
          {...openProps}
          disablePointerDismissal
          onOpenChange={handleDrawerOpenChange}
          swipeDirection="down"
        />
      ) : (
        <AlertDialogPrimitive.Root
          {...props}
          {...openProps}
          onOpenChange={handleAlertDialogOpenChange}
        />
      )}
    </DialogModeContext.Provider>
  );
};

const AlertDialogTrigger = (props: AlertDialogPrimitive.Trigger.Props) => {
  const mode = useDialogMode();

  return mode === "drawer" ? (
    <DrawerPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  ) : (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
};

type AlertDialogPopupProps = Omit<
  React.ComponentProps<typeof DialogPopup>,
  "showCloseButton" | "showHandle"
>;

const AlertDialogPopup = (props: AlertDialogPopupProps) => (
  // No close button, no grab handle: an alert dialog is answered through its
  // actions, so it carries no affordance that suggests otherwise.
  <DialogPopup {...props} role="alertdialog" showCloseButton={false} showHandle={false} />
);

export {
  AlertDialogCreateHandle,
  AlertDialog,
  DialogPortal as AlertDialogPortal,
  DialogBackdrop as AlertDialogBackdrop,
  DialogBackdrop as AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogPopup as AlertDialogContent,
  DialogHeader as AlertDialogHeader,
  DialogFooter as AlertDialogFooter,
  DialogTitle as AlertDialogTitle,
  DialogDescription as AlertDialogDescription,
  DialogPanel as AlertDialogPanel,
  DialogClose as AlertDialogClose,
  DialogViewport as AlertDialogViewport,
};
