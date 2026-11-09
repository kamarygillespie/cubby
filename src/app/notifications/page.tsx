import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Store, TrendingDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  getNotificationSettings,
  listNotifications,
} from "@/lib/db/notifications";
import { formatTimeAgo } from "@/lib/relative-time";
import { markAllReadAction } from "./actions";
import { PushToggle } from "./push-toggle";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Notifications" };

// Price-drop and favorite-store-sale alerts (KAM-54): the in-app list, so a
// missed push loses nothing, plus alert settings.
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [alerts, settings] = await Promise.all([
    listNotifications(supabase),
    getNotificationSettings(supabase),
  ]);
  const unread = alerts.filter((a) => !a.read_at).length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-4">
      <div>
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft />
          Items
        </Link>
      </div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No alerts yet. Cubby checks your wishlist prices every day and lets
          you know here when something drops or a favorite store has a sale.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border" aria-label="Alerts">
          {alerts.map((alert) => {
            const Icon = alert.kind === "store_sale" ? Store : TrendingDown;
            return (
              <li key={alert.id}>
                {/* A plain <a>: the route marks it read, then redirects. */}
                <a
                  href={`/notifications/${alert.id}`}
                  className="flex gap-3 p-3"
                >
                  <Icon
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm wrap-anywhere ${alert.read_at ? "" : "font-semibold"}`}
                    >
                      {alert.title}
                      {!alert.read_at && (
                        <span className="sr-only"> (new)</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm wrap-anywhere">
                      {alert.body}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatTimeAgo(alert.created_at)}
                  </span>
                  {!alert.read_at && (
                    <span
                      className="bg-primary mt-1.5 size-2 shrink-0 rounded-full"
                      aria-hidden
                    />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-medium">Push alerts</h2>
        <p className="text-muted-foreground text-sm">
          At most one push a day, summarizing new alerts.
        </p>
        <PushToggle />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-medium">Alert me about</h2>
        <SettingsForm settings={settings} />
      </section>
    </div>
  );
}
