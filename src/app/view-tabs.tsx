"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ItemView } from "@/lib/items-view";

const TABS: { value: ItemView; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "purchased", label: "Purchased" },
  { value: "gifted", label: "Gifted" },
];

export function ViewTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView =
    (searchParams.get("view") as ItemView | null) ?? "wishlist";

  function setView(view: ItemView) {
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
          onClick={() => setView(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
