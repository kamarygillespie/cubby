import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

// Static, cached by the service worker at install and shown for any page
// that can't load while offline (KAM-51).
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 p-4 text-center">
      <WifiOff className="text-muted-foreground size-8" aria-hidden />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground text-sm">
        Cubby needs a connection to load your items. Check your Wi-Fi or data,
        then pull down to refresh.
      </p>
    </div>
  );
}
