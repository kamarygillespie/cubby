"use client";

import { useState, useTransition } from "react";
import { PackageOpen, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDays,
  daysUntil,
  formatOccasionDate,
  localToday,
} from "@/lib/occasion";
import { useLocalToday } from "@/components/occasion-countdown";
import { setItemFlag, setReturnByAction } from "./items/status-actions";

const PICKS = [14, 30, 60];

// A purchased item's return window (KAM-83): set a return-by date (quick
// picks count from the purchase day), and Mark returned when it goes back.
export function ReturnWindowField({
  itemId,
  title,
  returnBy,
  purchasedAt,
  onReturned,
}: {
  itemId: string;
  title: string;
  returnBy: string | null;
  purchasedAt: string | null;
  onReturned: () => void;
}) {
  const today = useLocalToday();
  const [value, setValue] = useState(returnBy ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const from = purchasedAt ? localToday(new Date(purchasedAt)) : today;

  function save(raw: string) {
    startTransition(async () => {
      const result = await setReturnByAction(itemId, raw);
      if (result.ok) {
        setValue(raw);
        setMessage(
          raw && today
            ? `Return by ${formatOccasionDate(raw, today)}. You'll get a reminder 3 days before.`
            : "Return date removed.",
        );
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label
        htmlFor={`return-${itemId}`}
        className="flex items-center gap-1.5 font-medium"
      >
        <PackageOpen className="size-4" aria-hidden />
        Return by
      </label>
      {from && (
        <div className="flex flex-wrap gap-1.5" aria-label="Quick picks">
          {PICKS.map((days) => (
            <Button
              key={days}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => save(addDays(from, days) ?? "")}
            >
              {days} days
            </Button>
          ))}
        </div>
      )}
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save(value);
        }}
      >
        <Input
          id={`return-${itemId}`}
          type="date"
          className="w-44"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage(null);
          }}
        />
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          Save
        </Button>
        {returnBy && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => save("")}
          >
            Remove
          </Button>
        )}
      </form>
      {message && (
        <p role="status" className="text-muted-foreground text-xs">
          {message}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        disabled={pending}
        aria-label={`Mark ${title} returned`}
        onClick={() =>
          startTransition(async () => {
            // Un-purchasing clears the return window and takes it out of
            // spending; it goes back on the wishlist.
            await setItemFlag(itemId, "purchased", false);
            onReturned();
          })
        }
      >
        <Undo2 />
        Mark returned
      </Button>
      <p className="text-muted-foreground text-xs">
        Moves it back to your wishlist and out of what you&apos;ve spent.
      </p>
    </div>
  );
}

// "Return by Dec 12" under a purchased card's price; urgent in the last 3
// days, hidden once it's passed.
export function ReturnByLabel({ date }: { date: string }) {
  const today = useLocalToday();
  if (!today) return null;
  const left = daysUntil(date, today);
  if (left === null || left < 0) return null;
  return (
    <span
      className={
        left <= 3
          ? "text-destructive text-xs font-medium"
          : "text-muted-foreground text-xs"
      }
    >
      Return by {formatOccasionDate(date, today)}
    </span>
  );
}
