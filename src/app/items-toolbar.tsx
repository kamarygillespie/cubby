"use client";

import { useState } from "react";
import { ClipboardCopy, Ellipsis, RefreshCw, SquareCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CopyItem } from "@/lib/wishlist-text";
import type { LookingForEntry } from "@/lib/looking-for";
import { usePriceCheck } from "./check-price";
import { CopyWishlistDialog } from "./copy-wishlist-dialog";
import { ActiveFilters, FilterSheet, type FilterOptions } from "./filter-sheet";
import { useItemSelection } from "./item-selection";
import { ViewTabs } from "./view-tabs";

// The single row above the item grid (KAM-61): tabs, Filter, and "…".
export function ItemsToolbar({
  filterOptions,
  showActions,
  canSelect,
  priceChecks,
  copyItems = [],
  lookingFor = [],
  filtered = false,
}: {
  filterOptions: FilterOptions;
  // The "…" menu's actions apply to the Wishlist tab only.
  showActions: boolean;
  canSelect: boolean;
  priceChecks: { id: string; store: string }[];
  // What "Copy wishlist" copies: the matching items, filters applied.
  copyItems?: CopyItem[];
  // Open "Looking for" entries, for Copy wishlist (KAM-102).
  lookingFor?: LookingForEntry[];
  filtered?: boolean;
}) {
  const selection = useItemSelection();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  // Shared with the Select bar's Check price (KAM-94).
  const shared = usePriceCheck();
  const priceCheck = shared ?? {
    progress: null,
    summary: null,
    run: async () => {},
    stop: () => {},
  };
  const hasActions =
    showActions &&
    (canSelect || priceChecks.length > 0 || copyItems.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <ViewTabs />
        <div className="flex shrink-0 items-center gap-1">
          <FilterSheet {...filterOptions} />
          {hasActions && (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="More actions"
                  />
                }
              >
                <Ellipsis />
              </PopoverTrigger>
              <PopoverContent>
                {canSelect && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setMenuOpen(false);
                      selection?.start();
                    }}
                  >
                    <SquareCheck />
                    Select
                  </Button>
                )}
                {priceChecks.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    disabled={priceCheck.progress !== null}
                    onClick={() => {
                      setMenuOpen(false);
                      void priceCheck.run();
                    }}
                  >
                    <RefreshCw />
                    Check all prices
                  </Button>
                )}
                {copyItems.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setMenuOpen(false);
                      setCopyOpen(true);
                    }}
                  >
                    <ClipboardCopy />
                    Copy wishlist
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <ActiveFilters {...filterOptions} />
      {showActions && (
        <CopyWishlistDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          items={copyItems}
          lookingFor={lookingFor}
          filtered={filtered}
        />
      )}

      {priceCheck.progress && (
        <div className="flex items-center justify-between gap-2">
          <p aria-live="polite" className="text-muted-foreground text-sm">
            Checked {priceCheck.progress.done} of {priceCheck.progress.total}
            {priceCheck.progress.running > 1
              ? ` · ${priceCheck.progress.running} at once`
              : ""}
            …
          </p>
          <Button size="sm" variant="ghost" onClick={priceCheck.stop}>
            Stop
          </Button>
        </div>
      )}
      {priceCheck.summary && !priceCheck.progress && (
        <p role="status" className="text-muted-foreground text-sm">
          {priceCheck.summary}
        </p>
      )}
    </div>
  );
}
