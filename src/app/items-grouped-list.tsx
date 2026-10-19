import type { ItemGroup } from "@/lib/items-view";
import { ItemsList, type ListsByItem } from "./items-list";
import { formatCurrency } from "@/lib/format";

export function ItemsGroupedList({
  groups,
  listsByItem,
}: {
  groups: ItemGroup[];
  listsByItem?: ListsByItem;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No items match these filters.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">{group.name}</h2>
            <p className="text-muted-foreground text-sm">
              {group.count} item{group.count === 1 ? "" : "s"} ·{" "}
              {formatCurrency(group.totalPrice)}
            </p>
          </div>
          <ItemsList items={group.items} listsByItem={listsByItem} />
        </section>
      ))}
    </div>
  );
}
