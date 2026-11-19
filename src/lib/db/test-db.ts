import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "./index";
import * as schema from "./schema";

// Start (initdb) und Migrationen laufen nur einmal je Testdatei; jeder Aufruf
// bekommt davon eine Kopie. Ein Klon ist etwa fünfmal schneller als ein Neustart.
let template: Promise<PGlite> | undefined;

async function migratedTemplate(): Promise<PGlite> {
  const client = new PGlite();
  await migrate(drizzle({ client, schema }), { migrationsFolder: "./drizzle" });
  return client;
}

/** Frische In-Memory-PGlite mit allen Migrationen, eine eigene pro Aufruf. */
export async function createTestDb(): Promise<Db> {
  template ??= migratedTemplate();
  const client = (await (await template).clone()) as PGlite;
  return drizzle({ client, schema });
}
