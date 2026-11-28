"use client";

import { useMemo, useState, useTransition } from "react";
import { Split } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  splitIntoExistingWishlists,
  splitIntoWishlists,
} from "./wishlists/actions";

export type SplitItemInfo = { title: string; price: number | null };
export type SplitListOption = {
  id: string;
  name: string;
  itemIds: string[];
  total: number;
};

const defaultName = (i: number) => `List ${String.fromCharCode(65 + i)}`;

// Even-split generator (KAM-53): preview here with the same splitEvenly() the
// server uses (server recomputes from DB prices on confirm). KAM-103 adds
// splitting into lists that already exist, counting what they already hold.
export function SplitButton({
  selectedIds,
  itemInfo,
  lists = [],
  onDone,
}: {
  selectedIds: string[];
  itemInfo: Record<string, SplitItemInfo>;
  // The owner's lists, with what's on them now (KAM-103).
  lists?: SplitListOption[];
  onDone: (message: string) => void;
}) {
  const canUseExisting = lists.length >= SPLIT_MIN_LISTS;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">(
    canUseExisting ? "existing" : "new",
  );
  const [names, setNames] = useState<string[]>([
    defaultName(0),
    defaultName(1),
  ]);
  const [chosen, setChosen] = useState<string[]>([]);
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

  // Lists I have: in list order, items already on a chosen list stay put.
  const chosenLists = lists.filter((l) => chosen.includes(l.id));
  const onChosen = new Set(chosenLists.flatMap((l) => l.itemIds));
  const toPlace = selectedIds.filter((id) => !onChosen.has(id));
  // Cheap enough to work out on every render.
  const existingSplit =
    chosenLists.length >= SPLIT_MIN_LISTS
      ? splitEvenly(
          toPlace.map((id) => ({ id, price: itemInfo[id]?.price ?? null })),
          chosenLists.length,
          chosenLists.map((l) => ({ total: l.total, count: l.itemIds.length })),
        )
      : null;

  function setCount(count: number) {
    setNames((prev) =>
      Array.from({ length: count }, (_, i) => prev[i] ?? defaultName(i)),
    );
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  const finish = (
    result: { ok: true; message: string } | { ok: false; error: string },
  ) => {
    if (result.ok) {
      close();
      onDone(result.message);
    } else {
      setError(result.error);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        disabled={n < 1}
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
              {mode === "existing"
                ? `Add ${n} item${n === 1 ? "" : "s"} to lists you have, keeping their totals even (counting what's already on them).`
                : `Spread ${n} items across new lists with totals as even as possible (say, one list per person).`}
            </DialogDescription>
          </DialogHeader>

          {canUseExisting && (
            <div
              role="radiogroup"
              aria-label="Split into"
              className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1"
            >
              {(
                [
                  ["existing", "Lists I have"],
                  ["new", "New lists"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === value
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {mode === "existing" ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm">
                  Pick the lists to split between:
                </legend>
                {lists.map((list) => {
                  const i = chosenLists.findIndex((l) => l.id === list.id);
                  const result =
                    i >= 0 && existingSplit ? existingSplit[i] : null;
                  return (
                    <div
                      key={list.id}
                      className="flex flex-col gap-1 rounded-lg border p-3"
                    >
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={chosen.includes(list.id)}
                          onCheckedChange={(checked) =>
                            setChosen((prev) =>
                              checked === true
                                ? [...prev, list.id]
                                : prev.filter((id) => id !== list.id),
                            )
                          }
                        />
                        <span className="flex-1">{list.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {result
                            ? `${formatCurrency(list.total)} → ${formatCurrency(result.total)}`
                            : formatCurrency(list.total)}
                        </span>
                      </label>
                      {result && (
                        <p className="text-muted-foreground pl-6 text-xs">
                          {result.itemIds.length === 0
                            ? "Nothing new"
                            : `+ ${result.itemIds
                                .map((id) => itemInfo[id]?.title)
                                .join(" · ")}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </fieldset>
              {existingSplit && (
                <p className="text-muted-foreground text-xs" aria-live="polite">
                  {toPlace.length < n &&
                    `${n - toPlace.length} already on one of these stay put. `}
                  Totals end up within{" "}
                  {formatCurrency(splitSpread(existingSplit))} of each other.
                </p>
              )}
            </>
          ) : (
            <>
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
                  <li
                    key={i}
                    className="flex flex-col gap-1 rounded-lg border p-3"
                  >
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
                        {formatCurrency(split[i]?.total ?? 0)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {!split[i] || split[i].itemIds.length === 0
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
            </>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            {mode === "existing" ? (
              <Button
                disabled={
                  pending ||
                  chosenLists.length < SPLIT_MIN_LISTS ||
                  toPlace.length === 0
                }
                onClick={() =>
                  startTransition(async () =>
                    finish(
                      await splitIntoExistingWishlists({
                        itemIds: selectedIds,
                        wishlistIds: chosenLists.map((l) => l.id),
                      }),
                    ),
                  )
                }
              >
                {pending
                  ? "Adding…"
                  : chosenLists.length < SPLIT_MIN_LISTS
                    ? "Pick 2 or more lists"
                    : `Add to ${chosenLists.length} lists`}
              </Button>
            ) : (
              <Button
                disabled={
                  pending || n < SPLIT_MIN_LISTS || names.some((v) => !v.trim())
                }
                onClick={() =>
                  startTransition(async () =>
                    finish(
                      await splitIntoWishlists({ itemIds: selectedIds, names }),
                    ),
                  )
                }
              >
                {pending ? "Creating…" : `Create ${names.length} lists`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
