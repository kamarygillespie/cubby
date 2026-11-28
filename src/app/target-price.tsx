"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { setTargetPriceAction } from "./items/price-actions";

// "Alert me at or under $X" in an item's details (KAM-81). The alert comes
// from the daily price checks once the price crosses the target.
export function TargetPriceField({
  itemId,
  title,
  target,
  currentPrice,
}: {
  itemId: string;
  title: string;
  target: number | null;
  currentPrice: number | null;
}) {
  const [saved, setSaved] = useState(target);
  const [value, setValue] = useState(target === null ? "" : String(target));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(raw: string) {
    startTransition(async () => {
      const result = await setTargetPriceAction(itemId, raw);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSaved(result.target);
      setValue(result.target === null ? "" : String(result.target));
      setMessage(
        result.target === null
          ? "Price alert removed."
          : currentPrice !== null && currentPrice <= result.target
            ? "Saved. It's already at or under that price."
            : `Saved. You'll get an alert at ${formatCurrency(result.target)} or less.`,
      );
    });
  }

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
    >
      <label
        htmlFor={`target-${itemId}`}
        className="flex items-center gap-1.5 text-sm font-medium"
      >
        <BellRing className="size-4" aria-hidden />
        Alert me at or under
      </label>
      <div className="flex items-center gap-2">
        <div className="relative w-32">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
            $
          </span>
          <Input
            id={`target-${itemId}`}
            inputMode="decimal"
            className="pl-6"
            placeholder="40"
            value={value}
            aria-describedby={`target-msg-${itemId}`}
            onChange={(e) => {
              setValue(e.target.value);
              setMessage(null);
            }}
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved !== null && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={`Remove price alert for ${title}`}
            onClick={() => save("")}
          >
            Remove
          </Button>
        )}
      </div>
      <p
        id={`target-msg-${itemId}`}
        role="status"
        className="text-muted-foreground text-xs"
      >
        {message ??
          (saved !== null
            ? `Alert set for ${formatCurrency(saved)} or less.`
            : "Get one alert when the daily check finds it at your price.")}
      </p>
    </form>
  );
}
