import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { State } from "ts-fsrs";
import { cardState, user } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { applyReview, loadStatsData } from "@/lib/review/queries";
import { rate, type Rating, type SrsState } from "@/lib/srs/fsrs";
import { levelOf, type Level } from "@/lib/stats";
import { dayKey } from "@/lib/time";
import { restDates } from "./rest-dates";

const DAY_MS = 24 * 3600_000;
const start = new Date("2026-03-02T10:00:00Z");
// Kurz vor Mitternacht UTC: in Berlin schon der nächste Tag, auch über den Jahreswechsel.
const lateStart = new Date("2025-12-31T23:30:00Z");

type Log = { cardId: string; rating: number; reviewedAt: Date };
const GOOD_RUN: Rating[] = [3, 3, 3, 3, 3, 3];

/**
 * Spielt die Bewertungen durch rate() ab, jede folgende am Fälligkeitstag des vorigen Ergebnisses
 * (mindestens einen Tag später). Gespeicherter Stand und Log passen so per Konstruktion zusammen.
 */
function simulate(cardId: string, ratings: Rating[], first = start) {
  const logs: Log[] = [];
  const trace: { reviewedAt: Date; level: Level }[] = [];
  let state: SrsState | null = null;
  let at = first;
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
  due: final.due,
});

/** Tag der ersten Bewertung des abschließenden Abschnitts, in dem die Karte sicher war. */
function trailingKnownDay(trace: { reviewedAt: Date; level: Level }[]): string {
  let i = trace.length;
  while (i > 0 && trace[i - 1].level === "known") i--;
  return dayKey(trace[i].reviewedAt);
}

describe("restDates", () => {
  it("gives only learned for a card in learning", () => {
    const row = { cardId: "r-40", state: State.Learning, scheduledDays: 0, introducedAt: start, due: start };
    expect(restDates({ states: [row], logs: [] })).toEqual({ 40: { learned: dayKey(start), due: dayKey(start) } });
  });

  it("gives learned and known for a known card", () => {
    const { logs, final, trace } = simulate("r-100", GOOD_RUN);
    expect(trace.at(-1)?.level).toBe("known");
    const dates = restDates({ states: [rowOf("r-100", final)], logs });
    expect(dates).toEqual({ 100: { learned: dayKey(start), known: trailingKnownDay(trace), due: dayKey(final.due) } });
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
    expect(restDates({ states: [rowOf("r-100", final)], logs })).toEqual({ 100: { learned: dayKey(start), due: dayKey(final.due) } });
  });

  it("drops known when the stored state and the replay disagree", () => {
    const row = { cardId: "r-40", state: State.Review, scheduledDays: 30, introducedAt: start, due: start };
    const logs = [{ cardId: "r-40", rating: 1, reviewedAt: start }];
    expect(restDates({ states: [row], logs })).toEqual({ 40: { learned: dayKey(start), due: dayKey(start) } });
  });

  it("drops known when the replay is known but the stored state is not", () => {
    const { logs } = simulate("r-100", GOOD_RUN);
    const row = { cardId: "r-100", state: State.Learning, scheduledDays: 0, introducedAt: start, due: start };
    expect(restDates({ states: [row], logs })).toEqual({ 100: { learned: dayKey(start), due: dayKey(start) } });
  });

  it("keeps the replays of different rests apart", () => {
    const known = simulate("r-100", GOOD_RUN);
    const lapsed = simulate("r-101", [...GOOD_RUN, 1]);
    // Nach Zeit gemischt: Bewertungen beider Reste wechseln sich ab.
    const logs = [...known.logs, ...lapsed.logs].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());
    expect(logs.map((l) => l.cardId)).toContain("r-101");
    expect(new Set(logs.slice(0, 4).map((l) => l.cardId)).size).toBe(2);
    const states = [rowOf("r-100", known.final), rowOf("r-101", lapsed.final)];
    expect(restDates({ states, logs })).toEqual({
      100: { learned: dayKey(start), known: trailingKnownDay(known.trace), due: dayKey(known.final.due) },
      101: { learned: dayKey(start), due: dayKey(lapsed.final.due) },
    });
  });

  it("gives learned only when there are no logs", () => {
    const row = { cardId: "r-40", state: State.Review, scheduledDays: 30, introducedAt: start, due: start };
    expect(restDates({ states: [row], logs: [] })).toEqual({ 40: { learned: dayKey(start), due: dayKey(start) } });
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

  it("puts a review shortly before midnight UTC on the next Berlin day", () => {
    const { logs, final, trace } = simulate("r-100", GOOD_RUN, lateStart);
    const known = restDates({ states: [rowOf("r-100", final, lateStart)], logs })[100].known!;
    const first = trace.find((t) => t.level === "known")!.reviewedAt;
    // Die Bewertung liegt um 23:30 UTC: der UTC-Tag wäre ein anderer als der Berliner Tag.
    expect(first.toISOString().slice(11, 16)).toBe("23:30");
    expect(known).not.toBe(first.toISOString().slice(0, 10));
    expect(known).toBe(trailingKnownDay(trace));
  });

  it("matches the dates a real run through applyReview produces", async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: "u1", name: "u1", email: "u1@x.test", status: "active" });
    const u = { id: "u1", newPerDay: 10 };
    const ratings: Rating[] = [3, 4, 3, 2, 3, 3, 3, 1, 3, 4, 3, 2, 3, 3, 3, 3];
    const levels: { reviewedAt: Date; level: Level }[] = [];
    let at = start;
    let reps = 0;
    for (const rating of ratings) {
      expect(await applyReview(db, u, { cardId: "r-100", rating, reps }, at)).toEqual({ ok: true });
      const [row] = await db.select().from(cardState).where(eq(cardState.cardId, "r-100"));
      levels.push({ reviewedAt: at, level: levelOf(row.state, row.scheduledDays) });
      reps = row.reps;
      at = new Date(Math.max(row.due.getTime(), at.getTime() + DAY_MS));
    }
    expect(levels.at(-1)?.level).toBe("known");

    const { states, logs } = await loadStatsData(db, "u1");
    const [stored] = states;
    expect(restDates({ states, logs })).toEqual({
      100: { learned: dayKey(start), known: trailingKnownDay(levels), due: dayKey(stored.due) },
    });
  });

  it("uses the Berlin day", () => {
    const row = { cardId: "r-40", state: State.Learning, scheduledDays: 0, introducedAt: new Date("2025-12-31T23:30:00Z"), due: start };
    expect(restDates({ states: [row], logs: [] })[40].learned).toBe("2026-01-01");
  });

  it("also covers a bogey card", () => {
    const { logs, final, trace } = simulate("b-169", GOOD_RUN);
    expect(restDates({ states: [rowOf("b-169", final)], logs })).toEqual({
      169: { learned: dayKey(start), known: trailingKnownDay(trace), due: dayKey(final.due) },
    });
  });

  it("gives the Berlin day on which the card is due next", () => {
    const row = (due: string) => ({ cardId: "r-40", state: State.Review, scheduledDays: 3, introducedAt: start, due: new Date(due) });
    expect(restDates({ states: [row("2026-12-24T09:00:00Z")], logs: [] })[40].due).toBe("2026-12-24");
    // 23:30 UTC ist in Berlin schon der nächste Tag.
    expect(restDates({ states: [row("2026-12-23T23:30:00Z")], logs: [] })[40].due).toBe("2026-12-24");
  });

  it("has no entry for a rest without state", () => {
    expect(restDates({ states: [], logs: [] })).toEqual({});
  });
});
