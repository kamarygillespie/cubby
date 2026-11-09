"use client";

import { useMemo, useState, useTransition } from "react";
import { Split } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import {
  SPLIT_MAX_LISTS,
  SPLIT_MIN_LISTS,
  splitEvenly,
  splitSpread,
} from "@/lib/even-split";
import { WISHLIST_NAME_MAX_LENGTH } from "@/lib/wishlists";
import { splitIntoWishlists } from "./wishlists/actions";

export type SplitItemInfo = { title: string; price: number | null };

const defaultName = (i: number) => `List ${String.fromCharCode(65 + i)}`;

// Even-split generator (KAM-53): preview here with the same splitEvenly() the
// server uses (server recomputes from DB prices on confirm).
export function SplitButton({
  selectedIds,
  itemInfo,
  onDone,
}: {
  selectedIds: string[];
  itemInfo: Record<string, SplitItemInfo>;
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<string[]>([
    defaultName(0),
    defaultName(1),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const n = selectedIds.length;

  const split = useMemo(
    () =>
      splitEvenly(
        selectedIds.map((id) => ({ id, price: itemInfo[id]?.price ?? null })),
        names.length,
      ),
    [selectedIds, itemInfo, names.length],
  );

  function setCount(count: number) {
    setNames((prev) =>
      Array.from({ length: count }, (_, i) => prev[i] ?? defaultName(i)),
    );
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={n < 2}
        onClick={() => setOpen(true)}
        aria-label="Split selected items evenly into lists"
        title="Split evenly into lists"
      >
        <Split />
        <span className="max-sm:sr-only">Split</span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Split evenly into lists</DialogTitle>
            <DialogDescription>
              Spread {n} items across new lists with totals as even as possible
              (say, one list per person).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Lists:</span>
            {Array.from(
              { length: SPLIT_MAX_LISTS - SPLIT_MIN_LISTS + 1 },
              (_, i) => i + SPLIT_MIN_LISTS,
            ).map((count) => (
              <Button
                key={count}
                size="sm"
                variant={names.length === count ? "default" : "outline"}
                aria-pressed={names.length === count}
                disabled={count > n}
                onClick={() => setCount(count)}
              >
                {count}
              </Button>
            ))}
          </div>

          <ol className="flex flex-col gap-3">
            {names.map((name, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`split-name-${i}`} className="sr-only">
                    List {i + 1} name
                  </Label>
                  <Input
                    id={`split-name-${i}`}
                    value={name}
                    maxLength={WISHLIST_NAME_MAX_LENGTH}
                    onChange={(e) =>
                      setNames((prev) =>
                        prev.map((v, j) => (j === i ? e.target.value : v)),
                      )
                    }
                  />
                  <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                    {formatCurrency(split[i].total)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {split[i].itemIds.length === 0
                    ? "No items"
                    : split[i].itemIds
                        .map((id) => itemInfo[id]?.title)
                        .join(" · ")}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            Totals are within {formatCurrency(splitSpread(split))} of each
            other.
          </p>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={pending || names.some((v) => !v.trim())}
              onClick={() =>
                startTransition(async () => {
                  const result = await splitIntoWishlists({
                    itemIds: selectedIds,
                    names,
                  });
                  if (result.ok) {
                    close();
                    onDone(result.message);
                  } else {
                    setError(result.error);
                  }
                })
              }
            >
              {pending ? "Creating…" : `Create ${names.length} lists`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
