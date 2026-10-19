"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ItemView } from "@/lib/items-view";

type Tab = ItemView | "totals";

const TABS: { value: Tab; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "purchased", label: "Purchased" },
  { value: "gifted", label: "Gifted" },
  { value: "totals", label: "Totals" },
];

export function ViewTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = (searchParams.get("view") as Tab | null) ?? "wishlist";

  function setView(view: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "wishlist") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex gap-1">
      {TABS.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          size="sm"
          variant={currentView === tab.value ? "default" : "ghost"}
          className="max-sm:px-2"
          onClick={() => setView(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
