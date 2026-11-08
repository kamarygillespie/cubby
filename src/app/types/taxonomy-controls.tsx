"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Merge, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TAXONOMY_NAME_MAX_LENGTH } from "@/lib/taxonomy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemTypeSelect, type ItemTypeGroup } from "../item-type-select";
import {
  addItemTypeAction,
  createCategoryAction,
  deleteAction,
  mergeItemTypeAction,
  renameAction,
  type TaxonomyFormState,
} from "./actions";

function FormError({ error }: { error: string | null | undefined }) {
  return error ? (
    <p role="alert" className="text-destructive text-xs">
      {error}
    </p>
  ) : null;
}

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState(
    createCategoryAction,
    null,
  );
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          name="name"
          placeholder="New category, e.g. Home"
          aria-label="New category name"
          maxLength={TAXONOMY_NAME_MAX_LENGTH}
          required
        />
        <Button type="submit" disabled={pending}>
          <Plus />
          Category
        </Button>
      </div>
      <FormError error={state?.error} />
    </form>
  );
}

export function AddItemTypeForm({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: TaxonomyFormState, formData: FormData) => {
      const result = await addItemTypeAction(categoryId, prev, formData);
      if (!result) setOpen(false);
      return result;
    },
    null,
  );

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="xs"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <Plus />
        Add type
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          name="name"
          placeholder="New type name"
          aria-label="New type name"
          maxLength={TAXONOMY_NAME_MAX_LENGTH}
          required
          autoFocus
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />
        <Button type="submit" size="sm" disabled={pending}>
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <FormError error={state?.error} />
    </form>
  );
}

// One category or item type: its name, a detail ("3 items"), and — for the
// user's own rows — rename and delete.
export function TaxonomyRow({
  kind,
  id,
  name,
  isSystem,
  detail,
  canDelete,
  heading = false,
  mergeTargets,
}: {
  kind: "category" | "item type";
  id: string;
  name: string;
  isSystem: boolean;
  detail: string;
  canDelete: boolean;
  heading?: boolean;
  // Item types only: every type this one could be merged into.
  mergeTargets?: ItemTypeGroup[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [state, formAction, pending] = useActionState(
    async (prev: TaxonomyFormState, formData: FormData) => {
      const result = await renameAction(kind, id, prev, formData);
      if (!result) setEditing(false);
      return result;
    },
    null,
  );

  if (editing) {
    return (
      <form action={formAction} className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Input
            name="name"
            defaultValue={name}
            aria-label={`Rename ${name}`}
            maxLength={TAXONOMY_NAME_MAX_LENGTH}
            required
            autoFocus
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          />
          <Button type="submit" size="sm" disabled={pending}>
            <Check />
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
        <FormError error={state?.error} />
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className={heading ? "font-medium" : "text-sm"}>{name}</span>
        <span className="text-muted-foreground text-xs">{detail}</span>
        {isSystem ? (
          <span className="text-muted-foreground bg-muted ml-auto rounded px-1.5 py-0.5 text-xs">
            Built-in
          </span>
        ) : (
          <span className="ml-auto flex gap-1">
            {mergeTargets && (
              <MergeTypeButton id={id} name={name} targets={mergeTargets} />
            )}
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Rename ${name}`}
              title="Rename"
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Delete ${name}`}
              title={
                canDelete
                  ? "Delete"
                  : kind === "category"
                    ? "Remove its types first"
                    : "Change its items' type first"
              }
              disabled={deleting}
              onClick={() =>
                startDelete(async () => {
                  setDeleteError((await deleteAction(kind, id))?.error ?? null);
                })
              }
            >
              <Trash2 />
            </Button>
          </span>
        )}
      </div>
      <FormError error={deleteError} />
    </div>
  );
}

function MergeTypeButton({
  id,
  name,
  targets,
}: {
  id: string;
  name: string;
  targets: ItemTypeGroup[];
}) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setTargetId(null);
    setError(null);
  }

  return (
    <>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={`Merge ${name}`}
        title="Merge into another type"
        onClick={() => setOpen(true)}
      >
        <Merge />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge “{name}”</DialogTitle>
            <DialogDescription>
              Its items move to the type you pick, then “{name}” is deleted.
            </DialogDescription>
          </DialogHeader>
          <ItemTypeSelect
            id={`merge-${id}`}
            label="Merge into"
            groups={targets}
            value={targetId}
            onChange={setTargetId}
            excludeId={id}
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
              disabled={pending || !targetId}
              onClick={() =>
                startTransition(async () => {
                  const result = await mergeItemTypeAction(id, targetId!);
                  if (result) setError(result.error);
                  else close();
                })
              }
            >
              {pending ? "Merging…" : "Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
