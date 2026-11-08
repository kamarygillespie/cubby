// "just now", "5m ago", "3h ago", "2d ago" — then a short date past ~a month.
export function formatTimeAgo(
  iso: string | null,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return null;
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
