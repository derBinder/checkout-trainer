import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { setNewPerDay } from "./set-new-per-day";

let db: Db;

async function stored() {
  const [row] = await db.select({ n: user.newPerDay }).from(user).where(eq(user.id, "u1"));
  return row.n;
}

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values({ id: "u1", name: "u1", email: "u1@x.test", status: "active", newPerDay: 7 });
});

describe("setNewPerDay", () => {
  it.each([0, 10, 50])("stores %i", async (value) => {
    expect(await setNewPerDay(db, "u1", value)).toEqual({ ok: true });
    expect(await stored()).toBe(value);
  });

  it.each([-1, 51, 2.5, "10", Number.NaN, Infinity, null, undefined])(
    "rejects %s and leaves the value unchanged",
    async (value) => {
      expect(await setNewPerDay(db, "u1", value)).toEqual({ ok: false });
      expect(await stored()).toBe(7);
    },
  );

  it("changes only the given user", async () => {
    await db.insert(user).values({ id: "u2", name: "u2", email: "u2@x.test", status: "active", newPerDay: 3 });
    await setNewPerDay(db, "u1", 20);
    const [other] = await db.select({ n: user.newPerDay }).from(user).where(eq(user.id, "u2"));
    expect(other.n).toBe(3);
  });
});
