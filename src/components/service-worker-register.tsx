"use client";

import { useEffect } from "react";

// Registers public/sw.js in production builds only (in dev it would cache
// stale assets between edits).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Not fatal: the app works without it, just no offline screen.
      });
  }, []);
  return null;
}
