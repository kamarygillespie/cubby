"use client";

import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { setShowNotesAction } from "../actions";

// Per list: show item notes (size, color…) on its share link (KAM-101).
export function ShowNotesToggle({
  wishlistId,
  show,
}: {
  wishlistId: string;
  show: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(show);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <label className="flex items-center gap-2">
        <Checkbox
          checked={optimistic}
          onCheckedChange={(checked) =>
            startTransition(async () => {
              setOptimistic(checked === true);
              await setShowNotesAction(wishlistId, checked === true);
            })
          }
        />
        Show my notes on the share link
      </label>
      <p className="text-muted-foreground pl-6 text-xs">
        Handy for size and color. Turn off if this list&apos;s notes are
        private.
      </p>
    </div>
  );
}
