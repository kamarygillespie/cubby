"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteItemAction } from "../../actions";

export function DeleteItemButton({
  itemId,
  title,
  onLists,
  returnTo = "/",
}: {
  itemId: string;
  title: string;
  onLists: string[];
  // null stays on the current page (the item details sheet).
  returnTo?: "/" | "/closet" | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete item
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this item?"
        confirmLabel="Delete item"
        pending={pending}
        onConfirm={() =>
          startTransition(() => deleteItemAction(itemId, returnTo))
        }
      >
        <span className="text-foreground font-medium">{title}</span>
        {onLists.length > 0 && (
          <span>It will also be removed from {onLists.join(", ")}.</span>
        )}
        <span>This can&apos;t be undone.</span>
      </ConfirmDialog>
    </>
  );
}
