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

  it("gibt bei Rest-Karten nur Weg, Begründung, Zerlegung, Alternativen und zwei Darts weiter", () => {
    expect(Object.keys(details[170]).sort()).toEqual(["alternatives", "best", "breakdown", "kind", "rest"]);
    expect(details[170]).toMatchObject({ breakdown: { first: "T20", after: 110 } });
    expect(Object.keys(details[42]).sort()).toEqual(["alternatives", "best", "kind", "reason", "rest"]);
    expect(Object.keys(details[110]).sort()).toEqual(["alternatives", "best", "breakdown", "kind", "rest", "twoDarts"]);
  });

  it("gibt bei Bogey-Zahlen nur den Stellwurf weiter", () => {
    const bogey = CARDS.find((c) => c.kind === "bogey")!;
    expect(Object.keys(details[bogey.rest]).sort()).toEqual(["kind", "rest", "setup"]);
  });
});
