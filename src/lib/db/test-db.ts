import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "./index";
import * as schema from "./schema";

/** Frische In-Memory-PGlite mit allen Migrationen, eine pro Aufruf. */
export async function createTestDb(): Promise<Db> {
  const testDb = drizzle({ client: new PGlite(), schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  return testDb;
}
