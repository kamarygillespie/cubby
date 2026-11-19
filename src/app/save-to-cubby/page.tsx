import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SaveButtonSetup } from "./save-button-setup";

export const metadata: Metadata = { title: "Save to Cubby" };

export default function SaveToCubbyPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
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
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Save to Cubby</h1>
        <p className="text-muted-foreground">
          Save from the page you&apos;re already looking at. It works at stores
          that block Cubby from reading links, like H&amp;M.
        </p>
      </div>
      <SaveButtonSetup />
    </div>
  );
}
