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
const again = (cardId: string, reviewedAt = now) => ({ cardId, rating: 1, reviewedAt });

describe("summarize", () => {
  it("counts every rest as new without data", () => {
    const s = summarize({ states: [], logs: [], now });
    expect(s.counts).toEqual({ new: 169, learning: 0, known: 0 });
    expect(Object.keys(s.levels)).toHaveLength(169);
    expect(s.levels[2]).toBe("new");
    expect(s.levels[170]).toBe("new");
    expect(s.streak).toBe(0);
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

  it("ignores state and log of an unknown card", () => {
    const s = summarize({
      states: [review("r-9999", 30)],
      logs: [again("r-9999")],
      now,
    });
    expect(s).toEqual(summarize({ states: [], logs: [], now }));
  });

  it("counts consecutive Berlin days ending yesterday", () => {
    const logs = [1, 2, 3].map((n) => ({ cardId: "r-2", rating: 3, reviewedAt: daysAgo(n) }));
    expect(summarize({ states: [], logs, now }).streak).toBe(3);
  });

  it("counts today and stops at a gap", () => {
    const logs = [0, 0, 1, 3].map((n) => ({ cardId: "r-2", rating: 3, reviewedAt: daysAgo(n) }));
    expect(summarize({ states: [], logs, now }).streak).toBe(2);
  });

  it("uses the Berlin day, not the UTC day", () => {
    // Both instants fall on 10 Nov in UTC, but on two different Berlin days.
    const lateYesterday = new Date("2026-11-10T22:30:00Z"); // Berlin: 10 Nov 23:30
    const earlyToday = new Date("2026-11-10T23:30:00Z"); // Berlin: 11 Nov 00:30
    const logs = [lateYesterday, earlyToday].map((reviewedAt) => ({ cardId: "r-2", rating: 3, reviewedAt }));
    expect(summarize({ states: [], logs, now }).streak).toBe(2);
  });

  it("has no streak when the last rating was the day before yesterday", () => {
    const logs = [2, 3].map((n) => ({ cardId: "r-2", rating: 3, reviewedAt: daysAgo(n) }));
    expect(summarize({ states: [], logs, now }).streak).toBe(0);
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
    expect(data.states).toEqual([{ cardId: "r-40", state: State.Review, scheduledDays: 30 }]);
    expect(data.logs).toEqual([{ cardId: "r-40", rating: 1, reviewedAt: now }]);
  });
});
