import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { cardState, reviewLog, user } from "@/lib/db/schema";
import { resetProgress } from "./reset-progress";

let db: Db;

const NOW = new Date("2026-11-10T10:00:00Z");

async function addProgress(userId: string) {
  await db.insert(cardState).values({
    userId,
    cardId: "r40",
    due: NOW,
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 1,
    learningSteps: 0,
    reps: 1,
    lapses: 0,
    state: 2,
    lastReview: NOW,
    introducedAt: NOW,
  });
  await db.insert(reviewLog).values({ userId, cardId: "r40", rating: 3, reviewedAt: NOW });
}

async function counts(userId: string) {
  const cards = await db.select().from(cardState).where(eq(cardState.userId, userId));
  const logs = await db.select().from(reviewLog).where(eq(reviewLog.userId, userId));
  return { cards: cards.length, logs: logs.length };
}

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values([
    {
      id: "u1",
      name: "u1",
      email: "u1@x.test",
      status: "active",
      newPerDay: 7,
      extraNewDay: "2026-11-10",
      extraNewCount: 5,
      extraOver170: true,
    },
    { id: "u2", name: "u2", email: "u2@x.test", status: "active" },
  ]);
  await addProgress("u1");
  await addProgress("u2");
});

describe("resetProgress", () => {
  it("deletes the card states and the review history of the account", async () => {
    expect(await resetProgress(db, "u1")).toEqual({ ok: true });
    expect(await counts("u1")).toEqual({ cards: 0, logs: 0 });
  });

  it("clears the extra cards already taken today", async () => {
    await resetProgress(db, "u1");
    const [row] = await db.select().from(user).where(eq(user.id, "u1"));
    expect(row).toMatchObject({ extraNewDay: null, extraNewCount: 0 });
  });

  it("keeps the settings of the account", async () => {
    await resetProgress(db, "u1");
    const [row] = await db.select().from(user).where(eq(user.id, "u1"));
    expect(row).toMatchObject({ newPerDay: 7, extraOver170: true, status: "active" });
  });

  it("leaves other accounts alone", async () => {
    await resetProgress(db, "u1");
    expect(await counts("u2")).toEqual({ cards: 1, logs: 1 });
  });

  it("reports a failure for an account that does not exist", async () => {
    expect(await resetProgress(db, "unbekannt")).toEqual({ ok: false });
    expect(await counts("u1")).toEqual({ cards: 1, logs: 1 });
  });
});
