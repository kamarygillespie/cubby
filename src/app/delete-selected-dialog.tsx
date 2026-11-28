"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { listsHoldingAny } from "@/lib/wishlists";
import { deleteItemsAction } from "./items/actions";

// "Delete" in Select mode (KAM-76): delete every selected item after a
// confirmation that says how many and which lists they'll come off.
export function DeleteSelectedButton({
  selectedIds,
  titles,
  wishlists,
  onDone,
}: {
  selectedIds: string[];
  titles: Record<string, string>;
  wishlists: { name: string; itemIds: string[] }[];
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const n = selectedIds.length;
  const lists = listsHoldingAny(selectedIds, wishlists);

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button
        variant="destructive"
        disabled={n === 0}
        onClick={() => setOpen(true)}
        aria-label="Delete selected items"
      >
        <Trash2 />
        <span className="max-sm:sr-only">Delete</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        title={n === 1 ? "Delete this item?" : `Delete ${n} items?`}
        confirmLabel={n === 1 ? "Delete item" : `Delete ${n} items`}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteItemsAction(selectedIds);
            if (result.ok) {
              close();
              onDone(result.message);
            } else {
              setError(result.error);
            }
          })
        }
      >
        {n === 1 && (
          <span className="text-foreground font-medium">
            {titles[selectedIds[0]] ?? "This item"}
          </span>
        )}
        {lists.length > 0 && (
          <span>
            {n === 1 ? "It" : "They"} will also be removed from{" "}
            {lists.join(", ")}.
          </span>
        )}
        <span>This can&apos;t be undone.</span>
      </ConfirmDialog>
    </>
  );
}
