import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Db } from "./index";
import { createTestDb } from "./test-db";

async function tableOf(db: Db, name: string): Promise<string | null> {
  // Db ist treiberneutral, execute() liefert deshalb unknown; hier läuft immer PGlite.
  const result = (await db.execute(sql`select to_regclass(${name})::text as t`)) as {
    rows: { t: string | null }[];
  };
  return result.rows[0].t;
}

describe("createTestDb", () => {
  it("liefert migrierte Datenbanken, die sich gegenseitig nicht sehen", async () => {
    const first = await createTestDb();
    const second = await createTestDb();
    await first.execute(sql`create table probe (x int)`);
    const third = await createTestDb();

    expect(await tableOf(first, "probe")).toBe("probe");
    expect(await tableOf(second, "probe")).toBeNull();
    expect(await tableOf(third, "probe")).toBeNull();
    expect(await tableOf(third, '"user"')).toBe('"user"');
  });
});
