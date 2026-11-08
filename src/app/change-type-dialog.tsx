"use client";

import { useState, useTransition } from "react";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemTypeSelect, type ItemTypeGroup } from "./item-type-select";
import { changeItemsTypeAction } from "./types/actions";

// "Change type" in Select mode: move every selected item to one item type.
export function ChangeTypeButton({
  selectedIds,
  itemTypeGroups,
  onDone,
}: {
  selectedIds: string[];
  itemTypeGroups: ItemTypeGroup[];
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const n = selectedIds.length;

  function close() {
    setOpen(false);
    setTypeId(null);
    setError(null);
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={n === 0}
        onClick={() => setOpen(true)}
        aria-label="Change type of selected items"
      >
        <Tags />
        <span className="max-sm:sr-only">Change type</span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change item type</DialogTitle>
            <DialogDescription>
              Move {n} item{n === 1 ? "" : "s"} to one type. Its category comes
              along with it.
            </DialogDescription>
          </DialogHeader>
          <ItemTypeSelect
            id="bulk-item-type"
            label="New item type"
            groups={itemTypeGroups}
            value={typeId}
            onChange={setTypeId}
          />
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
              disabled={pending || !typeId}
              onClick={() =>
                startTransition(async () => {
                  const result = await changeItemsTypeAction(
                    selectedIds,
                    typeId!,
                  );
                  if (result.ok) {
                    close();
                    onDone(result.message);
                  } else {
                    setError(result.error);
                  }
                })
              }
            >
              {pending ? "Changing…" : "Change type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
