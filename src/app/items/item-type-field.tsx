"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewItemTypeDialog } from "../types/new-item-type-dialog";

export type ItemTypeOption = {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
};

// The item type picker on the add and edit forms, including "+ New type".
export function ItemTypeField({
  itemTypesByCategory,
  categories,
  value,
  onChange,
  error,
  suggestions = [],
}: {
  itemTypesByCategory: { category: string; itemTypes: ItemTypeOption[] }[];
  // Every visible category (incl. ones with no types yet), for "+ New type".
  categories: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
  error?: string | null;
  // Likely types to confirm with one tap (KAM-58). Never selected for you.
  suggestions?: { id: string; name: string }[];
}) {
  // Types created here via "+ New type", shown until the page's own data
  // refreshes.
  const [createdTypes, setCreatedTypes] = useState<ItemTypeOption[]>([]);
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [showFullList, setShowFullList] = useState(false);
  const showChips = suggestions.length > 0 && !showFullList;

  const typeGroups = useMemo(() => {
    const groups = itemTypesByCategory.map((g) => ({
      ...g,
      itemTypes: [...g.itemTypes],
    }));
    for (const created of createdTypes) {
      if (groups.some((g) => g.itemTypes.some((t) => t.id === created.id))) {
        continue;
      }
      const name = created.category?.name ?? "Uncategorized";
      const group = groups.find((g) => g.category === name);
      if (group) group.itemTypes.push(created);
      else groups.push({ category: name, itemTypes: [created] });
    }
    return groups.sort((a, b) => a.category.localeCompare(b.category));
  }, [itemTypesByCategory, createdTypes]);

  const itemTypeLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const { itemTypes } of typeGroups) {
      for (const itemType of itemTypes) {
        labels.set(itemType.id, itemType.name);
      }
    }
    return labels;
  }, [typeGroups]);

  if (showChips) {
    return (
      <div
        role="group"
        aria-labelledby="item-type-label"
        className="flex flex-col gap-2"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span id="item-type-label" className="text-sm font-medium">
            Item type
          </span>
          <span className="text-muted-foreground text-xs">Tap to confirm</span>
        </div>
        <input type="hidden" name="item_type_id" value={value ?? ""} />
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={suggestion.id}
              // Where a missing-type error sends keyboard focus.
              id={index === 0 ? "item_type_id" : undefined}
              type="button"
              variant={value === suggestion.id ? "default" : "outline"}
              aria-pressed={value === suggestion.id}
              onClick={() =>
                onChange(value === suggestion.id ? null : suggestion.id)
              }
            >
              {suggestion.name}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowFullList(true)}
          >
            Something else
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="item_type_id">Item type</Label>
      <Select
        name="item_type_id"
        required
        value={value}
        onValueChange={(v) => onChange(v as string | null)}
      >
        <SelectTrigger
          id="item_type_id"
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "item_type_id-error" : undefined}
        >
          <SelectValue placeholder="Choose an item type">
            {(selected: string | null) =>
              selected ? itemTypeLabels.get(selected) : "Choose an item type"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {typeGroups.map(({ category, itemTypes }) => (
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
      {error && (
        <p
          id="item_type_id-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="link"
          size="xs"
          className="h-auto p-0"
          onClick={() => setNewTypeOpen(true)}
        >
          <Plus />
          New type
        </Button>
        <Link
          href="/types"
          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
        >
          Manage types
        </Link>
      </div>
      <NewItemTypeDialog
        open={newTypeOpen}
        onOpenChange={setNewTypeOpen}
        categories={categories}
        onCreated={(created) => {
          setCreatedTypes((prev) => [...prev, created]);
          onChange(created.id);
        }}
      />
    </div>
  );
}
