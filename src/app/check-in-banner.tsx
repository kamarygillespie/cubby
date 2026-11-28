"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Leaf, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissCheckInAction } from "./check-in/actions";

// "Still want these?" on the home page (KAM-82), once a month while there's
// something to review. Hiding it lasts until next month.
export function CheckInBanner({ count }: { count: number }) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();
  if (hidden) return null;
  return (
    <div className="bg-secondary flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
      <Leaf className="text-brand size-4 shrink-0" aria-hidden />
      <Link href="/check-in" className="flex-1 font-medium hover:underline">
        Still want these? {count} item{count === 1 ? "" : "s"} to look over
      </Link>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Hide the check-in until next month"
        onClick={() =>
          startTransition(async () => {
            setHidden(true);
            await dismissCheckInAction();
          })
        }
      >
        <X />
      </Button>
    </div>
  );
}
