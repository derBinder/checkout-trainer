import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { cardState, reviewLog, user } from "@/lib/db/schema";
import { CARDS, cardOrderFor } from "@/lib/cards";
import { NO_EXTRA_CARDS } from "@/lib/extra-cards";

/** Lernreihenfolge ohne Zusatzkarten, wie sie jedes Konto anfangs hat. */
const CARD_ORDER = cardOrderFor(NO_EXTRA_CARDS);
import type { SessionUser } from "@/lib/auth/guard";

const getSessionUser = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/guard", () => ({ getSessionUser: () => getSessionUser() }));

import { applyReview, loadQueue } from "./queries";
import { submitReview } from "./actions";

const now = new Date("2026-11-11T10:00:00Z");
let db: Db;

async function addUser(id: string, newPerDay = 10) {
  await db.insert(user).values({ id, name: id, email: `${id}@x.test`, status: "active", newPerDay });
  return { id, newPerDay };
}

async function introduce(u: { id: string; newPerDay: number }, ids: string[], at: Date) {
  for (const cardId of ids) {
    expect(await applyReview(db, u, { cardId, rating: 3, reps: 0 }, at)).toEqual({ ok: true });
  }
}

beforeEach(async () => {
  db = await createTestDb();
});

describe("loadQueue", () => {
  it("gives a fresh user the first newPerDay cards", async () => {
    const u = await addUser("u1");
    const q = await loadQueue(db, u, now);
    expect(q.dueCount).toBe(0);
    expect(q.freshCount).toBe(10);
    expect(q.cardIds).toEqual(CARD_ORDER.slice(0, 10));
    expect(q.reps).toEqual({});
    expect(q.states).toEqual({});
  });

  it("drops a card after one Good and keeps it after Again", async () => {
    const u = await addUser("u1");
    expect(await applyReview(db, u, { cardId: "r-2", rating: 3, reps: 0 }, now)).toEqual({ ok: true });
    const q = await loadQueue(db, u, now);
    expect(q.cardIds).not.toContain("r-2");

    const u2 = await addUser("u2");
    await applyReview(db, u2, { cardId: "r-2", rating: 1, reps: 0 }, now);
    const q2 = await loadQueue(db, u2, now);
    expect(q2.cardIds).toContain("r-2");
    expect(q2.dueCount).toBe(1);
    expect(q2.reps["r-2"]).toBe(1);
    expect(q2.states["r-2"]).toMatchObject({ reps: 1, due: now });
  });

  it("keeps an Again card in the queue on the next Berlin day", async () => {
    const u = await addUser("u1");
    await applyReview(db, u, { cardId: "r-2", rating: 1, reps: 0 }, now);
    const tomorrow = new Date(now.getTime() + 24 * 3600_000);
    expect((await loadQueue(db, u, tomorrow)).cardIds).toContain("r-2");
  });

  it("lists due cards before new ones", async () => {
    const u = await addUser("u1", 3);
    await applyReview(db, u, { cardId: "r-3", rating: 1, reps: 0 }, now);
    const q = await loadQueue(db, u, now);
    expect(q.cardIds[0]).toBe("r-3");
    expect(q.dueCount).toBe(1);
    expect(q.freshCount).toBe(2);
  });
});

describe("applyReview", () => {
  it("stores state and log row", async () => {
    const u = await addUser("u1");
    expect(await applyReview(db, u, { cardId: "r-2", rating: 3, reps: 0 }, now)).toEqual({ ok: true });
    const states = await db.select().from(cardState);
    const logs = await db.select().from(reviewLog);
    expect(states).toHaveLength(1);
    expect(states[0].reps).toBe(1);
    expect(states[0].introducedAt).toEqual(now);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ userId: "u1", cardId: "r-2", rating: 3, reviewedAt: now });
  });

  it("rejects a repeated identical call as stale without writing", async () => {
    const u = await addUser("u1");
    await applyReview(db, u, { cardId: "r-2", rating: 3, reps: 0 }, now);
    expect(await applyReview(db, u, { cardId: "r-2", rating: 3, reps: 0 }, now)).toEqual({ ok: false, reason: "stale" });
    expect(await db.select().from(reviewLog)).toHaveLength(1);
  });

  it("rejects a reps value above the stored one for an unseen card", async () => {
    const u = await addUser("u1");
    expect(await applyReview(db, u, { cardId: "r-2", rating: 3, reps: 2 }, now)).toEqual({ ok: false, reason: "stale" });
    expect(await db.select().from(cardState)).toHaveLength(0);
  });

  it("lets exactly one of two parallel identical calls succeed", async () => {
    const u = await addUser("u1");
    const input = { cardId: "r-2", rating: 3 as const, reps: 0 };
    const results = await Promise.all([applyReview(db, u, input, now), applyReview(db, u, input, now)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, reason: "stale" }]);
    expect(await db.select().from(reviewLog)).toHaveLength(1);
    expect(await db.select().from(cardState)).toHaveLength(1);
  });

  it("lets exactly one of two parallel identical follow-up reviews succeed", async () => {
    const u = await addUser("u1");
    await applyReview(db, u, { cardId: "r-2", rating: 3, reps: 0 }, now);
    const input = { cardId: "r-2", rating: 3 as const, reps: 1 };
    const later = new Date(now.getTime() + 11 * 60_000);
    const results = await Promise.all([applyReview(db, u, input, later), applyReview(db, u, input, later)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.select().from(reviewLog)).toHaveLength(2);
  });

  it("rejects invalid ratings and reps", async () => {
    const u = await addUser("u1");
    for (const rating of [0, 5, 2.5, NaN]) {
      expect(await applyReview(db, u, { cardId: "r-2", rating: rating as 1, reps: 0 }, now)).toEqual({ ok: false, reason: "invalid" });
    }
    for (const reps of [-1, 1.5, NaN]) {
      expect(await applyReview(db, u, { cardId: "r-2", rating: 3, reps }, now)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(await db.select().from(reviewLog)).toHaveLength(0);
  });

  it("rejects unknown cards", async () => {
    const u = await addUser("u1");
    expect(await applyReview(db, u, { cardId: "r-9999", rating: 3, reps: 0 }, now)).toEqual({ ok: false, reason: "unknown-card" });
  });

  it("enforces the daily limit on new cards but not on known ones", async () => {
    const u = await addUser("u1", 1);
    expect(await applyReview(db, u, { cardId: "r-2", rating: 1, reps: 0 }, now)).toEqual({ ok: true });
    expect(await applyReview(db, u, { cardId: "r-3", rating: 3, reps: 0 }, now)).toEqual({ ok: false, reason: "limit" });
    expect(await applyReview(db, u, { cardId: "r-2", rating: 3, reps: 1 }, new Date(now.getTime() + 60_000))).toEqual({ ok: true });
    // next Berlin day: budget is fresh again
    const tomorrow = new Date(now.getTime() + 24 * 3600_000);
    expect(await applyReview(db, u, { cardId: "r-3", rating: 3, reps: 0 }, tomorrow)).toEqual({ ok: true });
  });

  it("accepts the extra allowance of today and rejects the card after it", async () => {
    const u = await addUser("u1", 10);
    await db.update(user).set({ extraNewDay: "2026-11-11", extraNewCount: 5 }).where(eq(user.id, "u1"));
    const results = [];
    for (const cardId of CARD_ORDER.slice(0, 15)) {
      results.push(await applyReview(db, u, { cardId, rating: 3, reps: 0 }, now));
    }
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await applyReview(db, u, { cardId: CARD_ORDER[15], rating: 3, reps: 0 }, now)).toEqual({ ok: false, reason: "limit" });
  });

  it("reads the allowance from the database, not from the passed user", async () => {
    const u = await addUser("u1", 1);
    await introduce(u, [CARD_ORDER[0]], now);
    // The session object knows nothing about the allowance; the stored row decides.
    await db.update(user).set({ extraNewDay: "2026-11-11", extraNewCount: 5 }).where(eq(user.id, "u1"));
    expect(await applyReview(db, u, { cardId: CARD_ORDER[1], rating: 3, reps: 0 }, now)).toEqual({ ok: true });
  });

  it("does not carry the allowance over to the next Berlin day", async () => {
    const u = await addUser("u1", 10);
    await db.update(user).set({ extraNewDay: "2026-11-11", extraNewCount: 5 }).where(eq(user.id, "u1"));
    const tomorrow = new Date(now.getTime() + 24 * 3600_000);
    for (const cardId of CARD_ORDER.slice(0, 10)) {
      expect(await applyReview(db, u, { cardId, rating: 3, reps: 0 }, tomorrow)).toEqual({ ok: true });
    }
    expect(await applyReview(db, u, { cardId: CARD_ORDER[10], rating: 3, reps: 0 }, tomorrow)).toEqual({ ok: false, reason: "limit" });
  });
});

describe("loadQueue with an extra allowance", () => {
  it("offers the allowance of today only", async () => {
    const u = await addUser("u1", 2);
    await db.update(user).set({ extraNewDay: "2026-11-11", extraNewCount: 5 }).where(eq(user.id, "u1"));
    expect((await loadQueue(db, u, now)).freshCount).toBe(7);
    const tomorrow = new Date(now.getTime() + 24 * 3600_000);
    expect((await loadQueue(db, u, tomorrow)).freshCount).toBe(2);
  });

  it("reports how many cards were never introduced", async () => {
    const u = await addUser("u1", 2);
    expect((await loadQueue(db, u, now)).unseenCount).toBe(CARD_ORDER.length);
    await introduce(u, CARD_ORDER.slice(0, 2), now);
    expect((await loadQueue(db, u, now)).unseenCount).toBe(CARD_ORDER.length - 2);
  });
});

describe("extra cards", () => {
  const isExtra = (id: string) => /^[ndo]-/.test(id);
  const yesterday = new Date(now.getTime() - 24 * 3600_000);

  async function switchOn(id: string, extras: Partial<typeof user.$inferInsert>) {
    await db.update(user).set(extras).where(eq(user.id, id));
  }

  /** Stores the given cards as seen, due far in the future (or at `due`). */
  async function seen(userId: string, ids: string[], due = new Date("2030-01-01T00:00:00Z")) {
    await db.insert(cardState).values(
      ids.map((cardId) => ({
        userId,
        cardId,
        due,
        stability: 10,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 10,
        learningSteps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        introducedAt: yesterday,
      })),
    );
  }

  it("leaves every extra card out while the switches are off", async () => {
    const u = await addUser("u1", 50);
    const q = await loadQueue(db, u, now);
    expect(q.cardIds.filter(isExtra)).toEqual([]);
    expect(q.unseenCount).toBe(402);
  });

  it("brings the cards above 170 after the core cards once switched on", async () => {
    const u = await addUser("u1", 3);
    await seen("u1", CARD_ORDER);
    await switchOn("u1", { extraOver170: true });
    const q = await loadQueue(db, u, now);
    expect(q.cardIds).toEqual(["o-171", "o-172", "o-173"]);
    expect(q.unseenCount).toBe(60);
  });

  it("brings the extra cards of rests already learned first, in order of the rest", async () => {
    const u = await addUser("u1", 3);
    await seen("u1", CARD_ORDER.filter((id) => (CARDS.find((c) => c.id === id)?.rest ?? 0) <= 40));
    await switchOn("u1", { extraSingleDouble: true, extraNeighbours: true });
    expect((await loadQueue(db, u, now)).cardIds).toEqual(["d-2", "d-3", "d-4"]);
  });

  it("hides a due extra card while switched off and keeps its state for later", async () => {
    const u = await addUser("u1", 0);
    await seen("u1", ["n-170-0-S1"], yesterday);
    await switchOn("u1", { extraNeighbours: true });
    expect((await loadQueue(db, u, now)).cardIds).toEqual(["n-170-0-S1"]);

    await switchOn("u1", { extraNeighbours: false });
    const off = await loadQueue(db, u, now);
    expect(off.cardIds).toEqual([]);
    expect(off.dueCount).toBe(0);
    expect(await db.select().from(cardState)).toHaveLength(1);

    await switchOn("u1", { extraNeighbours: true });
    const on = await loadQueue(db, u, now);
    expect(on.cardIds).toEqual(["n-170-0-S1"]);
    expect(on.reps["n-170-0-S1"]).toBe(1);
  });

  it("still counts an extra card introduced today after switching it off, like the daily limit does", async () => {
    const u = await addUser("u1", 1);
    await switchOn("u1", { extraOver170: true });
    expect(await applyReview(db, u, { cardId: "o-171", rating: 3, reps: 0 }, now)).toEqual({ ok: true });
    await switchOn("u1", { extraOver170: false });
    const q = await loadQueue(db, u, now);
    expect(q.freshCount).toBe(0);
    expect(q.newLeftToday).toBe(0);
  });

  it("refuses to rate a switched-off extra card and writes nothing", async () => {
    const u = await addUser("u1");
    expect(await applyReview(db, u, { cardId: "o-171", rating: 3, reps: 0 }, now)).toEqual({
      ok: false,
      reason: "off",
    });
    expect(await db.select().from(cardState)).toEqual([]);
    expect(await db.select().from(reviewLog)).toEqual([]);
  });

  it("rates a switched-on extra card", async () => {
    const u = await addUser("u1");
    await switchOn("u1", { extraSingleDouble: true });
    expect(await applyReview(db, u, { cardId: "d-16", rating: 3, reps: 0 }, now)).toEqual({ ok: true });
  });
});

describe("loadQueue newLeftToday", () => {
  it("counts the limit with today's extra cards minus the cards introduced today, never below zero", async () => {
    const u = await addUser("u1", 2);
    await db.update(user).set({ extraNewDay: "2026-11-11", extraNewCount: 3 }).where(eq(user.id, "u1"));
    expect((await loadQueue(db, u, now)).newLeftToday).toBe(5);
    await introduce(u, CARD_ORDER.slice(0, 4), now);
    expect((await loadQueue(db, u, now)).newLeftToday).toBe(1);
    // Die Einstellung wurde nach dem Einführen gesenkt: nie negativ.
    expect((await loadQueue(db, { ...u, newPerDay: 0 }, now)).newLeftToday).toBe(0);
    const tomorrow = new Date(now.getTime() + 24 * 3600_000);
    expect((await loadQueue(db, u, tomorrow)).newLeftToday).toBe(2);
  });
});

describe("submitReview", () => {
  const input = { cardId: "r-2", rating: 3, reps: 0 };
  const sessionUser = (status: SessionUser["status"]): SessionUser => ({
    id: "u1", email: "u1@x.test", name: "u1", status, role: "user", newPerDay: 10,
  });

  it("rejects without session", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await submitReview(input)).toEqual({ ok: false, reason: "auth" });
  });

  it("rejects blocked and pending users", async () => {
    getSessionUser.mockResolvedValue(sessionUser("blocked"));
    expect(await submitReview(input)).toEqual({ ok: false, reason: "auth" });
    getSessionUser.mockResolvedValue(sessionUser("pending"));
    expect(await submitReview(input)).toEqual({ ok: false, reason: "auth" });
  });

  it("rejects malformed input for an active user", async () => {
    getSessionUser.mockResolvedValue(sessionUser("active"));
    for (const bad of [null, undefined, "x", {}, { cardId: 1, rating: 3, reps: 0 }, { cardId: "r-2", rating: "3", reps: 0 }, { cardId: "r-2", rating: 3, reps: "0" }, { cardId: "r-2", rating: 9, reps: 0 }]) {
      expect(await submitReview(bad as never)).toEqual({ ok: false, reason: "invalid" });
    }
  });
});
