"use client";

import { useActionState, useMemo } from "react";
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
import { addItem } from "./actions";

type ItemTypeOption = {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
};

export function AddItemForm({
  itemTypesByCategory,
}: {
  itemTypesByCategory: { category: string; itemTypes: ItemTypeOption[] }[];
}) {
  const [state, formAction, pending] = useActionState(addItem, null);

  const itemTypeLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const { itemTypes } of itemTypesByCategory) {
      for (const itemType of itemTypes) {
        labels.set(itemType.id, itemType.name);
      }
    }
    return labels;
  }, [itemTypesByCategory]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="item_type_id">Item type</Label>
        <Select name="item_type_id" required>
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
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Interest level</Label>
        <StarRatingInput name="interest_level" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="store_brand">Store / brand</Label>
        <Input id="store_brand" name="store_brand" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link">Link</Label>
        <Input id="link" name="link" type="url" placeholder="https://" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      {state?.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add item"}
      </Button>
    </form>
  );
}
