import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
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
    expect(row).toMatchObject({ extraSingleDouble: false, extraNeighbours: false, extraOver170: false });
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

describe("Migration der Zusatzkarten", () => {
  /** Ordner mit den Migrationen bis einschließlich `last`, wie sie vor dem Paket in Produktion lagen. */
  function migrationsUpTo(last: number): string {
    const dir = mkdtempSync(join(tmpdir(), "migrationen-"));
    cpSync("./drizzle", dir, { recursive: true });
    const journalPath = join(dir, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= last);
    writeFileSync(journalPath, JSON.stringify(journal));
    return dir;
  }

  it("schaltet für bestehende Konten alle Zusatzkarten aus und lässt den Lernstand stehen", async () => {
    const dir = migrationsUpTo(1);
    try {
      const db = drizzle({ client: new PGlite(), schema: { user, cardState } });
      await migrate(db, { migrationsFolder: dir });
      await db.execute(
        `INSERT INTO "user" (id, name, email, status, new_per_day) VALUES ('alt', 'Alt', 'alt@x.test', 'active', 7)`,
      );
      await db.execute(
        `INSERT INTO card_state (user_id, card_id, due, stability, difficulty, elapsed_days, scheduled_days,
           learning_steps, reps, lapses, state, introduced_at)
         VALUES ('alt', 'r-40', now(), 3, 5, 1, 4, 0, 2, 0, 2, now())`,
      );

      await migrate(db, { migrationsFolder: "./drizzle" });

      const [row] = await db.select().from(user).where(eq(user.id, "alt"));
      expect(row).toMatchObject({
        status: "active",
        newPerDay: 7,
        extraSingleDouble: false,
        extraNeighbours: false,
        extraOver170: false,
      });
      const states = await db.select().from(cardState);
      expect(states).toHaveLength(1);
      expect(states[0]).toMatchObject({ userId: "alt", cardId: "r-40", reps: 2, scheduledDays: 4 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
