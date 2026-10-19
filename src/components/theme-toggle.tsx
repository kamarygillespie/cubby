"use client";

import { useSyncExternalStore } from "react";
import { CloudMoonIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCES,
  getThemePreference,
  parseThemePreference,
  setThemePreference,
  subscribeToTheme,
  type ThemePreference,
} from "@/lib/theme";

const THEME_OPTIONS: Record<
  ThemePreference,
  { label: string; Icon: typeof SunIcon }
> = {
  light: { label: "Light", Icon: SunIcon },
  dim: { label: "Dim", Icon: CloudMoonIcon },
  dark: { label: "Dark", Icon: MoonIcon },
  system: { label: "System", Icon: MonitorIcon },
};

export function ThemeToggle() {
  // Server snapshot is the default; React swaps in the stored value right
  // after hydration without a mismatch error.
  const preference = useSyncExternalStore(
    subscribeToTheme,
    getThemePreference,
    () => DEFAULT_THEME_PREFERENCE,
  );

  return (
    <Select
      value={preference}
      onValueChange={(v) => setThemePreference(parseThemePreference(v))}
    >
      <SelectTrigger aria-label="Theme" title="Theme">
        <SelectValue>
          {(v: ThemePreference) => {
            const { Icon } = THEME_OPTIONS[v];
            return <Icon />;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {THEME_PREFERENCES.map((pref) => {
          const { label, Icon } = THEME_OPTIONS[pref];
          return (
            <SelectItem key={pref} value={pref}>
              <Icon />
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
