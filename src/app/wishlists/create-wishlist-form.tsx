"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WISHLIST_NAME_MAX_LENGTH } from "@/lib/wishlists";
import { createWishlistAction } from "./actions";

export function CreateWishlistForm() {
  const [state, formAction, pending] = useActionState(
    createWishlistAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="name"
          placeholder="New list name, e.g. Birthday 2026"
          aria-label="New list name"
          maxLength={WISHLIST_NAME_MAX_LENGTH}
          required
        />
        <Button type="submit" disabled={pending}>
          <Plus />
          {pending ? "Creating…" : "Create"}
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
