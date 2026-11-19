"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

// A panel that slides up from the bottom on phones and sits centered on
// larger screens. Built on the same primitive as Dialog.
function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay className="bg-black/40" />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "bg-popover text-popover-foreground ring-foreground/10 fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm ring-1 outline-none",
          "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom duration-200 motion-reduce:duration-0",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-4",
          "sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0 sm:data-closed:fade-out-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-0",
          className,
        )}
        {...props}
      >
        <div
          className="bg-muted-foreground/30 mx-auto -mt-1 h-1 w-10 shrink-0 rounded-full sm:hidden"
          aria-hidden
        />
        {children}
        <DialogPrimitive.Close
          data-slot="sheet-close"
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="bg-popover/80 absolute top-3 right-3 z-10 backdrop-blur"
            />
          }
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

const Sheet = Dialog;
const SheetClose = DialogClose;
const SheetDescription = DialogDescription;

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn("pr-8 text-lg leading-snug font-semibold", className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle };
