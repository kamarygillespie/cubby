"use client";

import { useSyncExternalStore } from "react";
import { CalendarHeart } from "lucide-react";
import {
  countdownLabel,
  formatOccasionDate,
  isPast,
  localToday,
} from "@/lib/occasion";

// The viewer's calendar day in the browser; null while rendering on the
// server, so the server's day can't disagree with the viewer's.
const noSubscribe = () => () => {};
export const useLocalToday = () =>
  useSyncExternalStore(noSubscribe, localToday, () => null);

// A list's occasion (KAM-79), counted in the viewer's own time zone.
export function OccasionCountdown({
  date,
  variant = "countdown",
}: {
  date: string;
  // "countdown": the share page. "label": a compact line on /wishlists.
  variant?: "countdown" | "label";
}) {
  const today = useLocalToday();
  if (!today) return null;

  const when = formatOccasionDate(date, today);
  const countdown = countdownLabel(date, today);

  if (variant === "label") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <CalendarHeart className="size-3.5" aria-hidden />
        {isPast(date, today) ? `${when} · Past` : `${when} · ${countdown}`}
      </span>
    );
  }

  if (!countdown) return null;
  return (
    <p className="text-brand flex items-center gap-1.5 text-sm font-medium">
      <CalendarHeart className="size-4" aria-hidden />
      {when} · {countdown}
    </p>
  );
}
