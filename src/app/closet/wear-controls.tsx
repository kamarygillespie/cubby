"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wearLabel } from "@/lib/wears";
import {
  undoOutfitWearAction,
  undoWearAction,
  wearAction,
  wearOutfitAction,
} from "./wear-actions";

// "Wore it" on a closet piece (KAM-85): count, cost per wear, undo.
export function WearControls({
  itemId,
  title,
  price,
  wears,
}: {
  itemId: string;
  title: string;
  price: number | null;
  wears: number;
}) {
  const [count, setCount] = useOptimistic(wears);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs" aria-live="polite">
        {wearLabel(price, count)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          aria-label={`Wore ${title} today`}
          onClick={() =>
            startTransition(async () => {
              setCount(count + 1);
              await wearAction(itemId);
            })
          }
        >
          <Check />
          Wore it
        </Button>
        {count > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={pending}
            aria-label={`Undo last wear of ${title}`}
            onClick={() =>
              startTransition(async () => {
                setCount(Math.max(0, count - 1));
                await undoWearAction(itemId);
              })
            }
          >
            <Undo2 />
            Undo
          </Button>
        )}
      </div>
    </div>
  );
}

// "Wore this outfit" (KAM-85): a wear for every piece in it, with undo.
export function OutfitWearButton({
  outfitId,
  pieceCount,
}: {
  outfitId: string;
  pieceCount: number;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (pieceCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const n = await wearOutfitAction(outfitId);
            setStatus(`Logged a wear for ${n} piece${n === 1 ? "" : "s"}.`);
          })
        }
      >
        <Check />
        Wore this outfit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await undoOutfitWearAction(outfitId);
            setStatus("Undid the last wear of this outfit.");
          })
        }
      >
        <Undo2 />
        Undo last
      </Button>
      <p role="status" className="text-muted-foreground w-full text-xs">
        {status ??
          `Counts a wear for each of its ${pieceCount} piece${pieceCount === 1 ? "" : "s"}.`}
      </p>
    </div>
  );
}
