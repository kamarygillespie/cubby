"use client";

import { useLayoutEffect } from "react";
import { applyTheme, getThemePreference, subscribeToTheme } from "@/lib/theme";

// The inline <head> script sets the theme before first paint; this keeps it
// correct afterwards — re-applying after React's dev-mode remount resets
// <html>'s classes, following OS changes while on "system", and syncing
// changes made in other tabs.
export function ThemeSync() {
  useLayoutEffect(() => {
    const sync = () => applyTheme(getThemePreference());
    sync();
    return subscribeToTheme(sync);
  }, []);
  return null;
}
