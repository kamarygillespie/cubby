"use client";

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

export type ItemTypeGroup = {
  category: string;
  itemTypes: { id: string; name: string }[];
};

// An item-type picker grouped by category, for dialogs (bulk change, merge).
export function ItemTypeSelect({
  id,
  label,
  groups,
  value,
  onChange,
  excludeId,
}: {
  id: string;
  label: string;
  groups: ItemTypeGroup[];
  value: string | null;
  onChange: (id: string | null) => void;
  excludeId?: string;
}) {
  const labels = new Map(
    groups.flatMap((g) => g.itemTypes.map((t) => [t.id, t.name] as const)),
  );
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as string | null)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose an item type">
            {(v: string | null) => (v ? labels.get(v) : "Choose an item type")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map(({ category, itemTypes }) => {
            const options = itemTypes.filter((t) => t.id !== excludeId);
            if (options.length === 0) return null;
            return (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {options.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
