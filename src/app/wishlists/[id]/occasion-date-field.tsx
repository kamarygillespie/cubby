"use client";

import { useState, useTransition } from "react";
import { CalendarHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setOccasionDateAction } from "../actions";

// A list's occasion date (KAM-79): a countdown for givers, and a reminder
// to send the link about 3 weeks ahead.
export function OccasionDateField({
  wishlistId,
  date,
}: {
  wishlistId: string;
  date: string | null;
}) {
  const [value, setValue] = useState(date ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(raw: string) {
    startTransition(async () => {
      const result = await setOccasionDateAction(wishlistId, raw);
      if (result.ok) {
        setValue(raw);
        setMessage(raw ? "Date saved." : "Date removed.");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-1 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
    >
      <label
        htmlFor="occasion-date"
        className="flex items-center gap-1.5 font-medium"
      >
        <CalendarHeart className="size-4" aria-hidden />
        Occasion date
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="occasion-date"
          type="date"
          className="w-44"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage(null);
          }}
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {date && (
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
      </div>
      <p role="status" className="text-muted-foreground text-xs">
        {message ??
          "People you share with see a countdown, and you get a reminder to send the link 3 weeks ahead."}
      </p>
    </form>
  );
}
