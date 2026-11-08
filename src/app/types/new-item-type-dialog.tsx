"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TAXONOMY_NAME_MAX_LENGTH } from "@/lib/taxonomy";
import { createItemTypeAction, type CreatedItemType } from "./actions";

const NEW_CATEGORY = "__new__";

export function NewItemTypeDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  onCreated: (itemType: CreatedItemType) => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const creatingCategory = categoryId === NEW_CATEGORY;
  const categoryLabels = new Map(categories.map((c) => [c.id, c.name]));

  function close() {
    setName("");
    setCategoryId(null);
    setNewCategoryName("");
    setError(null);
    onOpenChange(false);
  }

  function submit(e: React.FormEvent) {
    // Stop the outer item form from submitting too — this dialog's form is
    // rendered in a portal but React events still bubble through the tree.
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await createItemTypeAction({
        name,
        categoryId: creatingCategory ? null : categoryId,
        newCategoryName: creatingCategory ? newCategoryName : "",
      });
      if (result.ok) {
        onCreated(result.itemType);
        close();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New item type</DialogTitle>
            <DialogDescription>
              Your own type, like &ldquo;Candles&rdquo; or &ldquo;Rain
              boots&rdquo;. Items of this type are grouped under its category.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="new-type-name">Name</Label>
            <Input
              id="new-type-name"
              value={name}
              maxLength={TAXONOMY_NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-type-category">Category</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v as string | null)}
            >
              <SelectTrigger id="new-type-category" className="w-full">
                <SelectValue placeholder="Choose a category">
                  {(v: string | null) =>
                    v === NEW_CATEGORY
                      ? "+ New category"
                      : v
                        ? categoryLabels.get(v)
                        : "Choose a category"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value={NEW_CATEGORY}>+ New category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {creatingCategory && (
            <div className="grid gap-2">
              <Label htmlFor="new-category-name">New category name</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                maxLength={TAXONOMY_NAME_MAX_LENGTH}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Home"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                !name.trim() ||
                !categoryId ||
                (creatingCategory && !newCategoryName.trim())
              }
            >
              {pending ? "Creating…" : "Create type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
