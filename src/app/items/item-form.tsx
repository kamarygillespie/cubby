"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoInput } from "@/components/photo-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "./star-rating-input";
import { ItemTypeField, type ItemTypeOption } from "./item-type-field";
import type { ItemFormState } from "./item-form-state";

// Starting values when editing an existing item.
export type ItemFormInitial = {
  title: string;
  item_type_id: string;
  image_url: string | null;
  price: number | null;
  sale_price: number | null;
  interest_level: number | null;
  store_brand: string | null;
  link: string | null;
  notes: string | null;
};

const numberField = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

// Shared by Edit item and Add to closet. Adding to the wishlist has its own
// link-first flow (items/new/add-item-flow.tsx, KAM-57).
export function ItemForm({
  itemTypesByCategory,
  categories,
  action,
  initial,
  submitLabel,
  pendingLabel,
  variant = "wishlist",
  returnTo,
}: {
  itemTypesByCategory: { category: string; itemTypes: ItemTypeOption[] }[];
  // Every visible category (incl. ones with no types yet), for "+ New type".
  categories: { id: string; name: string }[];
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  initial?: ItemFormInitial;
  submitLabel: string;
  pendingLabel: string;
  // "closet": a piece you already own — no prices or interest level.
  variant?: "wishlist" | "closet";
  // Where to go after saving ("/" or "/closet"); validated server-side.
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(numberField(initial?.price));
  const [salePrice, setSalePrice] = useState(numberField(initial?.sale_price));
  const [link, setLink] = useState(initial?.link ?? "");
  // Editing: the saved image, unless the user chose to remove it.
  const [removeImage, setRemoveImage] = useState(false);
  const previewUrl = removeImage ? null : (initial?.image_url ?? null);

  const [itemTypeId, setItemTypeId] = useState<string | null>(
    initial?.item_type_id ?? null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      <input type="hidden" name="remove_image" value={removeImage ? "1" : ""} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="image">Image</Label>
        {previewUrl && (
          <Image
            src={previewUrl}
            alt="Current image"
            width={80}
            height={80}
            className="size-20 rounded-md object-cover"
          />
        )}
        <PhotoInput id="image" name="image" />
        {initial?.image_url && (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            {removeImage
              ? "The image will be removed when you save."
              : "Choose a file above to replace the current image."}
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-auto p-0"
              onClick={() => setRemoveImage((r) => !r)}
            >
              {removeImage ? "Undo" : "Remove image"}
            </Button>
          </p>
        )}
      </div>

      <ItemTypeField
        itemTypesByCategory={itemTypesByCategory}
        categories={categories}
        value={itemTypeId}
        onChange={setItemTypeId}
      />

      {variant === "wishlist" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale_price">Sale price</Label>
              <Input
                id="sale_price"
                name="sale_price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Interest level</Label>
            <StarRatingInput
              name="interest_level"
              defaultValue={initial?.interest_level ?? null}
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="store_brand">Store / brand</Label>
        <Input
          id="store_brand"
          name="store_brand"
          defaultValue={initial?.store_brand ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link">Link</Label>
        <Input
          id="link"
          name="link"
          type="url"
          placeholder="https://"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
