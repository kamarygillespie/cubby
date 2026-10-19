import { describe, expect, it } from "vitest";
import {
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  themeClasses,
  themeInitScript,
  type ResolvedTheme,
} from "./theme";

describe("parseThemePreference", () => {
  it("accepts every known preference", () => {
    for (const pref of THEME_PREFERENCES) {
      expect(parseThemePreference(pref)).toBe(pref);
    }
  });

  it("falls back to system for missing or unknown values", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("")).toBe("system");
    expect(parseThemePreference("sepia")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("returns explicit preferences unchanged regardless of OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dim", false)).toBe("dim");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the OS for system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("themeClasses", () => {
  it("keeps the dark class for dim so dark: variants still apply", () => {
    expect(themeClasses("light")).toEqual({ dark: false, dim: false });
    expect(themeClasses("dim")).toEqual({ dark: true, dim: true });
    expect(themeClasses("dark")).toEqual({ dark: true, dim: false });
  });
});

// Runs the inline <head> script against a fake DOM and checks it lands on
// the same result as the TypeScript helpers.
function runInitScript(stored: string | null, systemPrefersDark: boolean) {
  const classes = new Set<string>();
  const documentElement = {
    classList: {
      toggle: (name: string, force: boolean) => {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    },
    style: { colorScheme: "" },
  };
  const localStorage = {
    getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored : null),
  };
  const matchMedia = () => ({ matches: systemPrefersDark });
  new Function("localStorage", "matchMedia", "document", themeInitScript)(
    localStorage,
    matchMedia,
    { documentElement },
  );
  return {
    dark: classes.has("dark"),
    dim: classes.has("dim"),
    colorScheme: documentElement.style.colorScheme,
  };
}

describe("themeInitScript", () => {
  const cases: [string | null, boolean][] = [
    [null, false],
    [null, true],
    ["bogus", true],
    ...THEME_PREFERENCES.flatMap(
      (p) =>
        [
          [p, false],
          [p, true],
        ] as [string, boolean][],
    ),
  ];

  it.each(cases)("stored=%s systemDark=%s matches helpers", (stored, sys) => {
    const expected: ResolvedTheme = resolveTheme(
      parseThemePreference(stored),
      sys,
    );
    expect(runInitScript(stored, sys)).toEqual({
      ...themeClasses(expected),
      colorScheme: expected === "light" ? "light" : "dark",
    });
  });

  it("does not throw when storage is unavailable", () => {
    expect(() =>
      new Function("localStorage", "matchMedia", "document", themeInitScript)(
        {
          getItem: () => {
            throw new Error("blocked");
          },
        },
        () => ({ matches: false }),
        {},
      ),
    ).not.toThrow();
  });
});
