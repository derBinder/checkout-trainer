import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { cardState, reviewLog, user } from "./schema";
import { createTestDb } from "./test-db";

const now = new Date("2026-01-01T10:00:00Z");

async function seed() {
  const db = await createTestDb();
  await db.insert(user).values({
    id: "u1",
    name: "Test",
    email: "test@checkout-trainer.test",
  });
  await db.insert(cardState).values({
    userId: "u1",
    cardId: "d-100",
    due: now,
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 1,
    learningSteps: 0,
    reps: 1,
    lapses: 0,
    state: 1,
    lastReview: now,
    introducedAt: now,
  });
  await db
    .insert(reviewLog)
    .values({ userId: "u1", cardId: "d-100", rating: 3, reviewedAt: now });
  return db;
}

describe("Datenbankschema", () => {
  it("vergibt Standardwerte für neue Nutzer", async () => {
    const db = await seed();
    const [row] = await db.select().from(user).where(eq(user.id, "u1"));
    expect(row.status).toBe("pending");
    expect(row.newPerDay).toBe(10);
  });

  it("löscht Lernstand und Verlauf beim Löschen des Nutzers", async () => {
    const db = await seed();
    expect(await db.select().from(cardState)).toHaveLength(1);
    expect(await db.select().from(reviewLog)).toHaveLength(1);
    await db.delete(user).where(eq(user.id, "u1"));
    expect(await db.select().from(cardState)).toHaveLength(0);
    expect(await db.select().from(reviewLog)).toHaveLength(0);
  });

  it("lehnt eine zweite Karte desselben Nutzers mit gleicher cardId ab", async () => {
    const db = await seed();
    await expect(
      db.insert(cardState).values({
        userId: "u1",
        cardId: "d-100",
        due: now,
        stability: 1,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 1,
        learningSteps: 0,
        reps: 1,
        lapses: 0,
        state: 1,
        lastReview: now,
        introducedAt: now,
      }),
    ).rejects.toThrow();
  });
});
