"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteOutfitAction } from "../../actions";

export function DeleteOutfitButton({
  outfitId,
  name,
}: {
  outfitId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete outfit
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this outfit?"
        confirmLabel="Delete outfit"
        pending={pending}
        onConfirm={() => startTransition(() => deleteOutfitAction(outfitId))}
      >
        <span className="text-foreground font-medium">{name}</span>
        <span>
          The outfit and its photo go away. The pieces stay in your closet.
        </span>
      </ConfirmDialog>
    </>
  );
}
