export type DbTarget =
  | { driver: "pg"; url: string }
  | { driver: "pglite"; location: string | undefined };

export const PGLITE_DIRECTORY = ".data/pglite";

/**
 * Wählt Treiber und Speicherort. Ohne DATABASE_URL läuft PGlite; während
 * `next build` (mehrere Worker-Prozesse) nur im Arbeitsspeicher, weil mehrere
 * Prozesse dasselbe PGlite-Verzeichnis nicht gleichzeitig öffnen dürfen.
 * `location: undefined` bedeutet In-Memory. Auf Vercel gibt es kein
 * beschreibbares Projektverzeichnis: Fehlt dort zur Laufzeit DATABASE_URL,
 * bricht das mit einer klaren Meldung ab, statt `.data/` anlegen zu wollen.
 */
export function resolveDbTarget(
  env: Readonly<Record<string, string | undefined>>,
): DbTarget {
  if (env.DATABASE_URL) return { driver: "pg", url: withVerifiedSsl(env.DATABASE_URL) };
  if (env.NEXT_PHASE === "phase-production-build") {
    return { driver: "pglite", location: undefined };
  }
  if (env.VERCEL) {
    throw new Error(
      "DATABASE_URL fehlt. Auf Vercel braucht die App die Neon-Datenbank (Umgebungsvariable DATABASE_URL).",
    );
  }
  return { driver: "pglite", location: PGLITE_DIRECTORY };
}

/**
 * Neon liefert Adressen mit `sslmode=require`. pg 8 behandelt `require`,
 * `prefer` und `verify-ca` bereits wie `verify-full` (Zertifikat und Hostname
 * werden geprüft), warnt aber bei jedem Verbindungsaufbau, dass pg 9 sie auf
 * die schwächere libpq-Bedeutung umstellt. Hier wird das heutige Verhalten
 * ausdrücklich festgeschrieben. Mit `uselibpqcompat=true` bleibt die Adresse
 * unverändert, dann ist die libpq-Bedeutung gewollt.
 */
export function withVerifiedSsl(url: string): string {
  if (/[?&]uselibpqcompat=true(&|$)/.test(url)) return url;
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/, "$1verify-full");
}
