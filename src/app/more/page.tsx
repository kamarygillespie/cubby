import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ChevronRight, Sparkles, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallPrompt } from "@/components/install-prompt";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/?view=totals", label: "Totals & insights", Icon: BarChart3 },
  { href: "/outfits", label: "Outfits", Icon: Sparkles },
  { href: "/types", label: "Item types", Icon: Tags },
];

// The phone tab bar's "More" (KAM-51): everything that isn't a main tab.
export default async function MorePage() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 p-4">
      <div>
        <h1 className="text-xl font-semibold">More</h1>
        {user?.email && (
          <p className="text-muted-foreground text-sm wrap-anywhere">
            Signed in as {user.email}
          </p>
        )}
      </div>

      <ul className="divide-y rounded-xl border">
        {LINKS.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 p-3 text-sm">
              <Icon className="text-muted-foreground size-4" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight
                className="text-muted-foreground size-4"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-xl border p-3">
        <span className="text-sm">Theme</span>
        <ThemeToggle />
      </div>

      <InstallPrompt variant="panel" />

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Log out
        </Button>
      </form>
    </div>
  );
}
