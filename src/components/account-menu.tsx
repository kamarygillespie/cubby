"use client";

import Link from "next/link";
import { BookmarkPlus, DatabaseBackup, CircleUser } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";

// Desktop account details, theme and log out. Phones have these under More.
export function AccountMenu({ email }: { email: string | undefined }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Account"
          />
        }
      >
        <CircleUser />
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-3 p-3">
        {email && (
          <p className="text-muted-foreground text-xs wrap-anywhere">{email}</p>
        )}
        <Link
          href="/save-to-cubby"
          className={buttonVariants({
            variant: "ghost",
            className: "justify-start",
          })}
        >
          <BookmarkPlus />
          Save to Cubby button
        </Link>
        <Link
          href="/data"
          className={buttonVariants({
            variant: "ghost",
            className: "justify-start",
          })}
        >
          <DatabaseBackup />
          Backup &amp; import
        </Link>
        <div className="flex items-center justify-between gap-2">
          <span>Theme</span>
          <ThemeToggle />
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Log out
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
