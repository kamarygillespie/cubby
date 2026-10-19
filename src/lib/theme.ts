// Theme preference: light, dim (the "in-between" soft-dark palette), dark,
// or system (follows the OS light/dark setting). Stored per-device in
// localStorage — see ARCHITECTURE.md "Theming".

export const THEME_PREFERENCES = ["light", "dim", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const THEME_STORAGE_KEY = "cubby-theme";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

// Must match each palette's --background in globals.css (converted to hex),
// used for the browser/PWA chrome color.
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#ffffff",
  dim: "#21272f",
  dark: "#0a0a0a",
};

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "cubby-theme-change";

export function parseThemePreference(value: string | null): ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value ?? "")
    ? (value as ThemePreference)
    : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference !== "system") return preference;
  return systemPrefersDark ? "dark" : "light";
}

// Dim is a dark-family theme, so it keeps the `dark` class (Tailwind's
// `dark:` variants still apply) and layers `dim` on top to swap the palette.
export function themeClasses(theme: ResolvedTheme) {
  return { dark: theme !== "light", dim: theme === "dim" };
}

// Runs synchronously in <head> before first paint so there's no flash of
// the wrong theme. Self-contained (no imports at runtime), so it mirrors
// parseThemePreference/resolveTheme/themeClasses — theme.test.ts checks
// they agree.
export const themeInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(THEME_PREFERENCES)}.indexOf(p)<0)p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};var t=p==="system"?(matchMedia(${JSON.stringify(SYSTEM_DARK_QUERY)}).matches?"dark":"light"):p;var e=document.documentElement;e.classList.toggle("dark",t!=="light");e.classList.toggle("dim",t==="dim");e.style.colorScheme=t==="light"?"light":"dark"}catch(_){}})()`;

// --- Browser-only helpers below (call from client components) ---

export function getThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(
    preference,
    window.matchMedia(SYSTEM_DARK_QUERY).matches,
  );
  const root = document.documentElement;
  const classes = themeClasses(theme);
  root.classList.toggle("dark", classes.dark);
  root.classList.toggle("dim", classes.dim);
  root.style.colorScheme = theme === "light" ? "light" : "dark";
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = THEME_COLORS[theme];
    });
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable (private mode etc.) — still apply for this page.
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Notifies on in-tab changes, other-tab changes (storage event), and OS
// light/dark changes (which matter when the preference is "system").
export function subscribeToTheme(onChange: () => void) {
  const media = window.matchMedia(SYSTEM_DARK_QUERY);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onChange);
  };
}
