import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { cardState, reviewLog, user } from "@/lib/db/schema";
import { CARD_ORDER } from "@/lib/cards";
import type { SessionUser } from "@/lib/auth/guard";

const getSessionUser = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/guard", () => ({ getSessionUser: () => getSessionUser() }));
// submitReview importiert die echte Datenbank; die Tests erreichen sie nicht.
vi.mock("@/lib/db", () => ({ db: {} }));

import { applyReview, loadQueue } from "./queries";
import { submitReview } from "./actions";

const now = new Date("2026-11-11T10:00:00Z");
let db: Db;

async function addUser(id: string, newPerDay = 10) {
  await db.insert(user).values({ id, name: id, email: `${id}@x.test`, status: "active", newPerDay });
  return { id, newPerDay };
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
