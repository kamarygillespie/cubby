"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";

type Selection = {
  selecting: boolean;
  selected: ReadonlySet<string>;
  start: () => void;
  stop: () => void;
  toggle: (id: string, checked: boolean) => void;
  setAll: (ids: string[]) => void;
};

const SelectionContext = createContext<Selection | null>(null);

// Multi-select state for the item list. Lives only on the client — nothing
// is selected after a navigation or refresh, which is what you'd expect.
export function ItemSelectionProvider({ children }: { children: ReactNode }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const value: Selection = {
    selecting,
    selected,
    start: () => setSelecting(true),
    stop: () => {
      setSelecting(false);
      setSelected(new Set());
    },
    toggle: (id, checked) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      }),
    setAll: (ids) => setSelected(new Set(ids)),
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
      {/* Keeps the last card clear of the fixed action bar. */}
      {selecting && <div className="h-20" aria-hidden />}
    </SelectionContext.Provider>
  );
}

export function useItemSelection() {
  return useContext(SelectionContext);
}

// Renders nothing outside a provider or when not in select mode, so the
// shared ItemsList can include it unconditionally.
export function ItemSelectCheckbox({
  itemId,
  title,
}: {
  itemId: string;
  title: string;
}) {
  const selection = useItemSelection();
  if (!selection?.selecting) return null;

  return (
    <Checkbox
      className="mt-1"
      checked={selection.selected.has(itemId)}
      onCheckedChange={(checked) => selection.toggle(itemId, checked)}
      aria-label={`Select ${title}`}
    />
  );
}
