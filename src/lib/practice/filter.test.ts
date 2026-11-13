import { describe, expect, it } from "vitest";
import { CARDS, cardById } from "@/lib/cards";
import type { Card } from "@/lib/darts/cards";
import {
  drawRound,
  matchesFilter,
  practiceGroups,
  RANGES,
  ROUND_SIZE,
  type PracticeKind,
  type RangeId,
} from "./filter";

/** Fester Zufall für reproduzierbare Ziehungen. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function card(id: string): Card {
  const c = cardById(id);
  if (!c) throw new Error(`Karte ${id} fehlt`);
  return c;
}

const META = CARDS.map((c) => ({ id: c.id, rest: c.rest, groups: practiceGroups(c) }));
const ALL_RANGES = RANGES.map((r) => r.id);

function count(ranges: RangeId[], kind: PracticeKind): number {
  return META.filter((m) => matchesFilter(m, { ranges, kind })).length;
}

describe("RANGES", () => {
  it("sind die sieben festen Bereiche ohne Lücke von 2 bis 170", () => {
    expect(RANGES.map((r) => [r.id, r.from, r.to])).toEqual([
      ["2-40", 2, 40],
      ["41-60", 41, 60],
      ["61-80", 61, 80],
      ["81-100", 81, 100],
      ["101-120", 101, 120],
      ["121-140", 121, 140],
      ["141-170", 141, 170],
    ]);
  });
});

describe("practiceGroups", () => {
  it("ordnet Rest- und Zwei-Dart-Karten mit Weg den Wegen zu", () => {
    expect(practiceGroups(card("r-170"))).toEqual(["ways"]);
    expect(practiceGroups(card("t-61"))).toEqual(["ways"]);
  });

  it("ordnet Bogey-Karten und Zwei-Dart-Karten mit Stellwurf den Stellwürfen zu", () => {
    expect(practiceGroups(card("t-125"))).toEqual(["setups"]);
    expect(practiceGroups(card("b-159"))).toEqual(["setups"]);
  });

  it("ordnet Fehlwurf-Karten mit Stellwurf beiden Gruppen zu", () => {
    const withSetup = CARDS.find((c) => c.kind === "miss" && c.follow.kind === "setup")!;
    const withFinish = CARDS.find((c) => c.kind === "miss" && c.follow.kind === "finish")!;
    expect(practiceGroups(withSetup)).toEqual(["misses", "setups"]);
    expect(practiceGroups(withFinish)).toEqual(["misses"]);
  });
});

describe("matchesFilter", () => {
  it.each([
    ["2-40", 39, 39, 0, 0],
    ["41-60", 21, 20, 1, 0],
    ["61-80", 50, 30, 20, 0],
    ["81-100", 41, 21, 19, 1],
    ["101-120", 65, 24, 25, 16],
    ["121-140", 80, 20, 40, 43],
    ["141-170", 106, 23, 46, 83],
  ] as const)("Bereich %s: alle %i, Wege %i, Fehlwürfe %i, Stellwürfe %i", (range, all, ways, misses, setups) => {
    expect(count([range], "all")).toBe(all);
    expect(count([range], "ways")).toBe(ways);
    expect(count([range], "misses")).toBe(misses);
    expect(count([range], "setups")).toBe(setups);
  });

  it("liefert mit allen Bereichen alle Karten", () => {
    expect(count(ALL_RANGES, "all")).toBe(CARDS.length);
  });

  it("richtet den Bereich nach dem Rest, mit dem die Karte beginnt", () => {
    const miss = CARDS.find((c) => c.kind === "miss" && c.rest >= 121 && c.newRest <= 120)!;
    const meta = { rest: miss.rest, groups: practiceGroups(miss) };
    expect(matchesFilter(meta, { ranges: ["121-140"], kind: "misses" })).toBe(true);
    expect(matchesFilter(meta, { ranges: ["101-120", "81-100"], kind: "misses" })).toBe(false);
  });

  it("lässt ohne Bereich keine Karte durch", () => {
    expect(count([], "all")).toBe(0);
  });
});

describe("drawRound", () => {
  const ids = CARDS.map((c) => c.id);

  it("zieht höchstens 20 verschiedene Karten aus der Auswahl", () => {
    const round = drawRound(ids, mulberry32(1));
    expect(ROUND_SIZE).toBe(20);
    expect(round).toHaveLength(20);
    expect(new Set(round).size).toBe(20);
    for (const id of round) expect(ids).toContain(id);
  });

  it("nimmt bei weniger Karten alle, in zufälliger Reihenfolge", () => {
    const few = ids.slice(0, 7);
    const round = drawRound(few, mulberry32(2));
    expect([...round].sort()).toEqual([...few].sort());
  });

  it("zieht mit demselben Zufall dieselbe Runde und lässt die Eingabe unverändert", () => {
    const copy = [...ids];
    expect(drawRound(ids, mulberry32(3))).toEqual(drawRound(ids, mulberry32(3)));
    expect(ids).toEqual(copy);
  });

  it("zieht aus nichts nichts", () => {
    expect(drawRound([], mulberry32(4))).toEqual([]);
  });
});
