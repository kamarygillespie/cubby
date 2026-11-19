"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  ListChecks,
  Menu,
  Shirt,
  Store,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

const TABS = [
  { href: "/", label: "Wishlist", Icon: Heart, match: ["/", "/items"] },
  {
    href: "/wishlists",
    label: "Lists",
    Icon: ListChecks,
    match: ["/wishlists"],
  },
  {
    href: "/closet",
    label: "Closet",
    Icon: Shirt,
    match: ["/closet", "/outfits"],
  },
  { href: "/stores", label: "Stores", Icon: Store, match: ["/stores"] },
  {
    href: "/more",
    label: "More",
    Icon: Menu,
    match: ["/more", "/types", "/notifications", "/save-to-cubby"],
  },
] as const;

// Pages where there's no signed-in app to navigate (or no room for it).
const HIDDEN = ["/login", "/signup", "/auth", "/share", "/offline"];

const isActive = (pathname: string, match: readonly string[]) =>
  match.some((m) =>
    m === "/"
      ? pathname === "/"
      : pathname === m || pathname.startsWith(`${m}/`),
  );

// Inside the Link so a tapped tab lights up right away (KAM-63).
function TabContent({
  label,
  Icon,
  active,
}: {
  label: string;
  Icon: LucideIcon;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  const highlighted = active || pending;
  return (
    <span
      className={cn(
        "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        highlighted ? "text-brand font-medium" : "text-muted-foreground",
      )}
    >
      <Icon
        className={cn("size-5", highlighted && "fill-current/15")}
        aria-hidden
      />
      {label}
    </span>
  );
}

// Phone tab bar (KAM-51): the installed app's main navigation. Desktop keeps
// the header links. Includes a spacer so page content isn't hidden behind it.
export function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return null;

  return (
    <>
      <div
        className="h-[calc(4rem+env(safe-area-inset-bottom))] sm:hidden"
        aria-hidden
      />
      <nav
        aria-label="Main"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="grid h-16 grid-cols-5">
          {TABS.map(({ href, label, Icon, match }) => {
            const active = isActive(pathname, match);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="block h-full"
                >
                  <TabContent label={label} Icon={Icon} active={active} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
