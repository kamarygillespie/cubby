"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VAPID_PUBLIC_KEY, base64UrlToBytes } from "@/lib/push";
import { subscribePushAction, unsubscribePushAction } from "./actions";

type Status =
  | "loading"
  | "ios-not-installed" // iPhone Safari: push only works from the Home Screen app
  | "unsupported"
  | "blocked" // permission denied in browser settings
  | "off"
  | "on";

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function registration() {
  // Registered by ServiceWorkerRegister (production builds only).
  return (await navigator.serviceWorker?.getRegistration("/")) ?? null;
}

async function currentStatus(): Promise<Status> {
  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  if (!supported) {
    return isIos() && !isStandalone() ? "ios-not-installed" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  const reg = await registration();
  if (!reg) return "unsupported";
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

// "Alerts on this device" (KAM-54). Each browser/phone subscribes on its
// own; the daily digest goes to every device that's on.
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    currentStatus().then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, []);

  function turnOn() {
    setError(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "blocked" : "off");
          return;
        }
        const reg = await registration();
        if (!reg) throw new Error("No service worker");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
        });
        const json = sub.toJSON();
        await subscribePushAction({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        });
        setStatus("on");
      } catch {
        setError("Couldn't turn on alerts. Try again.");
      }
    });
  }

  function turnOff() {
    setError(null);
    startTransition(async () => {
      try {
        const sub = await (await registration())?.pushManager.getSubscription();
        if (sub) {
          await unsubscribePushAction(sub.endpoint);
          await sub.unsubscribe();
        }
        setStatus("off");
      } catch {
        setError("Couldn't turn off alerts. Try again.");
      }
    });
  }

  if (status === "loading") {
    return <p className="text-muted-foreground text-sm">Checking…</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "on" && (
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm">
            <BellRing className="size-4" aria-hidden />
            On for this device
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={turnOff}
            disabled={pending}
          >
            Turn off
          </Button>
        </div>
      )}
      {status === "off" && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <BellOff className="size-4" aria-hidden />
            Off for this device
          </p>
          <Button size="sm" onClick={turnOn} disabled={pending}>
            Turn on
          </Button>
        </div>
      )}
      {status === "blocked" && (
        <p className="text-muted-foreground text-sm">
          Notifications are blocked for Cubby. Allow them in your browser or
          phone settings, then come back here.
        </p>
      )}
      {status === "ios-not-installed" && (
        <p className="text-muted-foreground text-sm">
          On iPhone, alerts only work from the Home Screen app: in Safari, tap{" "}
          <Share
            className="inline size-4 align-text-bottom"
            aria-label="Share"
          />{" "}
          then <strong>Add to Home Screen</strong>, open Cubby from there, and
          turn alerts on.
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-muted-foreground text-sm">
          This browser can&apos;t receive push alerts. You&apos;ll still see
          them in the list below.
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
