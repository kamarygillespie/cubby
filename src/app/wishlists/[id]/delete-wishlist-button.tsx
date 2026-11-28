"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteWishlistAction } from "../actions";

export function DeleteWishlistButton({
  wishlistId,
  name,
}: {
  wishlistId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete list
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this list?"
        confirmLabel="Delete list"
        pending={pending}
        onConfirm={() =>
          startTransition(() => deleteWishlistAction(wishlistId))
        }
      >
        <span className="text-foreground font-medium">{name}</span>
        <span>
          The list and its share link go away. The items stay in your wishlist.
        </span>
      </ConfirmDialog>
    </>
  );
}
