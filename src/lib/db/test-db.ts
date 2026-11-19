import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, onTestFinished, TestRunner } from "vitest";
import type { Db } from "./index";
import * as schema from "./schema";

// Start (initdb) und Migrationen laufen nur einmal je Testdatei; jeder Aufruf
// bekommt davon eine Kopie. Ein Klon ist etwa fünfmal schneller als ein Neustart.
let template: Promise<PGlite> | undefined;

// Kopien von der obersten Ebene der Testdatei (eine für alle Tests) schließen erst
// nach der Datei. afterAll hängt an der Testdatei, die dieses Modul importiert.
const perFile: PGlite[] = [];
afterAll(async () => {
  await Promise.all(perFile.splice(0).map((client) => client.close()));
  if (template) await (await template).close();
});

async function migratedTemplate(): Promise<PGlite> {
  const client = new PGlite();
  await migrate(drizzle({ client, schema }), { migrationsFolder: "./drizzle" });
  return client;
}

/** Frische In-Memory-PGlite mit allen Migrationen, eine eigene pro Aufruf. */
export async function createTestDb(): Promise<Db> {
  template ??= migratedTemplate();
  const client = (await (await template).clone()) as PGlite;
  // Aus einem Test oder beforeEach: nach dem Test schließen, erst nach dessen afterEach.
  if (TestRunner.getCurrentTest()) onTestFinished(() => client.close());
  else perFile.push(client);
  return drizzle({ client, schema });
}
