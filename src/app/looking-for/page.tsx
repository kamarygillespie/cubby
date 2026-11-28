import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listLookingFor } from "@/lib/db/looking-for";
import { formatCurrency } from "@/lib/format";
import { AddLookingForForm } from "./add-form";
import { RemoveLookingFor } from "./remove-button";

export const metadata: Metadata = { title: "Looking for" };

// Things wanted before a product is found (KAM-102). Not part of the
// wishlist: no totals, price checks or spending.
export default async function LookingForPage() {
  const entries = await listLookingFor(await createClient());
  const open = entries.filter((e) => !e.found_at);
  const found = entries.filter((e) => e.found_at);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-4">
      <Link
        href="/"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        Items
      </Link>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Search className="size-5" aria-hidden />
          Looking for
        </h1>
        <p className="text-muted-foreground text-sm">
          Things you want but haven&apos;t found the right one yet. When you
          find it, tap <strong>Found it</strong> to add it to your wishlist.
          Copy wishlist includes these, so an AI can suggest options.
        </p>
      </div>

      <AddLookingForForm />

      {open.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing yet. Add something you&apos;re on the hunt for, like a desk
          lamp for the office.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border" aria-label="Looking for">
          {open.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{entry.title}</span>
                {(entry.budget !== null || entry.notes) && (
                  <span className="text-muted-foreground text-sm">
                    {[
                      entry.budget !== null
                        ? `Up to ${formatCurrency(entry.budget)}`
                        : null,
                      entry.notes,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>
              <Link
                href={`/items/new?lookingFor=${entry.id}`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
                aria-label={`Found it: add ${entry.title} to your wishlist`}
              >
                <Check />
                Found it
              </Link>
              <RemoveLookingFor id={entry.id} title={entry.title} />
            </li>
          ))}
        </ul>
      )}

      {found.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Found</h2>
          <ul className="flex flex-col gap-1 text-sm" aria-label="Found">
            {found.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2">
                <Check className="text-brand size-4 shrink-0" aria-hidden />
                <span className="text-muted-foreground line-through">
                  {entry.title}
                </span>
                {entry.found_item && (
                  <span className="truncate">→ {entry.found_item.title}</span>
                )}
                <span className="ml-auto">
                  <RemoveLookingFor id={entry.id} title={entry.title} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
