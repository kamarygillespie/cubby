// Cooling-off check-in (KAM-82): "Still want these?" Pure, so the rules are
// unit-tested.

const DAY = 86_400_000;
export const CHECK_IN_MIN_AGE_DAYS = 60;
export const KEEP_QUIET_DAYS = 90;

export type CheckInFields = {
  created_at: string;
  interest_level: number | null;
  purchased: boolean;
  gifted: boolean;
  archived_at: string | null;
  kept_at: string | null;
};

// On the wishlist for 60+ days, rated 3 stars or less (or not rated), and
// not kept in the last 90 days.
export function isCheckInCandidate(item: CheckInFields, now: Date): boolean {
  if (item.purchased || item.gifted || item.archived_at) return false;
  const t = now.getTime();
  if (Date.parse(item.created_at) > t - CHECK_IN_MIN_AGE_DAYS * DAY)
    return false;
  if ((item.interest_level ?? 0) > 3) return false;
  return !item.kept_at || Date.parse(item.kept_at) < t - KEEP_QUIET_DAYS * DAY;
}

// The home-page banner: on, something to review, and not hidden this month.
export function showCheckInBanner({
  candidates,
  enabled,
  dismissedAt,
  now,
}: {
  candidates: number;
  enabled: boolean;
  dismissedAt: string | null;
  now: Date;
}): boolean {
  if (!enabled || candidates === 0) return false;
  if (!dismissedAt) return true;
  const d = new Date(dismissedAt);
  return (
    d.getUTCFullYear() !== now.getUTCFullYear() ||
    d.getUTCMonth() !== now.getUTCMonth()
  );
}
