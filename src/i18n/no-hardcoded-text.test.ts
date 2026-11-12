import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Wächter gegen harte Texte in der Oberfläche: Sichtbare und unsichtbare Texte
 * (aria-label, Seitentitel) kommen aus den Wörterbüchern in src/i18n/dictionaries.
 *
 * Geprüft werden die Dateien unter SCANNED ohne Tests, nach dem Entfernen der
 * Kommentare. Ein Fund ist
 * - A: JSX-Text mit mindestens drei Buchstaben zwischen `>` und dem nächsten `<`,
 *   auch vor, zwischen und nach Ausdrücken (`<p>{n} Karten</p>`);
 * - B: ein Attribut (`aria-label="…"`, auch `aria-label={a ? "…" : "…"}`) oder
 *   eine Objekt-Eigenschaft (`title: "…"`, etwa in `metadata`) aus
 *   TEXT_ATTRIBUTES mit String-Literal;
 * - C: ein String-Literal mit Umlaut oder ß, außer direkt nach `new Error(`
 *   (Fehlertexte, die nur in Logs landen).
 * Der App-Name und Feldnamen (T20, D16, 25, Bull) sind in beiden Sprachen gleich
 * und zählen nicht.
 *
 * Blinde Flecken, die beim Übersetzen von Hand mitgenommen werden müssen:
 * - Texte ohne Umlaut in sonstigen String-Literalen, etwa `LEVEL_LABEL` in
 *   components/level-style.ts („sicher“, „im Lernen“, „neu“) oder `title:` mit
 *   Bedingung (`n === 1 ? "Alternative" : …`).
 * - src/components/ui wird nicht geprüft; dort steht „Schließen“ in sheet.tsx.
 * - src/lib/srs/fsrs.ts liegt außerhalb von SCANNED; die Abstände auf den
 *   Bewertungsknöpfen („1 Tag“, „Min“, „gleich“) kommen von dort.
 * - CODE_NOT_TEXT: Damit Code nach `>` (Typ-Klammern, Vergleiche) nicht als Text
 *   gilt, zählt JSX-Text mit `;`, `=`, `&&`, `||`, einer Klammer ohne
 *   Gegenstück, einem führenden `,`/`|`/`&`/`:` oder einem führenden Schlüsselwort
 *   (`return`, `export`, …) nicht. Echter Text dieser Form wird übersehen.
 *
 * PENDING listet die Dateien, die noch harte Texte enthalten. Jede Übersetzung
 * streicht ihre Dateien daraus; am Ende ist die Liste leer.
 */

const SRC = join(import.meta.dirname, "..");

const SCANNED = [
  "app",
  "components",
  "lib/validation",
  "lib/auth/constants.ts",
  "lib/darts/cards.ts",
];
// shadcn-Bausteine ohne eigene Texte.
const SKIPPED = ["components/ui"];

const PENDING: string[] = [
  "app/(app)/einstellungen/page.tsx",
  "app/(app)/error.tsx",
  "app/(app)/heute/page.tsx",
  "app/(app)/statistik/page.tsx",
  "app/(app)/verwaltung/page.tsx",
  "app/anmelden/page.tsx",
  "app/datenschutz/page.tsx",
  "app/global-error.tsx",
  "app/impressum/page.tsx",
  "app/layout.tsx",
  "app/page.tsx",
  "app/registrieren/page.tsx",
  "app/warten/page.tsx",
  "components/admin/admin-data.tsx",
  "components/admin/admin-skeleton.tsx",
  "components/admin/user-actions.tsx",
  "components/app-nav.tsx",
  "components/auth/auth-error.ts",
  "components/auth/login-form.tsx",
  "components/auth/register-form.tsx",
  "components/auth/sign-out-button.tsx",
  "components/dart-slots.tsx",
  "components/form/password-input.tsx",
  "components/form/password-strength.tsx",
  "components/rest-grid.tsx",
  "components/rest-sheet.tsx",
  "components/settings/change-password-form.tsx",
  "components/settings/delete-account.tsx",
  "components/settings/new-per-day-form.tsx",
  "components/settings/settings-data.tsx",
  "components/settings/settings-skeleton.tsx",
  "components/stats/stats-data.tsx",
  "components/streak-chip.tsx",
  "components/study/card-view.ts",
  "components/study/route-pad.tsx",
  "components/study/study-card.tsx",
  "components/study/study-parts.tsx",
  "components/study/study-question.tsx",
  "components/study/study-session-host.tsx",
  "components/study/study-session.tsx",
  "components/study/study-skeleton.tsx",
  "components/study/verdict.tsx",
  "components/theme/theme-switch.tsx",
  "components/today/more-cards-button.tsx",
  "components/today/today-data.tsx",
  "components/today/today-skeleton.tsx",
  "lib/auth/constants.ts",
  "lib/darts/cards.ts",
  "lib/validation/password-strength.ts",
  "lib/validation/schemas.ts",
];

const ALLOWED = [/^Checkout-Trainer$/, /^(S|D|T)\d{1,2}$|^25$|^Bull$/];

function allowed(text: string): boolean {
  return ALLOWED.some((pattern) => pattern.test(text));
}

function sourceFiles(path: string): string[] {
  if (SKIPPED.includes(relative(SRC, path))) return [];
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((name) => sourceFiles(join(path, name)));
  }
  return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
}

export function stripComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(?<!:)\/\/.*$/gm, "");
}

function letters(text: string): number {
  return text.match(/\p{L}/gu)?.length ?? 0;
}

function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Inhalt eines String-Literals ohne Anführungszeichen und ohne `${…}`. */
function literalText(literal: string): string {
  return squash(literal.slice(1, -1).replace(/\$\{[^}]*\}/g, " "));
}

// `>` von `=>`, `->`, `>>` und `>=` beginnt keinen JSX-Text.
// Kinder eines Elements: Text und Ausdrücke `{…}` (bis zu zwei Klammerebenen) bis
// zum nächsten `<`; der Text vor, zwischen und nach den Ausdrücken zählt
// (`<p>{n} Karten</p>`, `<p>{a} und {b}</p>`).
const EXPRESSION = String.raw`\{(?:[^{}]|\{[^{}]*\})*\}`;
// Nur das `>` wird verbraucht, die Kinder stehen im Lookahead: So wird auch JSX
// innerhalb eines Ausdrucks (`{ok ? <b>Gut</b> : null}`) von seinem eigenen `>` aus geprüft.
const JSX_CHILDREN = new RegExp(String.raw`(?<![=>-])>(?!=)(?=((?:[^<>{}]|${EXPRESSION})*)[<{])`, "g");
const JSX_EXPRESSION = new RegExp(EXPRESSION, "g");
// Code nach einem Vergleich, einer schließenden Typ-Klammer oder einem
// Funktionsrumpf (`useState<string | null>(null); const …`, `if (n > 0) return`,
// `Set<number>, used: …`, `Promise<void> { … } export function …`).
const CODE_NOT_TEXT = [
  /[;=]|&&|\|\|/, // Anweisung, Zuweisung, Logik
  /^[,|&:]/, // weiter in Parameter- oder Typliste, Typangabe nach `{ a, b }`
  /^[^(]*\)|\([^)]*$/, // Klammer ohne Gegenstück
  /^(?:as|async|await|case|catch|class|const|default|else|export|finally|for|function|if|import|in|instanceof|interface|let|new|of|return|satisfies|switch|throw|try|type|typeof|var|while)\b/,
];
const LITERAL = String.raw`"[^"\n]*"|'[^'\n]*'|` + "`[^`]*`";
// Wert: ein String-Literal oder ein Ausdruck in `{…}` (etwa `cond ? "A" : "B"`),
// dessen String-Literale zählen. `description` steht für die Seitenbeschreibung in `metadata`.
const TEXT_ATTRIBUTES = new RegExp(
  String.raw`(?<![\w-])(aria-label|title|placeholder|alt|label|description)(?:=|:\s*)(\{(?:[^{}]|\$\{[^}]*\})*\}|${LITERAL})`,
  "g",
);
const STRING_LITERAL = new RegExp(String.raw`(new Error\(\s*)?(${LITERAL})`, "g");
const UMLAUT = /[äöüÄÖÜß]/;

export function hardcodedTexts(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  for (const [, children] of code.matchAll(JSX_CHILDREN)) {
    for (const piece of children.split(JSX_EXPRESSION)) {
      // HTML-Entitäten (`&nbsp;`) sind keine Buchstaben.
      const text = squash(piece.replace(/&#?\w+;/g, " "));
      if (letters(text) < 3 || allowed(text)) continue;
      if (CODE_NOT_TEXT.some((pattern) => pattern.test(text))) continue;
      found.push(`A: ${text}`);
    }
  }
  for (const [, name, value] of code.matchAll(TEXT_ATTRIBUTES)) {
    const literals = value.startsWith("{") ? (value.match(new RegExp(LITERAL, "g")) ?? []) : [value];
    for (const literal of literals) {
      const text = literalText(literal);
      if (letters(text) > 0 && !allowed(text)) found.push(`B: ${name} ${text}`);
    }
  }
  for (const [, afterError, literal] of code.matchAll(STRING_LITERAL)) {
    const text = literalText(literal);
    if (!afterError && UMLAUT.test(text) && !allowed(text)) found.push(`C: ${text}`);
  }
  return found;
}

describe("stripComments", () => {
  it("entfernt Block-, JSX- und Zeilenkommentare", () => {
    expect(
      stripComments('<p>{/* Größe */}</p>\nconst a = 1; // Prüfung\n/* Hinweis:\n Länge */ const b = 2;'),
    ).toBe("<p></p>\nconst a = 1; \n  const b = 2;");
  });

  it("lässt Adressen mit // stehen", () => {
    expect(stripComments('const url = "https://example.org/ä";')).toBe('const url = "https://example.org/ä";');
  });
});

describe("hardcodedTexts", () => {
  it("A: findet JSX-Text, auch über mehrere Zeilen", () => {
    expect(hardcodedTexts("<p>Hallo Welt</p>")).toEqual(["A: Hallo Welt"]);
    expect(hardcodedTexts("<p>\n  Noch offen:\n  {count}\n</p>")).toEqual(["A: Noch offen:"]);
    expect(hardcodedTexts("<Button variant=\"ghost\">Save</Button>")).toEqual(["A: Save"]);
  });

  it("A: übergeht Ausdrücke, Leerraum, kurze Zeichen, Feldnamen und Code", () => {
    expect(hardcodedTexts("<p>{t.common.appName}</p>\n<div>\n  <span />\n</div>")).toEqual([]);
    expect(hardcodedTexts("<span>OK</span><b>T20</b><b>Bull</b><b>Checkout-Trainer</b>")).toEqual([]);
    expect(hardcodedTexts("if (a > b && c < d) return;")).toEqual([]);
    expect(hardcodedTexts("const f = (rest) => rest < 41;\nif (n >= limit) {")).toEqual([]);
    expect(hardcodedTexts("<span>00&nbsp;%</span>")).toEqual([]);
  });

  it("A: übergeht Code nach schließenden Typ-Klammern und Vergleichen", () => {
    expect(
      hardcodedTexts(
        [
          "const [error, setError] = useState<string | null>(null); const [open, setOpen] = useState<boolean>(false);",
          "if (count > limit) return { ok: false };",
          "function f(a: Set<number>, used: ReadonlySet<string>): Map<string, number> {}",
          "type T = Array<string> | Pick<Card, \"rest\">;",
          "function g(): Promise<string> { return x; }",
        ].join("\n"),
      ),
    ).toEqual([]);
    // Klammern im Text bleiben Text, wenn sie paarweise stehen.
    expect(hardcodedTexts("<span>(Fehlwurf)</span>")).toEqual(["A: (Fehlwurf)"]);
  });

  it("A: findet Text vor, zwischen und nach Ausdrücken", () => {
    expect(hardcodedTexts("<p>{n} Karten</p>")).toEqual(["A: Karten"]);
    expect(hardcodedTexts("<p>{a} und {b}</p>")).toEqual(["A: und"]);
    expect(hardcodedTexts("<p>Passwort für {email} setzen</p>")).toEqual(["A: Passwort für", "A: setzen"]);
    expect(hardcodedTexts("<p>{fmt({ n })} Tage Serie</p>")).toEqual(["A: Tage Serie"]);
    // JSX in einem Ausdruck wird von seinem eigenen `>` aus geprüft.
    expect(hardcodedTexts("<p>{ok ? <b>Richtig</b> : null} gelernt</p>")).toEqual(["A: gelernt", "A: Richtig"]);
  });

  it("A: übergeht Code nach einer schließenden geschweiften Klammer", () => {
    expect(
      hardcodedTexts(
        [
          "if (a > b) { x(); } else { y(); }",
          "try { f(); } catch (error) { g(error); }",
          "const run = async (): Promise<void> => {};",
          "function h(): Map<string, number> { return m; }\nexport function Page({ a, b }: Props<Item>) {}",
          "const list = items.filter((i) => i > 0).map(({ id }) => id);",
          "type Props = Readonly<{ a: number }> & Pick<Card, \"id\">;",
          "<ul>{items.map((item) => <li key={item.id}>{item.name}</li>)}</ul>",
          "<p>{n}</p>",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("B: findet Text-Attribute und Eigenschaften mit String-Literal", () => {
    expect(
      hardcodedTexts(
        `<button aria-label="Close" title={"Hint"} />\n<input placeholder='Name' />\n<img alt={\`Logo\`} />\n<Field label="Rest" />`,
      ),
    ).toEqual(["B: aria-label Close", "B: title Hint", "B: placeholder Name", "B: alt Logo", "B: label Rest"]);
    expect(
      hardcodedTexts('export const metadata = { title: "Today", description: "Learn routes." };'),
    ).toEqual(["B: title Today", "B: description Learn routes."]);
    expect(hardcodedTexts('<button aria-label={visible ? "Hide" : `Show ${name}`} />')).toEqual([
      "B: aria-label Hide",
      "B: aria-label Show",
    ]);
  });

  it("B: übergeht Ausdrücke, Platzhalter und erlaubte Werte", () => {
    expect(
      hardcodedTexts(
        '<button aria-label={t.close} data-label="x" />\n<img alt="" />\n<Field label="D16" />\nconst metadata = { title: "Checkout-Trainer" };\nconst x = { title: `${t.page.title}${t.common.titleSuffix}` };\ntype P = { label: string };',
      ),
    ).toEqual([]);
  });

  it("C: findet String-Literale mit Umlaut oder ß", () => {
    expect(hardcodedTexts('const a = "Prüfung";\nconst b = `Größe ${n}`;')).toEqual(["C: Prüfung", "C: Größe"]);
  });

  it("C: übergeht Fehlertexte für Logs und Kommentare", () => {
    expect(hardcodedTexts('throw new Error("Ungültiger Rest");\n// Prüfung\nconst ok = "fine";')).toEqual([]);
  });
});

const files = SCANNED.flatMap((path) => sourceFiles(join(SRC, path))).map((file) => relative(SRC, file));

function findingsOf(file: string): string[] {
  return hardcodedTexts(readFileSync(join(SRC, file), "utf8"));
}

describe("Quelldateien", () => {
  it("außerhalb von PENDING haben keine harten Texte", () => {
    const offenders = files
      .filter((file) => !PENDING.includes(file))
      .flatMap((file) => findingsOf(file).map((finding) => `${file}: ${finding}`));
    expect(offenders).toEqual([]);
  });

  it("in PENDING haben noch harte Texte (sonst aus der Liste streichen)", () => {
    const stale = PENDING.filter((file) => !existsSync(join(SRC, file)) || findingsOf(file).length === 0);
    expect(stale).toEqual([]);
  });
});
