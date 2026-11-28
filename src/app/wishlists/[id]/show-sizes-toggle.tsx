"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { setShowSizesAction } from "../actions";

// Per list: show the owner's sizes on its share link (KAM-78).
export function ShowSizesToggle({
  wishlistId,
  show,
  hasSizes,
}: {
  wishlistId: string;
  show: boolean;
  hasSizes: boolean;
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
              await setShowSizesAction(wishlistId, checked === true);
            })
          }
        />
        Show my sizes on the share link
      </label>
      {!hasSizes && (
        <p className="text-muted-foreground pl-6 text-xs">
          You haven&apos;t added any yet.{" "}
          <Link href="/wishlists" className="underline">
            Add your sizes
          </Link>
        </p>
      )}
    </div>
  );
}
