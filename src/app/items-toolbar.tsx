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
import { useCheckAllPrices } from "./check-price";
import { CopyWishlistDialog } from "./copy-wishlist-dialog";
import { ActiveFilters, FilterSheet, type FilterOptions } from "./filter-sheet";
import { useItemSelection } from "./item-selection";
import { ViewTabs } from "./view-tabs";

// The single row above the item grid (KAM-61): tabs, Filter, and "…".
export function ItemsToolbar({
  filterOptions,
  showActions,
  canSelect,
  priceCheckIds,
  copyItems = [],
  filtered = false,
}: {
  filterOptions: FilterOptions;
  // The "…" menu's actions apply to the Wishlist tab only.
  showActions: boolean;
  canSelect: boolean;
  priceCheckIds: string[];
  // What "Copy wishlist" copies: the matching items, filters applied.
  copyItems?: CopyItem[];
  filtered?: boolean;
}) {
  const selection = useItemSelection();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const priceCheck = useCheckAllPrices(priceCheckIds);
  const hasActions =
    showActions &&
    (canSelect || priceCheckIds.length > 0 || copyItems.length > 0);

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
                {priceCheckIds.length > 0 && (
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
          filtered={filtered}
        />
      )}

      {priceCheck.progress && (
        <div className="flex items-center justify-between gap-2">
          <p aria-live="polite" className="text-muted-foreground text-sm">
            Checking {priceCheck.progress.done + 1} of{" "}
            {priceCheck.progress.total}…
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
