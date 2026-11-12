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

  it("formuliert jede Begründung auf Deutsch wie bisher", () => {
    const r = de.study.reason;
    expect(r({ kind: "only" })).toBe("Der einzige Weg.");
    expect(r({ kind: "direct" })).toBe("Direkt auf das Doppel.");
    expect(r({ kind: "split", a: 16, b: 8 })).toBe(
      "Zwischen 16 und 8 gezielt lässt jedes der beiden Felder ein Doppel.",
    );
    expect(r({ kind: "singleFinish", field: 19, bull: false })).toBe("Bleibt bei Single 19 auf einem Finish.");
    expect(r({ kind: "singleFinish", field: 20, bull: true })).toBe("Bleibt bei Single 20 auf Bull-Finish.");
    expect(r({ kind: "halving", double: "D16", times: 1 })).toBe("Endet auf D16, das sich einmal halbieren lässt.");
    expect(r({ kind: "halving", double: "D16", times: 2 })).toBe("Endet auf D16, das sich zweimal halbieren lässt.");
    expect(r({ kind: "halving", double: "D16", times: 3 })).toBe("Endet auf D16, das sich dreimal halbieren lässt.");
    expect(r({ kind: "halving", double: "D16", times: 4 })).toBe("Endet auf D16, das sich viermal halbieren lässt.");
    expect(r({ kind: "chart" })).toBe("Der übliche Weg nach Tabelle.");
  });

  it("formuliert jede Begründung auf Englisch", () => {
    const r = en.study.reason;
    expect(r({ kind: "only" })).toBe("The only route.");
    expect(r({ kind: "direct" })).toBe("Straight at the double.");
    expect(r({ kind: "split", a: 16, b: 8 })).toBe("Aim between 16 and 8: either one leaves a double.");
    expect(r({ kind: "singleFinish", field: 19, bull: false })).toBe("A single 19 still leaves a finish.");
    expect(r({ kind: "singleFinish", field: 20, bull: true })).toBe("A single 20 still leaves the bull.");
    expect(r({ kind: "halving", double: "D16", times: 1 })).toBe("Ends on D16, which splits down once.");
    expect(r({ kind: "halving", double: "D16", times: 2 })).toBe("Ends on D16, which splits down twice.");
    expect(r({ kind: "halving", double: "D16", times: 3 })).toBe("Ends on D16, which splits down three times.");
    expect(r({ kind: "halving", double: "D16", times: 4 })).toBe("Ends on D16, which splits down four times.");
    expect(r({ kind: "chart" })).toBe("The usual chart route.");
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

describe("Lernen", () => {
  it("schreibt die Abstände unter den Bewertungsknöpfen in beiden Sprachen", () => {
    const labels = [
      [{ unit: "now", value: 0 }, "gleich", "now"],
      [{ unit: "underMinute", value: 0 }, "< 1 Min", "< 1 min"],
      [{ unit: "minutes", value: 10 }, "10 Min", "10 min"],
      [{ unit: "hours", value: 3 }, "3 Std", "3 h"],
      [{ unit: "days", value: 1 }, "1 Tag", "1 day"],
      [{ unit: "days", value: 3 }, "3 Tage", "3 days"],
      [{ unit: "months", value: 1 }, "1 Monat", "1 month"],
      [{ unit: "months", value: 2 }, "2 Monate", "2 months"],
      [{ unit: "years", value: 1 }, "1 Jahr", "1 year"],
      [{ unit: "years", value: 1.5 }, "1,5 Jahre", "1.5 years"],
    ] as const;
    for (const [label, german, english] of labels) {
      expect(de.study.interval(label)).toBe(german);
      expect(en.study.interval(label)).toBe(english);
    }
  });

  it("zählt Bewertungen und Karten in Einzahl und Mehrzahl", () => {
    expect(en.study.session.skipped(1)).toBe("One rating was not counted.");
    expect(en.study.session.skipped(3)).toBe("3 ratings were not counted.");
    expect(en.study.session.notSaved(1)).toBe("1 rating was not saved.");
    expect(en.study.session.cardsStudied(1)).toBe("1 card studied.");
    expect(en.study.session.cardsStudied(4)).toBe("4 cards studied.");
    expect(de.study.session.cardsStudied(4)).toBe("4 Karten gelernt.");
  });

  it("nennt die Ringe und die Bewertungen auf Englisch", () => {
    expect(en.study.pad.rings).toEqual({ S: "Single", D: "Double", T: "Treble" });
    expect(Object.values(en.study.session.ratings)).toEqual(["Again", "Hard", "Good", "Easy"]);
    expect(Object.values(de.study.session.ratings)).toEqual(["Nochmal", "Schwer", "Gut", "Leicht"]);
  });
});
