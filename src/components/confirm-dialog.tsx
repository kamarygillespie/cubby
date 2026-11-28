"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

// A confirmation for something that can't be undone (KAM-100). It often
// opens on top of the item details sheet, so everything behind it is dimmed
// and blurred, and the dialog leads with an icon and a short question so
// it's clearly the one thing to answer.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  pendingLabel = "Deleting…",
  pending,
  onConfirm,
  error,
  icon = <Trash2 />,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // The details: what goes, what's affected, "This can't be undone."
  children: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  pending: boolean;
  onConfirm: () => void;
  error?: string | null;
  icon?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent
        showCloseButton={false}
        forceOverlay
        // Above the details sheet (also z-50), so the sheet blurs too.
        overlayClassName="z-[60] bg-black/45 supports-backdrop-filter:backdrop-blur-sm"
        className="z-[60] gap-5 p-5 shadow-xl sm:max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden
            className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full [&_svg]:size-6"
          >
            {icon}
          </span>
          <DialogTitle className="text-lg leading-snug">{title}</DialogTitle>
          <DialogDescription render={<div />} className="flex flex-col gap-1.5">
            {children}
          </DialogDescription>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-center text-sm">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 flex-1"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
          <Button
            variant="outline"
            className="h-10 flex-1"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
