"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Check, Shirt } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WISHLIST_NAME_MAX_LENGTH } from "@/lib/wishlists";
import type { OutfitFormState } from "./actions";

export type ClosetPiece = {
  id: string;
  title: string;
  image_url: string | null;
  typeName: string;
};

// Create/edit an outfit: a name, an optional photo, and closet pieces picked
// from a tap-to-select grid.
export function OutfitForm({
  action,
  pieces,
  initial,
  submitLabel,
}: {
  action: (
    state: OutfitFormState,
    formData: FormData,
  ) => Promise<OutfitFormState>;
  pieces: ClosetPiece[];
  initial?: { name: string; photo_url: string | null; pieceIds: string[] };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    new Set(initial?.pieceIds ?? []),
  );
  const [removePhoto, setRemovePhoto] = useState(false);
  const currentPhoto = removePhoto ? null : (initial?.photo_url ?? null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="remove_photo" value={removePhoto ? "1" : ""} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="piece" value={id} />
      ))}

      <div className="flex flex-col gap-2">
        <Label htmlFor="outfit-name">Name</Label>
        <Input
          id="outfit-name"
          name="name"
          placeholder="e.g. Dinner in Paris"
          defaultValue={initial?.name}
          maxLength={WISHLIST_NAME_MAX_LENGTH}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="outfit-photo">Outfit photo (optional)</Label>
        {currentPhoto && (
          <Image
            src={currentPhoto}
            alt="Current outfit photo"
            width={120}
            height={160}
            className="h-40 w-30 rounded-lg object-cover"
          />
        )}
        <Input id="outfit-photo" name="photo" type="file" accept="image/*" />
        {initial?.photo_url && (
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto self-start p-0"
            onClick={() => setRemovePhoto((r) => !r)}
          >
            {removePhoto ? "Keep the current photo" : "Remove photo"}
          </Button>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          Pieces from your closet{" "}
          <span className="text-muted-foreground font-normal">
            ({selected.size} picked)
          </span>
        </legend>
        {pieces.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Your closet is empty. Add pieces there first, or save this outfit
            with just a photo.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pieces.map((piece) => {
              const on = selected.has(piece.id);
              return (
                <li key={piece.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={piece.title}
                    onClick={() => toggle(piece.id)}
                    className={cn(
                      "focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded-lg p-1 text-left outline-none focus-visible:ring-3",
                      on && "ring-primary ring-2",
                    )}
                  >
                    <span className="bg-muted relative aspect-square w-full overflow-hidden rounded-md">
                      {piece.image_url ? (
                        <Image
                          src={piece.image_url}
                          alt=""
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      ) : (
                        <Shirt
                          className="text-muted-foreground absolute inset-0 m-auto size-6"
                          aria-hidden
                        />
                      )}
                      {on && (
                        <span className="bg-primary text-primary-foreground absolute top-1 right-1 rounded-full p-0.5">
                          <Check className="size-3" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="truncate text-xs">{piece.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
