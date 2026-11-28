import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listItemTypes } from "@/lib/db/item-types";
import { ImportItems } from "./import-items";

export const metadata: Metadata = { title: "Backup & import" };

// Export and import items as CSV (KAM-87).
export default async function DataPage() {
  const types = await listItemTypes(await createClient());

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4">
      <Link
        href="/more"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeft />
        More
      </Link>
      <h1 className="text-xl font-semibold">Backup &amp; import</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Download a backup</h2>
        <p className="text-muted-foreground text-sm">
          Every item (wishlist, bought, gifts, closet and archived) as a CSV
          file that opens in any spreadsheet. Photos are included as links.
        </p>
        <a
          href="/api/export"
          download
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          <Download />
          Download CSV
        </a>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Import items</h2>
        <p className="text-muted-foreground text-sm">
          From a Cubby backup or any spreadsheet saved as CSV. Everything is
          added as new items; nothing you already have is changed.
        </p>
        <ImportItems
          types={types.map((t) => ({
            id: t.id,
            name: t.name,
            category: t.category?.name ?? "",
          }))}
        />
      </section>
    </div>
  );
}
