"use client";

import { useActionState, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WISHLIST_NAME_MAX_LENGTH } from "@/lib/wishlists";
import { renameWishlistAction, type WishlistFormState } from "../actions";

export function RenameWishlistForm({
  wishlistId,
  name,
}: {
  wishlistId: string;
  name: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: WishlistFormState, formData: FormData) => {
      const result = await renameWishlistAction(wishlistId, prev, formData);
      if (!result) setEditing(false);
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{name}</h1>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Rename list"
          title="Rename list"
          onClick={() => setEditing(true)}
        >
          <Pencil />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="name"
          defaultValue={name}
          aria-label="List name"
          maxLength={WISHLIST_NAME_MAX_LENGTH}
          required
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button type="submit" disabled={pending}>
          <Check />
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
