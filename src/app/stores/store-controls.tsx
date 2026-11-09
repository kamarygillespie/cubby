"use client";

import { useActionState, useState, useTransition } from "react";
import { Link2, Star } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveSaleUrlAction,
  toggleFavoriteStoreAction,
  type StoreFormState,
} from "./actions";

export function FavoriteStar({
  name,
  favorite,
}: {
  name: string;
  favorite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-pressed={favorite}
      aria-label={favorite ? `Unfavorite ${name}` : `Favorite ${name}`}
      title={favorite ? "Remove from favorites" : "Add to favorites"}
      disabled={pending}
      onClick={() =>
        startTransition(() => toggleFavoriteStoreAction(name, !favorite))
      }
    >
      <Star className={cn(favorite && "fill-current")} />
    </Button>
  );
}

export function SaleUrlEditor({
  storeKey,
  name,
  saleUrl,
}: {
  storeKey: string;
  name: string;
  saleUrl: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: StoreFormState, formData: FormData) => {
      const result = await saveSaleUrlAction(storeKey, prev, formData);
      if (!result) setEditing(false);
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <Button
        size="xs"
        variant="ghost"
        className="self-start"
        onClick={() => setEditing(true)}
      >
        <Link2 />
        {saleUrl ? "Edit sale link" : "Add sale page link"}
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          name="sale_url"
          type="url"
          defaultValue={saleUrl ?? ""}
          placeholder="https://"
          aria-label={`${name} sale page link`}
          autoFocus
        />
        <Button type="submit" size="sm" disabled={pending}>
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
      {state?.error && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}
