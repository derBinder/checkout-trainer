import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeEach } from "vitest";
import type { Db } from "./index";
import * as schema from "./schema";

// Start (initdb) und Migrationen laufen nur einmal je Testdatei; jeder Aufruf
// bekommt davon eine Kopie. Ein Klon ist etwa fünfmal schneller als ein Neustart.
let template: Promise<PGlite> | undefined;

// Kopien aus beforeEach oder dem Testkörper schließen nach dem Test, Kopien von
// der obersten Ebene der Testdatei (eine für alle Tests) erst nach der Datei.
// Die Hooks hängen an der Testdatei, die dieses Modul importiert; der Import
// läuft vor ihren eigenen Hooks, also öffnet dieses beforeEach zuerst und
// dieses afterEach schließt zuletzt.
let inTest = false;
const perTest: PGlite[] = [];
const perFile: PGlite[] = [];

beforeEach(() => {
  inTest = true;
});
afterEach(async () => {
  inTest = false;
  await Promise.all(perTest.splice(0).map((client) => client.close()));
});
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
  (inTest ? perTest : perFile).push(client);
  return drizzle({ client, schema });
}
