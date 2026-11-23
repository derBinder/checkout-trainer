import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { de } from "@/i18n/dictionaries/de";
import { en } from "@/i18n/dictionaries/en";
import type { VerdictCode } from "@/lib/darts/judge";
import { VerdictLine, verdictCopy } from "./verdict";

describe("verdictCopy", () => {
  it.each([
    ["best", "strong", "Bester Weg", "genau richtig"],
    ["alternative", "soft", "Alternative", "auch richtig"],
    ["notRecommended", "soft", "Geht, aber nicht empfohlen", "Checkout stimmt, der Weg ist schlechter"],
    ["checkable", "bad", "Ist checkbar", "Es gibt einen Weg"],
    ["bogeyRight", "strong", "Richtig", "Rest ist nicht checkbar"],
    ["setupRight", "strong", "Richtiger Stellwurf", "genau richtig"],
    ["setupOther", "soft", "Anderer Stellwurf", "Empfohlener Stellwurf unten"],
  ] as const)("%s", (code, tone, title, note) => {
    expect(verdictCopy({ code }, de.study)).toEqual({ tone, title, note });
  });

  it("uses the detail of a route that does not check out", () => {
    expect(verdictCopy({ code: "noCheckout", detail: { kind: "total", total: 148, rest: 121 } }, de.study)).toEqual({
      tone: "bad",
      title: "Geht nicht auf",
      note: "Ergibt 148 statt 121",
    });
  });
});

const CODES: VerdictCode[] = [
  "best",
  "alternative",
  "notRecommended",
  "noCheckout",
  "checkable",
  "bogeyRight",
  "setupRight",
  "setupOther",
  "setupBogey",
  "setupBust",
];

describe("verdictCopy in beiden Sprachen", () => {
  it.each([de, en])("hat für jede Stufe einen Titel", (dictionary) => {
    for (const code of CODES) expect(verdictCopy({ code }, dictionary.study).title.length).toBeGreaterThan(0);
  });

  it("hat für jede Stufe einen Hinweis", () => {
    for (const code of CODES) {
      expect(verdictCopy({ code }, de.study).note).not.toBe("");
      expect(verdictCopy({ code }, en.study).note).not.toBe("");
    }
  });

  it("bleibt in der Farbstufe gleich", () => {
    for (const code of CODES) {
      expect(verdictCopy({ code }, en.study).tone).toBe(verdictCopy({ code }, de.study).tone);
    }
  });

  it("schreibt die Gründe auf Englisch", () => {
    expect(verdictCopy({ code: "best" }, en.study)).toEqual({ tone: "strong", title: "Best route", note: "spot on" });
    expect(verdictCopy({ code: "noCheckout", detail: { kind: "total", total: 148, rest: 121 } }, en.study).note).toBe(
      "Adds up to 148, not 121",
    );
    expect(verdictCopy({ code: "noCheckout", detail: { kind: "notDouble" } }, en.study).note).toBe(
      "The last dart is not a double",
    );
    expect(verdictCopy({ code: "noCheckout", detail: { kind: "notCheckable" } }, de.study).note).toBe(
      "Rest ist nicht checkbar",
    );
  });
});

describe("setup that leaves a bogey number", () => {
  it("is light red and names the number", () => {
    const verdict = { code: "setupBogey", detail: { kind: "leavesBogey", leaves: 159 } } as const;
    expect(verdictCopy(verdict, de.study)).toEqual({
      tone: "bad",
      title: "Lässt Bogey-Zahl",
      note: "Lässt 159, nicht checkbar",
    });
    expect(verdictCopy(verdict, en.study)).toEqual({
      tone: "bad",
      title: "Leaves a bogey number",
      note: "Leaves 159, no checkout",
    });
  });
});

describe("setup that busts", () => {
  // Der Rest zu Beginn der Aufnahme ist auf Fehlwurf- und Zwei-Dart-Karten nicht der Rest der Karte: keine Behauptung darüber.
  it("is light red and names the score and the rest", () => {
    const verdict = { code: "setupBust", detail: { kind: "bust", total: 180, rest: 171 } } as const;
    expect(verdictCopy(verdict, de.study)).toEqual({
      tone: "bad",
      title: "Überworfen",
      note: "Ergibt 180 bei Rest 171",
    });
    expect(verdictCopy(verdict, en.study)).toEqual({
      tone: "bad",
      title: "Bust",
      note: "Scores 180 with 171 left",
    });
  });
});

describe("VerdictLine", () => {
  it("is announced as a status", () => {
    const html = renderToStaticMarkup(
      <I18nProvider locale="de">
        <VerdictLine verdict={{ code: "best" }} />
      </I18nProvider>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("Bester Weg");
    expect(html).toContain("genau richtig");
  });
});

describe("result rows", () => {
  it("names both dart rows for screen readers", async () => {
    const { StudyCard } = await import("./study-card");
    const { cardView } = await import("./card-view");
    const { cardById } = await import("@/lib/cards");
    const html = renderToStaticMarkup(
      <I18nProvider locale="de">
        <StudyCard
          view={cardView(cardById("r-121")!, de.study)}
          result={{ verdict: { code: "best" }, answer: { kind: "darts", darts: ["T20", "T11", "D14"] }, fixed: [] }}
        />
      </I18nProvider>,
    );
    expect(html).toContain('aria-label="Dein Weg"');
    expect(html).toContain('aria-label="Bester Weg"');
  });
});
