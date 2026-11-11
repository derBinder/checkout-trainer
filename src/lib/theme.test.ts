import { describe, expect, it } from "vitest";
import {
  THEME_COLORS,
  THEME_SETTINGS,
  THEME_CHOICE_META_ID,
  THEME_STORAGE_KEY,
  parseThemeSetting,
  resolveTheme,
  themeAttribute,
  themeChoiceColor,
  themeInitScript,
  type ThemeSetting,
} from "./theme";

describe("parseThemeSetting", () => {
  it("accepts the three settings", () => {
    for (const s of THEME_SETTINGS) expect(parseThemeSetting(s)).toBe(s);
  });

  it("falls back to system for missing or unknown values", () => {
    for (const v of [null, undefined, "", "Dark", "blue", 1, {}]) {
      expect(parseThemeSetting(v)).toBe("system");
    }
  });
});

describe("resolveTheme", () => {
  it("follows the OS for system", () => {
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
  });

  it("ignores the OS for an explicit choice", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("themeAttribute", () => {
  it("is only set for an explicit choice, so CSS follows the OS otherwise", () => {
    expect(themeAttribute("system")).toBeNull();
    expect(themeAttribute("light")).toBe("light");
    expect(themeAttribute("dark")).toBe("dark");
  });
});

/** Minimal DOM, just what the inline script touches. */
function runScript(stored: string | null, opts: { storageThrows?: boolean } = {}) {
  const attrs = new Map<string, string>();
  const added: { id: string; name: string; content: string }[] = [];
  const document = {
    documentElement: {
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      removeAttribute: (k: string) => attrs.delete(k),
    },
    createElement: () => ({ id: "", name: "", content: "" }),
    head: { appendChild: (el: { id: string; name: string; content: string }) => added.push(el) },
  };
  const localStorage = {
    getItem: (key: string) => {
      if (opts.storageThrows) throw new Error("blocked");
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  new Function("document", "localStorage", themeInitScript)(document, localStorage);
  return { attr: attrs.get("data-theme") ?? null, added };
}

/**
 * Farbe der Browserleiste: Der Browser nimmt die erste passende theme-color-Zeile.
 * Die Zeile des Skripts steht vor denen von Next (eine pro Systemeinstellung).
 */
function effectiveColor(added: { content: string }[], prefersDark: boolean) {
  return added[0]?.content ?? THEME_COLORS[prefersDark ? "dark" : "light"];
}

describe("themeChoiceColor", () => {
  it("is only set for an explicit choice", () => {
    expect(themeChoiceColor("system")).toBeNull();
    expect(themeChoiceColor("light")).toBe(THEME_COLORS.light);
    expect(themeChoiceColor("dark")).toBe(THEME_COLORS.dark);
  });
});

describe("themeInitScript", () => {
  const cases: [string | null, ThemeSetting][] = [
    [null, "system"],
    ["system", "system"],
    ["light", "light"],
    ["dark", "dark"],
    ["purple", "system"],
  ];

  it.each(cases)("stored %s behaves like %s", (stored, setting) => {
    const { attr, added } = runScript(stored);
    expect(attr).toBe(themeAttribute(setting));
    // Die Zeilen von Next bleiben unberührt; das Skript fügt höchstens eine eigene hinzu.
    expect(added.length).toBe(setting === "system" ? 0 : 1);
    for (const el of added) {
      expect(el).toMatchObject({ id: THEME_CHOICE_META_ID, name: "theme-color" });
    }
    expect(effectiveColor(added, false)).toBe(THEME_COLORS[resolveTheme(setting, false)]);
    expect(effectiveColor(added, true)).toBe(THEME_COLORS[resolveTheme(setting, true)]);
  });

  it("does nothing when storage is unavailable", () => {
    expect(() => runScript(null, { storageThrows: true })).not.toThrow();
    expect(runScript(null, { storageThrows: true })).toEqual({ attr: null, added: [] });
  });
});
