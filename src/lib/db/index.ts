import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { resolveDbTarget } from "./driver";
import * as schema from "./schema";

/** Gemeinsamer Typ für beide Treiber (node-postgres und PGlite). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Auf globalThis statt im Modul: Next.js bündelt Route Handler und Seiten
// getrennt, ein Modul-Singleton gäbe es sonst mehrfach im selben Prozess.
// Zwei PGlite-Instanzen auf demselben Verzeichnis brechen mit "Aborted()" ab.
const store = globalThis as typeof globalThis & {
  __checkoutTrainerDb?: Db;
  __checkoutTrainerPgliteShutdown?: true;
};

function connect(): Db {
  const target = resolveDbTarget(process.env);
  if (target.driver === "pg") return drizzlePg(target.url, { schema });
  if (target.location === undefined) {
    // Build-Phase: flüchtige Datenbank, das lokale Verzeichnis bleibt unberührt.
    return drizzlePglite({ client: new PGlite(), schema });
  }
  mkdirSync(".data", { recursive: true });
  const client = new PGlite(target.location);
  closeOnShutdown(client);
  return drizzlePglite({ client, schema });
}

/**
 * Schließt die lokale PGlite-Datenbank bei SIGINT/SIGTERM, bevor der Prozess
 * endet. Ohne das gehen beim Stoppen von `next dev` Daten verloren oder die
 * Datenbank lässt sich danach nicht mehr öffnen. Höchstens einmal pro Prozess.
 */
const SHUTDOWN_TIMEOUT_MS = 3000;

function closeOnShutdown(client: PGlite) {
  if (store.__checkoutTrainerPgliteShutdown) return;
  store.__checkoutTrainerPgliteShutdown = true;
  let closing = false;
  const shutdown = (signal: NodeJS.Signals) => {
    // Doppelte Signale (Shell und `next dev` schicken beide SIGINT) ignorieren.
    if (closing) return;
    closing = true;
    const exit = () => process.exit(signal === "SIGINT" ? 130 : 143);
    // Falls close() nie fertig wird, trotzdem beenden (unter NEXT_EXIT_TIMEOUT_MS im dev-Skript).
    setTimeout(exit, SHUTDOWN_TIMEOUT_MS).unref();
    client
      .close()
      .catch((error: unknown) => console.error(error))
      .finally(exit);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

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
