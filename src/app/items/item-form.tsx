"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StarRatingInput } from "./star-rating-input";
import { LinkAutofillField } from "./link-autofill-field";
import type { ItemFormState } from "./item-form-state";

type ItemTypeOption = {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
};

type AutofillResult = {
  title: string | null;
  image: string | null;
  price: number | null;
  salePrice: number | null;
};

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

// Shared by Add item and Edit item. Paste-a-link autofill is offered when
// adding; editing starts from the saved values (re-checking a link's price
// is a separate action, KAM-36).
export function ItemForm({
  itemTypesByCategory,
  action,
  initial,
  submitLabel,
  pendingLabel,
  withAutofill = false,
}: {
  itemTypesByCategory: { category: string; itemTypes: ItemTypeOption[] }[];
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  initial?: ItemFormInitial;
  submitLabel: string;
  pendingLabel: string;
  withAutofill?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(numberField(initial?.price));
  const [salePrice, setSalePrice] = useState(numberField(initial?.sale_price));
  const [link, setLink] = useState(initial?.link ?? "");
  const [autofillImageUrl, setAutofillImageUrl] = useState<string | null>(null);
  // Editing: the saved image, unless the user chose to remove it.
  const [removeImage, setRemoveImage] = useState(false);
  const savedImageUrl = removeImage ? null : (initial?.image_url ?? null);
  const previewUrl = autofillImageUrl ?? savedImageUrl;

  const itemTypeLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const { itemTypes } of itemTypesByCategory) {
      for (const itemType of itemTypes) {
        labels.set(itemType.id, itemType.name);
      }
    }
    return labels;
  }, [itemTypesByCategory]);

  function handleAutofill(result: AutofillResult, autofilledLink: string) {
    if (result.title) setTitle(result.title);
    if (result.price !== null) setPrice(String(result.price));
    if (result.salePrice !== null) setSalePrice(String(result.salePrice));
    if (result.image) setAutofillImageUrl(result.image);
    setLink(autofilledLink);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {withAutofill && <LinkAutofillField onAutofill={handleAutofill} />}
      <input type="hidden" name="remove_image" value={removeImage ? "1" : ""} />

      <input
        type="hidden"
        name="autofill_image_url"
        value={autofillImageUrl ?? ""}
      />

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
            alt={autofillImageUrl ? "Fetched preview" : "Current image"}
            width={80}
            height={80}
            className="size-20 rounded-md object-cover"
          />
        )}
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          onChange={() => setAutofillImageUrl(null)}
        />
        {autofillImageUrl && (
          <p className="text-muted-foreground text-xs">
            Fetched from the link. Choose a file above to replace it.
          </p>
        )}
        {initial?.image_url && !autofillImageUrl && (
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="item_type_id">Item type</Label>
        <Select
          name="item_type_id"
          required
          defaultValue={initial?.item_type_id}
        >
          <SelectTrigger id="item_type_id" className="w-full">
            <SelectValue placeholder="Choose an item type">
              {(value: string | null) =>
                value ? itemTypeLabels.get(value) : "Choose an item type"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {itemTypesByCategory.map(({ category, itemTypes }) => (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {itemTypes.map((itemType) => (
                  <SelectItem key={itemType.id} value={itemType.id}>
                    {itemType.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

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
