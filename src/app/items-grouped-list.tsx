import type { ItemGroup } from "@/lib/items-view";
import { ItemsList } from "./items-list";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ItemsGroupedList({ groups }: { groups: ItemGroup[] }) {
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
              {currency.format(group.totalPrice)}
            </p>
          </div>
          <ItemsList items={group.items} />
        </section>
      ))}
    </div>
  );
}
