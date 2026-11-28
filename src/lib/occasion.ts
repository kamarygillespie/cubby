// Occasion dates on wishlists (KAM-79). Dates are plain calendar days
// ("2026-12-25"), compared as days so time zones can't shift them.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(date: string): number | null {
  if (!DATE_RE.test(date)) return null;
  const ms = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
  return Number.isNaN(ms) ? null : Math.round(ms / 86_400_000);
}

// The viewer's own calendar day, as "YYYY-MM-DD".
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function daysUntil(date: string, today: string): number | null {
  const a = dayNumber(date);
  const b = dayNumber(today);
  return a === null || b === null ? null : a - b;
}

// "Dec 25", or "Dec 25, 2027" when it isn't this year.
export function formatOccasionDate(date: string, today: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return y === Number(today.slice(0, 4)) ? label : `${label}, ${y}`;
}

// "28 days to go" / "Tomorrow" / "Today!"; null once it's passed.
export function countdownLabel(date: string, today: string): string | null {
  const days = daysUntil(date, today);
  if (days === null || days < 0) return null;
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days} days to go`;
}

export function isPast(date: string | null, today: string): boolean {
  if (!date) return false;
  const days = daysUntil(date, today);
  return days !== null && days < 0;
}

// The date field: blank clears it; otherwise a real calendar date.
export function parseOccasionDate(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: true, value: null };
  const day = dayNumber(value);
  // Round-trips, so "2026-02-31" is rejected rather than rolled over.
  if (day === null) return { ok: false, error: "Pick a valid date." };
  const back = new Date(day * 86_400_000).toISOString().slice(0, 10);
  return back === value
    ? { ok: true, value }
    : { ok: false, error: "Pick a valid date." };
}
