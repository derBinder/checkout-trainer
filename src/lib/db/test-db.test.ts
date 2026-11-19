import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "./index";
import { createTestDb } from "./test-db";

async function tableOf(db: Db, name: string): Promise<string | null> {
  // Db ist treiberneutral, execute() liefert deshalb unknown; hier läuft immer PGlite.
  const result = (await db.execute(sql`select to_regclass(${name})::text as t`)) as {
    rows: { t: string | null }[];
  };
  return result.rows[0].t;
}

// Von der obersten Ebene: bleibt für alle Tests der Datei offen.
const shared = await createTestDb();
let fromPreviousTest: Db | undefined;

afterEach(async () => {
  // Läuft vor dem Schließen in test-db.ts: Die Kopie des Tests ist noch offen.
  if (fromPreviousTest) expect(await tableOf(fromPreviousTest, '"user"')).toBe('"user"');
});

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
    fromPreviousTest = first;
  });

  it("schließt Kopien aus einem Test nach dessen Ende, die der Datei erst danach", async () => {
    await expect(tableOf(fromPreviousTest!, '"user"')).rejects.toThrow();
    fromPreviousTest = undefined;
    expect(await tableOf(shared, '"user"')).toBe('"user"');
  });
});
