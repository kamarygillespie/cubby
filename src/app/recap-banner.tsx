"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";

const noSubscribe = () => () => {};
const decemberYear = () => {
  const now = new Date();
  return now.getMonth() === 11 ? now.getFullYear() : null;
};

// Year in Cubby (KAM-86) on the home page, in December only (the viewer's).
export function RecapBanner() {
  const year = useSyncExternalStore(noSubscribe, decemberYear, () => null);
  if (!year) return null;
  return (
    <Link
      href={`/recap?year=${year}`}
      className="bg-brand/10 text-brand hover:bg-brand/15 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
    >
      <Sparkles className="size-4" aria-hidden />
      Your {year} in Cubby is ready
    </Link>
  );
}
