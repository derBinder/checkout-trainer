import { describe, expect, it } from "vitest";
import { RANGES } from "./filter";
import { DEFAULT_SELECTION, parsePracticeSelection, PRACTICE_STORAGE_KEY } from "./selection";

const json = (value: unknown) => JSON.stringify(value);

describe("parsePracticeSelection", () => {
  it("nimmt ohne gespeicherten Wert die Vorauswahl: Wege, alle Bereiche, alle Karten", () => {
    expect(PRACTICE_STORAGE_KEY).toBe("practice");
    expect(DEFAULT_SELECTION).toEqual({ exercise: "routes", ranges: RANGES.map((r) => r.id), kind: "all" });
    expect(parsePracticeSelection(null)).toEqual(DEFAULT_SELECTION);
  });

  it.each(["kein json", "42", "[]", "null", '"routes"'])("verwirft %s", (raw) => {
    expect(parsePracticeSelection(raw)).toEqual(DEFAULT_SELECTION);
  });

  it("übernimmt eine gültige Auswahl", () => {
    const stored = { exercise: "math", ranges: ["41-60", "141-170"], kind: "setups" };
    expect(parsePracticeSelection(json(stored))).toEqual(stored);
  });

  it("verwirft unbekannte und doppelte Bereiche und ordnet sie wie die Chips", () => {
    const raw = json({ exercise: "routes", ranges: ["41-60", "2-40", "2-40", "999", 3, null], kind: "all" });
    expect(parsePracticeSelection(raw).ranges).toEqual(["2-40", "41-60"]);
  });

  it("behält eine leere Bereichsauswahl", () => {
    expect(parsePracticeSelection(json({ exercise: "routes", ranges: [], kind: "all" })).ranges).toEqual([]);
  });

  it("setzt einzelne ungültige Felder auf die Vorauswahl zurück", () => {
    expect(parsePracticeSelection(json({ exercise: "x", ranges: "2-40", kind: "x" }))).toEqual(DEFAULT_SELECTION);
    expect(parsePracticeSelection(json({ kind: "misses" }))).toEqual({ ...DEFAULT_SELECTION, kind: "misses" });
  });
});
