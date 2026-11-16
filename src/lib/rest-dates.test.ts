import { describe, expect, it } from "vitest";
import { State } from "ts-fsrs";
import { rate, type Rating, type SrsState } from "@/lib/srs/fsrs";
import { levelOf, type Level } from "@/lib/stats";
import { dayKey } from "@/lib/time";
import { restDates } from "./rest-dates";

const DAY_MS = 24 * 3600_000;
const start = new Date("2026-03-02T10:00:00Z");

type Log = { cardId: string; rating: number; reviewedAt: Date };
const GOOD_RUN: Rating[] = [3, 3, 3, 3, 3, 3];

/**
 * Spielt die Bewertungen durch rate() ab, jede folgende am Fälligkeitstag des vorigen Ergebnisses
 * (mindestens einen Tag später). Gespeicherter Stand und Log passen so per Konstruktion zusammen.
 */
function simulate(cardId: string, ratings: Rating[]) {
  const logs: Log[] = [];
  const trace: { reviewedAt: Date; level: Level }[] = [];
  let state: SrsState | null = null;
  let at = start;
  for (const rating of ratings) {
    state = rate(state, rating, at);
    logs.push({ cardId, rating, reviewedAt: at });
    trace.push({ reviewedAt: at, level: levelOf(state.state, state.scheduledDays) });
    at = new Date(Math.max(state.due.getTime(), at.getTime() + DAY_MS));
  }
  return { logs, final: state as SrsState, trace };
}

const rowOf = (cardId: string, final: SrsState, introducedAt = start) => ({
  cardId,
  state: final.state,
  scheduledDays: final.scheduledDays,
  introducedAt,
});

/** Tag der ersten Bewertung des abschließenden Abschnitts, in dem die Karte sicher war. */
function trailingKnownDay(trace: { reviewedAt: Date; level: Level }[]): string {
  let i = trace.length;
  while (i > 0 && trace[i - 1].level === "known") i--;
  return dayKey(trace[i].reviewedAt);
}

describe("restDates", () => {
  it("gives only learned for a card in learning", () => {
    const row = { cardId: "r-40", state: State.Learning, scheduledDays: 0, introducedAt: start };
    expect(restDates({ states: [row], logs: [] })).toEqual({ 40: { learned: dayKey(start) } });
  });

  it("gives learned and known for a known card", () => {
    const { logs, final, trace } = simulate("r-100", GOOD_RUN);
    expect(trace.at(-1)?.level).toBe("known");
    const dates = restDates({ states: [rowOf("r-100", final)], logs });
    expect(dates).toEqual({ 100: { learned: dayKey(start), known: trailingKnownDay(trace) } });
  });

  it("resets known after a lapse and sets it again later", () => {
    const { logs, final, trace } = simulate("r-100", [...GOOD_RUN, 1, 3, 3, 3, 3, 3, 3, 3]);
    const firstKnown = dayKey(trace.find((t) => t.level === "known")!.reviewedAt);
    expect(trace.at(-1)?.level).toBe("known");
    expect(trace.some((t, i) => i > 0 && t.level !== "known" && trace[i - 1].level === "known")).toBe(true);
    const known = restDates({ states: [rowOf("r-100", final)], logs })[100].known;
    expect(known).toBe(trailingKnownDay(trace));
    expect(known).not.toBe(firstKnown);
  });

  it("drops known while a lapsed card is not known again", () => {
    const { logs, final, trace } = simulate("r-100", [...GOOD_RUN, 1]);
    expect(trace.at(-1)?.level).not.toBe("known");
    expect(restDates({ states: [rowOf("r-100", final)], logs })).toEqual({ 100: { learned: dayKey(start) } });
  });

  it("drops known when the stored state and the replay disagree", () => {
    const row = { cardId: "r-40", state: State.Review, scheduledDays: 30, introducedAt: start };
    const logs = [{ cardId: "r-40", rating: 1, reviewedAt: start }];
    expect(restDates({ states: [row], logs })).toEqual({ 40: { learned: dayKey(start) } });
  });

  it("gives learned only when there are no logs", () => {
    const row = { cardId: "r-40", state: State.Review, scheduledDays: 30, introducedAt: start };
    expect(restDates({ states: [row], logs: [] })).toEqual({ 40: { learned: dayKey(start) } });
  });

  it("ignores logs of other cards and unknown ids", () => {
    const { logs, final } = simulate("r-100", GOOD_RUN);
    const later = new Date(logs.at(-1)!.reviewedAt.getTime() + DAY_MS);
    const noise = ["m-100-0", "t-125", "o-199", "x-unknown"].map((cardId) => ({ cardId, rating: 1, reviewedAt: later }));
    const states = [
      rowOf("r-100", final),
      ...["t-125", "o-199", "x-unknown"].map((cardId) => rowOf(cardId, final)),
    ];
    const dates = restDates({ states, logs: [...logs, ...noise] });
    expect(Object.keys(dates)).toEqual(["100"]);
    expect(dates[100].known).toBeDefined();
  });

  it("orders the logs by time itself", () => {
    const { logs, final, trace } = simulate("r-100", GOOD_RUN);
    const dates = restDates({ states: [rowOf("r-100", final)], logs: [...logs].reverse() });
    expect(dates[100].known).toBe(trailingKnownDay(trace));
  });

  it("uses the Berlin day", () => {
    const row = { cardId: "r-40", state: State.Learning, scheduledDays: 0, introducedAt: new Date("2025-12-31T23:30:00Z") };
    expect(restDates({ states: [row], logs: [] })[40].learned).toBe("2026-01-01");
  });

  it("also covers a bogey card", () => {
    const { logs, final, trace } = simulate("b-169", GOOD_RUN);
    expect(restDates({ states: [rowOf("b-169", final)], logs })).toEqual({
      169: { learned: dayKey(start), known: trailingKnownDay(trace) },
    });
  });

  it("has no entry for a rest without state", () => {
    expect(restDates({ states: [], logs: [] })).toEqual({});
  });
});
