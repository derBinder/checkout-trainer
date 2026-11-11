import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Gemeinsamer Typ für beide Treiber (node-postgres und PGlite). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

function connect(): Db {
  const url = process.env.DATABASE_URL;
  if (url) return drizzlePg(url, { schema });
  mkdirSync(".data", { recursive: true });
  return drizzlePglite({ client: new PGlite(".data/pglite"), schema });
}

// Auf globalThis statt im Modul: Next.js bündelt Route Handler und Seiten
// getrennt, ein Modul-Singleton gäbe es sonst mehrfach im selben Prozess.
// Zwei PGlite-Instanzen auf demselben Verzeichnis brechen mit "Aborted()" ab.
const store = globalThis as typeof globalThis & { __checkoutTrainerDb?: Db };

/**
 * Die Verbindung entsteht erst beim ersten Zugriff, damit weder der Build noch
 * ein bloßer Import eine Datenbank öffnet.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = (store.__checkoutTrainerDb ??= connect());
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
