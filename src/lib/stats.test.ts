import { describe, expect, it } from "vitest";
import { State } from "ts-fsrs";
import { createTestDb } from "@/lib/db/test-db";
import { cardState, reviewLog, user } from "@/lib/db/schema";
import { loadStatsData } from "@/lib/review/queries";
import { summarize } from "./stats";

const now = new Date("2026-11-11T10:00:00Z");
const DAY_MS = 24 * 3600_000;
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);

const review = (cardId: string, scheduledDays: number) => ({
  cardId,
  state: State.Review,
  scheduledDays,
});
const logsOn = (...ns: number[]) => ns.map((n) => ({ cardId: "r-2", rating: 3, reviewedAt: daysAgo(n) }));
const again = (cardId: string, reviewedAt = now) => ({ cardId, rating: 1, reviewedAt });

describe("summarize", () => {
  it("counts every rest as new without data", () => {
    const s = summarize({ states: [], logs: [], now });
    expect(s.counts).toEqual({ new: 169, learning: 0, known: 0 });
    expect(Object.keys(s.levels)).toHaveLength(169);
    expect(s.levels[2]).toBe("new");
    expect(s.levels[170]).toBe("new");
    expect(s.streak).toEqual({ days: 0, paused: false });
    expect(s.hardest).toEqual([]);
  });

  it("derives the level from the rest or bogey card only", () => {
    const s = summarize({
      states: [
        review("r-40", 30),
        review("r-41", 3),
        { cardId: "r-42", state: State.Learning, scheduledDays: 0 },
        review("m-121-0", 40),
        review("b-169", 21),
      ],
      logs: [],
      now,
    });
    expect(s.levels[40]).toBe("known");
    expect(s.levels[41]).toBe("learning");
    expect(s.levels[42]).toBe("learning");
    expect(s.levels[121]).toBe("new");
    expect(s.levels[169]).toBe("known");
    expect(s.counts).toEqual({ new: 165, learning: 2, known: 2 });
  });

  it("ignores two-dart cards for the level", () => {
    const s = summarize({
      states: [
        { cardId: "r-125", state: State.Learning, scheduledDays: 0 },
        review("t-125", 30),
        review("t-130", 30),
      ],
      logs: [],
      now,
    });
    expect(s.levels[125]).toBe("learning");
    expect(s.levels[130]).toBe("new");
  });

  it("counts Again on a two-dart card towards its rest", () => {
    expect(summarize({ states: [], logs: [again("t-125")], now }).hardest).toEqual([{ rest: 125, again: 1 }]);
  });

  it("counts Again on extra cards towards the rest the card starts from", () => {
    const logs = [again("n-170-0-S1"), again("d-16")];
    expect(summarize({ states: [], logs, now }).hardest).toEqual([
      { rest: 32, again: 1 },
      { rest: 170, again: 1 },
    ]);
  });

  it("leaves rests above 170 out of the hardest rests and the grid", () => {
    const s = summarize({ states: [review("o-199", 40)], logs: [again("o-199")], now });
    expect(s.hardest).toEqual([]);
    expect(Object.keys(s.levels)).toHaveLength(169);
    expect(s.streak.days).toBe(1);
  });

  it("ignores state and log of an unknown card", () => {
    const s = summarize({
      states: [review("r-9999", 30)],
      logs: [again("r-9999")],
      now,
    });
    expect(s).toEqual(summarize({ states: [], logs: [], now }));
  });

  it("counts consecutive Berlin days ending yesterday", () => {
    expect(summarize({ states: [], logs: logsOn(1, 2, 3), now }).streak.days).toBe(3);
  });

  it("counts today and stops at a gap", () => {
    expect(summarize({ states: [], logs: logsOn(0, 0, 1, 4), now }).streak.days).toBe(2);
  });

  it("uses the Berlin day, not the UTC day", () => {
    // Both instants fall on 10 Nov in UTC, but on two different Berlin days.
    const lateYesterday = new Date("2026-11-10T22:30:00Z"); // Berlin: 10 Nov 23:30
    const earlyToday = new Date("2026-11-10T23:30:00Z"); // Berlin: 11 Nov 00:30
    const logs = [lateYesterday, earlyToday].map((reviewedAt) => ({ cardId: "r-2", rating: 3, reviewedAt }));
    expect(summarize({ states: [], logs, now }).streak.days).toBe(2);
  });

  it("pauses the streak the day after a missed day", () => {
    expect(summarize({ states: [], logs: logsOn(2, 3, 4), now }).streak).toEqual({ days: 3, paused: true });
  });

  it("resumes the streak with a rating today, without counting the missed day", () => {
    expect(summarize({ states: [], logs: logsOn(0, 2, 3, 4, 5, 6), now }).streak).toEqual({ days: 6, paused: false });
  });

  it("ends the streak after two missed days in a row", () => {
    expect(summarize({ states: [], logs: logsOn(3, 4), now }).streak).toEqual({ days: 0, paused: false });
  });

  it("bridges two gaps exactly seven days apart", () => {
    // Lücken an Tag 2 und Tag 9.
    const logs = logsOn(0, 1, 3, 4, 5, 6, 7, 8, 10, 11);
    expect(summarize({ states: [], logs, now }).streak).toEqual({ days: 10, paused: false });
  });

  it("bridges only the newer of two gaps six days apart", () => {
    // Lücken an Tag 2 und Tag 8: Die Serie endet an Tag 8.
    const logs = logsOn(0, 1, 3, 4, 5, 6, 7, 9, 10);
    expect(summarize({ states: [], logs, now }).streak).toEqual({ days: 7, paused: false });
  });

  it("stays paused when an older gap is bridged as well", () => {
    // Lücken an Tag 1 (gestern) und Tag 8.
    expect(summarize({ states: [], logs: logsOn(2, 3, 4, 5, 6, 7, 9, 10), now }).streak).toEqual({ days: 8, paused: true });
  });

  it("does not keep a streak when studying only every other day", () => {
    expect(summarize({ states: [], logs: logsOn(0, 2, 4, 6), now }).streak).toEqual({ days: 2, paused: false });
  });

  it("bridges a gap across the DST change", () => {
    // Berlin stellt am 25.10.2026 um (der Tag hat 25 Stunden). Gelernt 22., 23. und 25.10., Lücke am 24.10.
    // Jetzt ist es 23:30 Berliner Zeit am 25.10.: Ein Schritt „minus 24 Stunden“ landet am selben Tag.
    const at = (iso: string) => ({ cardId: "r-2", rating: 3, reviewedAt: new Date(iso) });
    const logs = [at("2026-10-22T10:00:00Z"), at("2026-10-23T10:00:00Z"), at("2026-10-25T10:00:00Z")];
    const s = summarize({ states: [], logs, now: new Date("2026-10-25T22:30:00Z") });
    expect(s.streak).toEqual({ days: 3, paused: false });
  });

  it("pauses by Berlin day, not by 24 hours", () => {
    // Jetzt Berlin 00:30; letzte Bewertung Berlin 23:30, zwei Berliner Tage davor (nur 25 Stunden her).
    const logs = [{ cardId: "r-2", rating: 3, reviewedAt: new Date("2026-11-08T22:30:00Z") }]; // Berlin 08.11. 23:30
    logs.push({ cardId: "r-2", rating: 3, reviewedAt: new Date("2026-11-07T10:00:00Z") });
    const s = summarize({ states: [], logs, now: new Date("2026-11-09T23:30:00Z") }); // Berlin 10.11. 00:30
    expect(s.streak).toEqual({ days: 2, paused: true });
  });

  it("lists the rests with the most Again ratings across all card kinds", () => {
    const logs = [
      again("r-121"),
      again("r-121"),
      again("r-121"),
      again("m-121-0"),
      again("r-99"),
      again("r-99"),
      { cardId: "r-50", rating: 3, reviewedAt: now },
    ];
    expect(summarize({ states: [], logs, now }).hardest).toEqual([
      { rest: 121, again: 4 },
      { rest: 99, again: 2 },
    ]);
  });

  it("keeps at most five hardest rests", () => {
    const logs = [10, 11, 12, 13, 14, 15].map((rest) => again(`r-${rest}`));
    logs.push(again("r-15"));
    const { hardest } = summarize({ states: [], logs, now });
    expect(hardest).toHaveLength(5);
    expect(hardest[0]).toEqual({ rest: 15, again: 2 });
  });
});

describe("loadStatsData", () => {
  it("returns only the given user's states and logs", async () => {
    const db = await createTestDb();
    await db.insert(user).values([
      { id: "u1", name: "u1", email: "u1@x.test", status: "active" },
      { id: "u2", name: "u2", email: "u2@x.test", status: "active" },
    ]);
    const row = {
      due: now,
      stability: 1,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 30,
      learningSteps: 0,
      reps: 1,
      lapses: 0,
      state: State.Review,
      lastReview: now,
      introducedAt: now,
    };
    await db.insert(cardState).values([
      { ...row, userId: "u1", cardId: "r-40" },
      { ...row, userId: "u2", cardId: "r-41" },
    ]);
    await db.insert(reviewLog).values([
      { userId: "u1", cardId: "r-40", rating: 1, reviewedAt: now },
      { userId: "u2", cardId: "r-41", rating: 3, reviewedAt: now },
    ]);

    const data = await loadStatsData(db, "u1");
    expect(data.states).toEqual([{ cardId: "r-40", state: State.Review, scheduledDays: 30, introducedAt: now, due: now }]);
    expect(data.logs).toEqual([{ cardId: "r-40", rating: 1, reviewedAt: now }]);
  });

  it("returns the logs ordered by time, then by id", async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: "u1", name: "u1", email: "u1@x.test", status: "active" });
    const late = new Date(now.getTime() + 1000);
    const log = (id: number, cardId: string, reviewedAt: Date) => ({ id, userId: "u1", cardId, rating: 3, reviewedAt });
    // Eingefügt: spät, dann zwei gleichzeitige Zeilen mit der höheren id zuerst. Nur die id kann sie ordnen.
    await db.insert(reviewLog).values([log(1, "r-3", late), log(9, "r-2", now), log(8, "r-1", now)]);

    const data = await loadStatsData(db, "u1");
    expect(data.logs.map((l) => l.cardId)).toEqual(["r-1", "r-2", "r-3"]);
  });
});
