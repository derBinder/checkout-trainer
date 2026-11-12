import { describe, expect, it } from "vitest";
import { LOCALES } from "../locales";
import { de } from "./de";
import { en } from "./en";
import { DICTIONARIES, dictionaryFor, type Dictionary } from "./index";

type Tree = { [key: string]: unknown };

/** Sortierte Liste aller Blatt-Pfade (`common.appName`). */
function keyPaths(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === "object" && value !== null
        ? keyPaths(value as Tree, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort();
}

function at(tree: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Tree)[key], tree);
}

function leaves(tree: Tree): unknown[] {
  return keyPaths(tree).map((path) => at(tree, path));
}

describe("Wörterbücher", () => {
  it("hat in beiden Sprachen dieselben Einträge", () => {
    expect(keyPaths(en)).toEqual(keyPaths(de));
  });

  it("hat keinen leeren Text", () => {
    for (const d of [de, en]) {
      for (const v of leaves(d)) {
        expect(["string", "function"]).toContain(typeof v);
        if (typeof v === "string") expect(v.trim()).not.toBe("");
      }
    }
  });

  it("Funktionen nehmen in beiden Sprachen gleich viele Werte", () => {
    for (const path of keyPaths(de)) {
      const value = at(de, path);
      if (typeof value === "function") {
        expect((at(en, path) as (...args: unknown[]) => string).length).toBe(value.length);
      }
    }
  });

  it("enthält die gemeinsamen Texte und die Sprachnamen", () => {
    expect(de.common.appName).toBe("Checkout-Trainer");
    expect(en.common.appName).toBe("Checkout-Trainer");
    expect(de.common.titleSuffix).toBe(" · Checkout-Trainer");
    expect(en.common.titleSuffix).toBe(" · Checkout-Trainer");
    expect(de.language.label).toBe("Sprache");
    expect(en.language.label).toBe("Language");
    // Sprachnamen werden nie übersetzt.
    for (const d of [de, en]) {
      expect(d.language.names).toEqual({ de: "Deutsch", en: "English" });
      expect(d.language.short).toEqual({ de: "DE", en: "EN" });
    }
  });

  it("hat für jede Sprache ein Wörterbuch", () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual([...LOCALES].sort());
    expect(dictionaryFor("de")).toBe(de);
    expect(dictionaryFor("en")).toBe(en);
  });

  it("meldet fehlende und überzählige Einträge schon im Typ-Check", () => {
    // @ts-expect-error fehlender Eintrag
    const missing: Dictionary = { ...en, common: { appName: "x", titleSuffix: "y" } };
    const extra: Dictionary = {
      ...en,
      // @ts-expect-error überzähliger Eintrag
      language: { ...en.language, extra: "z" },
    };
    // Literal-Strings sind geweitet: andere Texte als die deutschen passen in den Typ.
    const other: Dictionary["common"] = { appName: "a", titleSuffix: "b", description: "c" };
    expect([missing, extra, other]).toHaveLength(3);
  });
});
