"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = "cubby-install-dismissed";
const noop = () => () => {};

function platform() {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  return "other";
}

// "Add Cubby to your Home Screen" (KAM-51). iPhone gets Share → Add to Home
// Screen instructions (Safari has no install API); Chrome/Edge/Android get
// an Install button via beforeinstallprompt. Hidden once installed.
// variant "card": dismissible nudge (home, phones); "panel": always shown
// with status (More page).
export function InstallPrompt({ variant }: { variant: "card" | "panel" }) {
  const kind = useSyncExternalStore(noop, platform, () => "unknown");
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return (
        typeof window !== "undefined" &&
        localStorage.getItem(DISMISS_KEY) === "1"
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (kind === "unknown") return null;
  if (variant === "card" && (kind === "installed" || dismissed)) return null;
  if (variant === "card" && kind === "other" && !deferred) return null;

  const body =
    kind === "installed" ? (
      <p className="text-sm">Cubby is installed on this device.</p>
    ) : kind === "ios" ? (
      <p className="text-sm">
        In Safari, tap{" "}
        <Share className="inline size-4 align-text-bottom" aria-label="Share" />{" "}
        <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Cubby
        opens full-screen like an app.
      </p>
    ) : deferred ? (
      <div className="flex items-center gap-3">
        <p className="text-sm">
          Install Cubby for a full-screen, app-like experience.
        </p>
        <Button
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
        >
          <Download />
          Install
        </Button>
      </div>
    ) : (
      <p className="text-sm">
        Use your browser&apos;s menu to <strong>Install app</strong> or{" "}
        <strong>Add to Home Screen</strong>.
      </p>
    );

  return (
    <div className="bg-muted/50 relative flex flex-col gap-1 rounded-xl border p-3 pr-9">
      <p className="text-sm font-medium">
        {kind === "installed"
          ? "App installed"
          : "Add Cubby to your Home Screen"}
      </p>
      {body}
      {variant === "card" && (
        <Button
          size="icon-xs"
          variant="ghost"
          className="absolute top-2 right-2"
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore: just won't remember
            }
          }}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
