import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { practiceDay, user } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { recordPracticeDay } from "./practice-day";

const now = new Date("2026-11-11T10:00:00Z");
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values({ id: "u1", name: "u1", email: "u1@x.test", status: "active" });
});

describe("recordPracticeDay", () => {
  it("writes the Berlin day once", async () => {
    await recordPracticeDay(db, "u1", now);
    await recordPracticeDay(db, "u1", new Date("2026-11-11T18:00:00Z"));
    expect(await db.select().from(practiceDay)).toEqual([{ userId: "u1", day: "2026-11-11" }]);
  });

  it("uses the Berlin day after midnight in Berlin", async () => {
    await recordPracticeDay(db, "u1", new Date("2026-11-11T23:30:00Z"));
    expect((await db.select().from(practiceDay))[0].day).toBe("2026-11-12");
  });

  it("removes the days with the account", async () => {
    await recordPracticeDay(db, "u1", now);
    await db.delete(user).where(eq(user.id, "u1"));
    expect(await db.select().from(practiceDay)).toEqual([]);
  });
});
