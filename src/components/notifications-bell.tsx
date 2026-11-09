import Link from "next/link";
import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// Header bell with an unread count (KAM-54).
export function NotificationsBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={buttonVariants({
        variant: "ghost",
        size: "icon",
        className: "relative",
      })}
    >
      <Bell />
      {unread > 0 && (
        <span
          className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold"
          aria-hidden
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
