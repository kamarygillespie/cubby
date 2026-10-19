import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        This page doesn&apos;t exist, or it isn&apos;t yours to see.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to items
      </Link>
    </div>
  );
}
