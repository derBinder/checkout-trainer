import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VerdictLine, verdictCopy } from "./verdict";

describe("verdictCopy", () => {
  it.each([
    ["best", "strong", "Bester Weg", "genau richtig"],
    ["alternative", "soft", "Alternative", "auch richtig"],
    ["notRecommended", "soft", "Geht, aber nicht empfohlen", "Finish stimmt, Weg ist schlechter"],
    ["checkable", "bad", "Ist checkbar", "Es gibt einen Weg"],
    ["bogeyRight", "strong", "Richtig", "Rest ist nicht checkbar"],
    ["setupRight", "strong", "Richtiger Stellwurf", "genau richtig"],
    ["setupOther", "soft", "Anderer Stellwurf", "empfohlen siehe unten"],
  ] as const)("%s", (code, tone, title, note) => {
    expect(verdictCopy({ code })).toEqual({ tone, title, note });
  });

  it("uses the detail of a route that does not check out", () => {
    expect(verdictCopy({ code: "noCheckout", detail: "Ergibt 148 statt 121" })).toEqual({
      tone: "bad",
      title: "Geht nicht auf",
      note: "Ergibt 148 statt 121",
    });
  });
});

describe("VerdictLine", () => {
  it("is announced as a status", () => {
    const html = renderToStaticMarkup(createElement(VerdictLine, { verdict: { code: "best" } }));
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
      createElement(StudyCard, {
        view: cardView(cardById("r-121")!),
        result: { verdict: { code: "best" }, answer: { kind: "darts", darts: ["T20", "T11", "D14"] }, fixed: [] },
      }),
    );
    expect(html).toContain('aria-label="Dein Weg"');
    expect(html).toContain('aria-label="Bester Weg"');
  });
});
