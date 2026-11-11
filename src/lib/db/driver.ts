export type DbTarget =
  | { driver: "pg"; url: string }
  | { driver: "pglite"; location: string | undefined };

export const PGLITE_DIRECTORY = ".data/pglite";

/**
 * Wählt Treiber und Speicherort. Ohne DATABASE_URL läuft PGlite; während
 * `next build` (mehrere Worker-Prozesse) nur im Arbeitsspeicher, weil mehrere
 * Prozesse dasselbe PGlite-Verzeichnis nicht gleichzeitig öffnen dürfen.
 * `location: undefined` bedeutet In-Memory.
 */
export function resolveDbTarget(
  env: Readonly<Record<string, string | undefined>>,
): DbTarget {
  if (env.DATABASE_URL) return { driver: "pg", url: env.DATABASE_URL };
  if (env.NEXT_PHASE === "phase-production-build") {
    return { driver: "pglite", location: undefined };
  }
  return { driver: "pglite", location: PGLITE_DIRECTORY };
}
