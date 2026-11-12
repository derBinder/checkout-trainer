import { describe, expect, it } from "vitest";
import { CARDS } from "@/lib/cards";
import { MAX_REST, MIN_REST } from "@/lib/stats";
import { restDetails } from "./rest-details";

describe("restDetails", () => {
  const details = restDetails(CARDS);

  it("liefert zu jedem Rest von 2 bis 170 eine Detailansicht", () => {
    for (let rest = MIN_REST; rest <= MAX_REST; rest++) {
      expect(details[rest]?.rest).toBe(rest);
    }
    expect(Object.keys(details)).toHaveLength(MAX_REST - MIN_REST + 1);
  });

  it("gibt bei Rest-Karten nur Weg, Begründung, Alternativen und zwei Darts weiter", () => {
    const rest = CARDS.find((c) => c.kind === "rest")!;
    expect(Object.keys(details[rest.rest]).sort()).toEqual(
      ["alternatives", "best", "kind", "reason", "rest", "twoDarts"],
    );
  });

  it("gibt bei Bogey-Zahlen nur den Stellwurf weiter", () => {
    const bogey = CARDS.find((c) => c.kind === "bogey")!;
    expect(Object.keys(details[bogey.rest]).sort()).toEqual(["kind", "rest", "setup"]);
  });
});
