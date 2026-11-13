import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { cardState, user, type UserStatus } from "@/lib/db/schema";
import { CARD_ORDER } from "@/lib/cards";
import { applyReview, loadQueue } from "@/lib/review/queries";
import { EXTRA_NEW_MAX, EXTRA_NEW_STEP, grantExtraNewCards } from "./grant-extra-cards";

const now = new Date("2026-11-11T10:00:00Z");
const farFuture = new Date("2030-01-01T00:00:00Z");
let db: Db;

async function addUser(newPerDay = 2, status: UserStatus = "active") {
  await db.insert(user).values({ id: "u1", name: "u1", email: "u1@x.test", status, newPerDay });
  return { id: "u1", newPerDay };
}

async function stored() {
  const [row] = await db
    .select({ day: user.extraNewDay, count: user.extraNewCount })
    .from(user)
    .where(eq(user.id, "u1"));
  return row;
}

/** Rates every card of today's queue Good until it is empty. */
async function finishToday(u: { id: string; newPerDay: number }, at: Date) {
  for (;;) {
    const q = await loadQueue(db, u, at);
    if (q.cardIds.length === 0) return;
    for (const cardId of q.cardIds) {
      const r = await applyReview(db, u, { cardId, rating: 3, reps: q.reps[cardId] ?? 0 }, at);
      expect(r).toEqual({ ok: true });
    }
  }
}

/** Stores the given cards as introduced at `introducedAt` and due far in the future. */
async function seedStates(ids: string[], introducedAt: Date) {
  await db.insert(cardState).values(
    ids.map((cardId) => ({
      userId: "u1",
      cardId,
      due: farFuture,
      stability: 100,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 1000,
      learningSteps: 0,
      reps: 3,
      lapses: 0,
      state: 2,
      lastReview: introducedAt,
      introducedAt,
    })),
  );
}

beforeEach(async () => {
  db = await createTestDb();
});

describe("grantExtraNewCards", () => {
  it("refuses while new cards remain and changes nothing", async () => {
    await addUser();
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: false, reason: "not-done" });
    expect(await stored()).toEqual({ day: null, count: 0 });
  });

  it("refuses while a card is due today", async () => {
    await addUser(0);
    await seedStates([CARD_ORDER[0]], new Date("2026-11-01T10:00:00Z"));
    await db.update(cardState).set({ due: now }).where(eq(cardState.cardId, CARD_ORDER[0]));
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: false, reason: "not-done" });
    expect(await stored()).toEqual({ day: null, count: 0 });
  });

  it("grants 5 more new cards once today's queue is empty", async () => {
    const u = await addUser();
    await finishToday(u, now);
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: true });
    expect(await stored()).toEqual({ day: "2026-11-11", count: EXTRA_NEW_STEP });
    const q = await loadQueue(db, u, now);
    expect(q.dueCount).toBe(0);
    expect(q.freshCount).toBe(5);
    expect(q.cardIds).toEqual(CARD_ORDER.slice(2, 7));
  });

  it("grants 5 more again after those are finished", async () => {
    const u = await addUser();
    await finishToday(u, now);
    await grantExtraNewCards(db, "u1", now);
    // A second tap before learning them is refused.
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: false, reason: "not-done" });
    await finishToday(u, now);
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: true });
    expect(await stored()).toEqual({ day: "2026-11-11", count: 10 });
    const q = await loadQueue(db, u, now);
    expect(q.freshCount).toBe(5);
    expect(q.cardIds).toEqual(CARD_ORDER.slice(7, 12));
  });

  it("replaces a stale allowance from an earlier day instead of adding to it", async () => {
    const u = await addUser();
    await db.update(user).set({ extraNewDay: "2026-11-10", extraNewCount: 20 }).where(eq(user.id, "u1"));
    await finishToday(u, now);
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: true });
    expect(await stored()).toEqual({ day: "2026-11-11", count: 5 });
  });

  it("caps the extra cards of one day at 50", async () => {
    await addUser(0);
    await seedStates(CARD_ORDER.slice(0, EXTRA_NEW_MAX - EXTRA_NEW_STEP), now);
    await db.update(user).set({ extraNewDay: "2026-11-11", extraNewCount: EXTRA_NEW_MAX - EXTRA_NEW_STEP }).where(eq(user.id, "u1"));
    // 45 granted and learned: one more grant reaches 50.
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: true });
    expect(await stored()).toEqual({ day: "2026-11-11", count: EXTRA_NEW_MAX });
    await seedStates(CARD_ORDER.slice(EXTRA_NEW_MAX - EXTRA_NEW_STEP, EXTRA_NEW_MAX), now);
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: false, reason: "cap" });
    expect(await stored()).toEqual({ day: "2026-11-11", count: EXTRA_NEW_MAX });
  });

  it("counts cards learned beyond a since-lowered daily setting", async () => {
    // 10 introduced today, then the setting dropped to 2: a grant must still give 5.
    const u = await addUser(2);
    await seedStates(CARD_ORDER.slice(0, 10), now);
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: true });
    expect((await loadQueue(db, u, now)).freshCount).toBe(5);
  });

  it("refuses when every card has been introduced", async () => {
    const u = await addUser(0);
    await seedStates(CARD_ORDER, new Date("2026-11-01T10:00:00Z"));
    expect((await loadQueue(db, u, now)).unseenCount).toBe(0);
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: false, reason: "all-introduced" });
    expect(await stored()).toEqual({ day: null, count: 0 });
  });

  it.each<UserStatus>(["pending", "blocked"])("refuses a %s user", async (status) => {
    await addUser(0, status);
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: false, reason: "inactive" });
    expect(await stored()).toEqual({ day: null, count: 0 });
  });

  it.each([undefined, null, 42, "", "unknown"])("refuses the user id %s", async (id) => {
    await addUser(0);
    expect(await grantExtraNewCards(db, id as never, now)).toEqual({ ok: false, reason: "inactive" });
    expect(await stored()).toEqual({ day: null, count: 0 });
  });

  it("changes only the given user", async () => {
    await addUser(0);
    await db.insert(user).values({ id: "u2", name: "u2", email: "u2@x.test", status: "active", newPerDay: 0 });
    expect(await grantExtraNewCards(db, "u1", now)).toEqual({ ok: true });
    const [other] = await db.select({ count: user.extraNewCount }).from(user).where(eq(user.id, "u2"));
    expect(other.count).toBe(0);
  });
});
