"use client";

import { useState, useTransition } from "react";
import { ListPlus, SquareCheck } from "lucide-react";
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
import { WISHLIST_NAME_MAX_LENGTH } from "@/lib/wishlists";
import { addToWishlists } from "./wishlists/actions";
import { useItemSelection } from "./item-selection";

type WishlistOption = { id: string; name: string; itemIds: string[] };

export function AddToWishlistBar({
  itemIds,
  wishlists,
}: {
  itemIds: string[];
  wishlists: WishlistOption[];
}) {
  const selection = useItemSelection();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!selection) return null;

  if (!selection.selecting) {
    return (
      <div className="flex items-center justify-end gap-3">
        {notice && (
          <p role="status" className="text-muted-foreground text-sm">
            {notice}
          </p>
        )}
        {itemIds.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNotice(null);
              selection.start();
            }}
          >
            <SquareCheck />
            Select
          </Button>
        )}
      </div>
    );
  }

  const count = selection.selected.size;
  const allSelected = count === itemIds.length && count > 0;

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => selection.setAll(allSelected ? [] : itemIds)}
        >
          {allSelected ? "Select none" : "Select all"}
        </Button>
        <Button size="sm" variant="outline" onClick={selection.stop}>
          Cancel
        </Button>
      </div>

      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 p-4">
          <p className="text-sm" aria-live="polite">
            {count} selected
          </p>
          <Button disabled={count === 0} onClick={() => setOpen(true)}>
            <ListPlus />
            Add to wishlist
          </Button>
        </div>
      </div>

      <AddToWishlistDialog
        open={open}
        onOpenChange={setOpen}
        selectedIds={[...selection.selected]}
        wishlists={wishlists}
        onDone={(message) => {
          setOpen(false);
          selection.stop();
          setNotice(message);
        }}
      />
    </>
  );
}

function AddToWishlistDialog({
  open,
  onOpenChange,
  selectedIds,
  wishlists,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  wishlists: WishlistOption[];
  onDone: (message: string) => void;
}) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setChosen(new Set());
    setNewName("");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addToWishlists({
        itemIds: selectedIds,
        wishlistIds: [...chosen],
        newWishlistName: newName,
      });
      if (result.ok) {
        reset();
        onDone(result.message);
      } else {
        setError(result.error);
      }
    });
  }

  const n = selectedIds.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add to wishlist</DialogTitle>
            <DialogDescription>
              Adding {n} item{n === 1 ? "" : "s"}. Pick one or more lists.
            </DialogDescription>
          </DialogHeader>

          {wishlists.length > 0 && (
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
              {wishlists.map((list) => {
                const alreadyOn = selectedIds.filter((id) =>
                  list.itemIds.includes(id),
                ).length;
                return (
                  <li key={list.id}>
                    <Label className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md p-2 font-normal">
                      <Checkbox
                        checked={chosen.has(list.id)}
                        onCheckedChange={(checked) =>
                          setChosen((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(list.id);
                            else next.delete(list.id);
                            return next;
                          })
                        }
                      />
                      <span className="flex-1">{list.name}</span>
                      {alreadyOn > 0 && (
                        <span className="text-muted-foreground text-xs">
                          {alreadyOn === n ? "All" : alreadyOn} already on it
                        </span>
                      )}
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="grid gap-2">
            <Label htmlFor="new-wishlist-name">
              {wishlists.length > 0 ? "Or create a new list" : "New list name"}
            </Label>
            <Input
              id="new-wishlist-name"
              placeholder="e.g. Birthday 2026"
              value={newName}
              maxLength={WISHLIST_NAME_MAX_LENGTH}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || (chosen.size === 0 && !newName.trim())}
            >
              {pending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
