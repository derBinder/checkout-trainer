import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Wächter gegen Tailwind-Klassen mit freien Werten (siehe CLAUDE.md, Regeln).
 *
 * Geprüft wird jedes Wort in jedem String-Literal ('…', "…", `…`) in
 * src/**\/*.{ts,tsx}. Vom Wort zählt nur die Klasse hinter der letzten
 * Variante (Doppelpunkte innerhalb von Klammern zählen nicht). Verboten ist sie,
 * wenn ihr Wert in eckigen oder runden Klammern steht (h-[3px], scale-[0.98],
 * w-[calc(…)], bg-(--x)) oder wenn sie eine freie Eigenschaft ist ([mask:…]).
 * Varianten in Klammern bleiben erlaubt (data-[side=bottom]:, [&_svg]:,
 * not-aria-[haspopup]:). Nicht erkannt werden Klassen, die zur Laufzeit aus
 * Bruchstücken zusammengesetzt werden, und Klassen in .css-Dateien.
 */

const SRC = join(import.meta.dirname, "..");
const SELF = relative(SRC, import.meta.filename);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const STRING_LITERAL = /"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;

/** Die Klasse ohne Varianten: alles nach dem letzten Doppelpunkt außerhalb von Klammern. */
function utilityOf(word: string): string {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) start = i + 1;
  }
  return word.slice(start).replace(/^[!-]/, "");
}

// Freie Eigenschaft: [eigenschaft:wert]; ein Selektor wie "[data-rest]" hat keinen Doppelpunkt.
const ARBITRARY_VALUE = /^\[[^\]]*:|-[[(]/;

export function arbitraryClasses(source: string): string[] {
  return (source.match(STRING_LITERAL) ?? [])
    .flatMap((literal) => literal.slice(1, -1).split(/\s+/))
    .filter((word) => word !== "" && ARBITRARY_VALUE.test(utilityOf(word)));
}

describe("arbitraryClasses", () => {
  it("finds arbitrary values, also behind variants", () => {
    expect(
      arbitraryClasses('cn("h-[3px] text-sm", `active:not-aria-[haspopup]:scale-[0.98] w-[calc(100%-1rem)]`)'),
    ).toEqual(["h-[3px]", "active:not-aria-[haspopup]:scale-[0.98]", "w-[calc(100%-1rem)]"]);
    expect(arbitraryClasses('"bg-(--brand) [mask-type:luminance] -mt-[2px]"')).toEqual([
      "bg-(--brand)",
      "[mask-type:luminance]",
      "-mt-[2px]",
    ]);
  });

  it("allows bracketed variants and ordinary code", () => {
    expect(
      arbitraryClasses(
        '"[&_svg]:size-4 data-[side=bottom]:border-t *:[svg:not([class*=\'size-\'])]:size-6 has-data-[icon=inline-end]:pr-2"',
      ),
    ).toEqual([]);
    expect(
      arbitraryClasses(`querySelectorAll('meta[name="theme-color"]'); closest("[data-rest]"); "rounded-pill h-13 text-numeral"`),
    ).toEqual([]);
  });
});

describe("source files", () => {
  it("use no arbitrary Tailwind values", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => relative(SRC, file) !== SELF)
      .flatMap((file) =>
        arbitraryClasses(readFileSync(file, "utf8")).map((word) => `${relative(SRC, file)}: ${word}`),
      );
    expect(offenders).toEqual([]);
  });
});
