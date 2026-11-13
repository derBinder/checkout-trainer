import { describe, expect, it } from "vitest";
import { CARDS, cardById } from "@/lib/cards";
import { BOGEYS, isBogey } from "@/lib/darts/checkouts";
import { dartValue, parseDart } from "@/lib/darts/model";
import { MATH_ROUND_SIZE, mathRound, mathSolutions, mathTask, THROW_POOL } from "./math";

/** Fester Zufall für reproduzierbare Aufgaben. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zufall aus einer festen Folge, danach immer 0,5. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++] ?? 0.5;
}

const MANY = 5000;
// Eine gemeinsame Folge über alle Aufgaben, nicht je Aufgabe neu gesät.
const rng = mulberry32(7);
const drawn = Array.from({ length: MANY }, () => mathTask(rng));

describe("mathTask", () => {
  it("wählt den Vorrat rund um die 20 und die 19", () => {
    expect(THROW_POOL).toEqual(["S20", "T20", "S1", "T1", "S5", "T5", "S19", "T19", "S3", "T3", "S7", "T7"]);
  });

  it("beginnt bei 171 bis 230, wirft drei Darts aus dem Vorrat und lässt richtig gerechnet 2 bis 170", () => {
    for (const task of drawn) {
      expect(task.start).toBeGreaterThanOrEqual(171);
      expect(task.start).toBeLessThanOrEqual(230);
      expect(task.throws).toHaveLength(3);
      for (const dart of task.throws) expect(THROW_POOL).toContain(dart);
      const sum = task.throws.reduce((s, d) => s + dartValue(parseDart(d)), 0);
      expect(task.rest).toBe(task.start - sum);
      expect(task.rest).toBeGreaterThanOrEqual(2);
      expect(task.rest).toBeLessThanOrEqual(170);
    }
  });

  it("lässt in etwa jeder vierten Aufgabe eine Bogey-Zahl", () => {
    const share = drawn.filter((t) => isBogey(t.rest)).length / MANY;
    expect(share).toBeGreaterThan(0.22);
    expect(share).toBeLessThan(0.28);
  });

  it("erreicht jede Bogey-Zahl", () => {
    expect(new Set(drawn.filter((t) => isBogey(t.rest)).map((t) => t.rest))).toEqual(new Set(BOGEYS));
    BOGEYS.forEach((bogey, i) => {
      for (const pick of [0, 0.999]) {
        expect(mathTask(sequence(0, (i + 0.5) / BOGEYS.length, pick)).rest).toBe(bogey);
      }
    });
  });

  it("lässt sonst einen checkbaren Rest", () => {
    for (const start of [0, 0.999]) {
      for (const pick of [0, 0.999]) {
        const task = mathTask(sequence(0.9, start, pick));
        expect(isBogey(task.rest)).toBe(false);
      }
    }
  });
});

describe("mathRound", () => {
  it("stellt zehn Aufgaben", () => {
    expect(MATH_ROUND_SIZE).toBe(10);
    expect(mathRound(mulberry32(1))).toHaveLength(10);
  });
});

describe("mathSolutions", () => {
  const solutions = mathSolutions(CARDS);

  it("kennt jeden Rest von 2 bis 170", () => {
    expect(Object.keys(solutions).map(Number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 169 }, (_, i) => i + 2),
    );
  });

  it("nennt für checkbare Reste den besten Weg der Rest-Karte", () => {
    expect(solutions[170]).toEqual({ kind: "finish", route: ["T20", "T20", "Bull"] });
    const r89 = cardById("r-89");
    expect(r89?.kind === "rest" && solutions[89]).toEqual({ kind: "finish", route: r89?.kind === "rest" ? r89.best : [] });
  });

  it("nennt für Bogey-Zahlen den Stellwurf der Bogey-Karte", () => {
    const b159 = cardById("b-159");
    if (b159?.kind !== "bogey") throw new Error("b-159 fehlt");
    expect(solutions[159]).toEqual({ kind: "bogey", throws: b159.setup.throws, leaves: b159.setup.leaves });
  });
});
