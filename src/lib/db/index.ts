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

let instance: Db | undefined;

/**
 * Die Verbindung entsteht erst beim ersten Zugriff, damit weder der Build noch
 * ein bloßer Import eine Datenbank öffnet.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= connect();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
