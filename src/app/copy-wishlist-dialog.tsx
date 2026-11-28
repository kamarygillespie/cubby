"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";
import {
  PRICE_RANGES,
  wishlistAsText,
  type CopyItem,
  type PriceRangeKey,
} from "@/lib/wishlist-text";

// "Copy wishlist" (KAM-91): the list as text for an AI chat, a note or a
// message. The preview doubles as the fallback when the clipboard is blocked.
export function CopyWishlistDialog({
  open,
  onOpenChange,
  items,
  filtered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CopyItem[];
  filtered: boolean;
}) {
  const [includeNotes, setIncludeNotes] = useState(false);
  const [withPrompt, setWithPrompt] = useState(true);
  // Price ranges for the ideas (KAM-93); none = any price.
  const [ranges, setRanges] = useState<PriceRangeKey[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const text = useMemo(
    () =>
      wishlistAsText(items, {
        includeNotes,
        withPrompt,
        filtered,
        priceRanges: ranges,
      }),
    [items, includeNotes, withPrompt, filtered, ranges],
  );
  const n = items.length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Copied ${n} item${n === 1 ? "" : "s"}.`);
    } catch {
      setStatus(
        "Your browser blocked copying. Select the text above and copy it.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStatus(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy wishlist</DialogTitle>
          <DialogDescription>
            {filtered
              ? `The ${n} item${n === 1 ? "" : "s"} you're showing, as text.`
              : `All ${n} item${n === 1 ? "" : "s"}, as text.`}{" "}
            Paste it into ChatGPT or Claude for ideas, or anywhere else.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={withPrompt}
              onCheckedChange={(checked) => {
                setWithPrompt(checked === true);
                setStatus(null);
              }}
            />
            Ask for ideas of things I&apos;d like
          </label>
          {withPrompt && (
            <div
              role="group"
              aria-label="Price range for ideas"
              className="flex flex-wrap items-center gap-1.5 pl-6"
            >
              {PRICE_RANGES.map((range) => {
                const on = ranges.includes(range.key);
                return (
                  <button
                    key={range.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setRanges((current) =>
                        on
                          ? current.filter((k) => k !== range.key)
                          : [...current, range.key],
                      );
                      setStatus(null);
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent",
                    )}
                  >
                    {range.label}
                  </button>
                );
              })}
              <span className="text-muted-foreground text-xs">
                {ranges.length === 0 ? "Any price" : ""}
              </span>
            </div>
          )}
          <label className="flex items-center gap-2">
            <Checkbox
              checked={includeNotes}
              onCheckedChange={(checked) => {
                setIncludeNotes(checked === true);
                setStatus(null);
              }}
            />
            Include my notes
          </label>
        </div>

        <Textarea
          readOnly
          value={text}
          aria-label="Wishlist text"
          className="h-48 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />

        {status && (
          <p role="status" className="text-muted-foreground text-sm">
            {status}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button onClick={copy} disabled={n === 0}>
            {status?.startsWith("Copied") ? <Check /> : <Copy />}
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
