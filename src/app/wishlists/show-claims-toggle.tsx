"use client";

import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { setShowClaimsAction } from "./actions";

// Gift claims are hidden from the owner by default (KAM-77).
export function ShowClaimsToggle({ show }: { show: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(show);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      {/* Wrapping label: names the checkbox itself, not its hidden input. */}
      <label className="flex items-center gap-2 font-medium">
        <Checkbox
          checked={optimistic}
          aria-describedby="show-claims-help"
          onCheckedChange={(checked) =>
            startTransition(async () => {
              setOptimistic(checked === true);
              await setShowClaimsAction(checked === true);
            })
          }
        />
        Show claims
      </label>
      <p id="show-claims-help" className="text-muted-foreground pl-6 text-xs">
        People you share a list with can mark what they&apos;re getting. Turn
        this on to see it on your lists. It spoils the surprise.
      </p>
    </div>
  );
}
