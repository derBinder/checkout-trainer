import { describe, expect, it } from "vitest";
import {
  THEME_COLORS,
  THEME_SETTINGS,
  THEME_STORAGE_KEY,
  parseThemeSetting,
  resolveTheme,
  themeAttribute,
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
  const metas = [
    { media: "(prefers-color-scheme: light)", content: "x" },
    { media: "(prefers-color-scheme: dark)", content: "x" },
  ].map((m) => ({
    getAttribute: (name: string) => (name === "media" ? m.media : null),
    setAttribute: (name: string, value: string) => {
      if (name === "content") m.content = value;
    },
    get content() {
      return m.content;
    },
  }));
  const onReady: (() => void)[] = [];
  const document = {
    addEventListener: (type: string, fn: () => void) => {
      if (type === "DOMContentLoaded") onReady.push(fn);
    },
    documentElement: {
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      removeAttribute: (k: string) => attrs.delete(k),
    },
    querySelectorAll: (selector: string) => (selector === 'meta[name="theme-color"]' ? metas : []),
  };
  const localStorage = {
    getItem: (key: string) => {
      if (opts.storageThrows) throw new Error("blocked");
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  new Function("document", "localStorage", themeInitScript)(document, localStorage);
  // Die Meta-Zeilen entstehen erst nach dem Skript: so tun, als kämen sie jetzt dazu.
  for (const m of metas) m.setAttribute("content", "x");
  for (const fn of onReady) fn();
  return { attr: attrs.get("data-theme") ?? null, metaColors: metas.map((m) => m.content) };
}

describe("themeInitScript", () => {
  const cases: [string | null, ThemeSetting][] = [
    [null, "system"],
    ["system", "system"],
    ["light", "light"],
    ["dark", "dark"],
    ["purple", "system"],
  ];

  it.each(cases)("stored %s behaves like %s", (stored, setting) => {
    const { attr, metaColors } = runScript(stored);
    expect(attr).toBe(themeAttribute(setting));
    // Erst die Meta-Zeile für helles, dann für dunkles System.
    expect(metaColors).toEqual([
      THEME_COLORS[resolveTheme(setting, false)],
      THEME_COLORS[resolveTheme(setting, true)],
    ]);
  });

  it("does nothing when storage is unavailable", () => {
    expect(() => runScript(null, { storageThrows: true })).not.toThrow();
    expect(runScript(null, { storageThrows: true }).attr).toBeNull();
  });
});
