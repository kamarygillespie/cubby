"use client";

import { useOptimistic } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ItemView } from "@/lib/items-view";
import { useItemsNavigation } from "./items-navigation";

type Tab = ItemView | "totals";

const TABS: { value: Tab; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "purchased", label: "Purchased" },
  { value: "gifted", label: "Gifted" },
  { value: "totals", label: "Totals" },
];

export function ViewTabs() {
  const { navigate } = useItemsNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = (searchParams.get("view") as Tab | null) ?? "wishlist";
  // Highlights the tapped tab right away, before its items have loaded.
  const [activeView, setActiveView] = useOptimistic(currentView);

  function setView(view: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "wishlist") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    navigate(params.size ? `${pathname}?${params.toString()}` : pathname, {
      onStart: () => setActiveView(view),
    });
  }

  return (
    <div className="flex min-w-0 gap-0.5 overflow-x-auto">
      {TABS.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          size="sm"
          variant={activeView === tab.value ? "default" : "ghost"}
          className="shrink-0 rounded-full px-3 max-sm:px-2.5"
          onClick={() => setView(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
