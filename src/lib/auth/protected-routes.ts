// Reine Logik ohne Next-Importe: Grundlage der Vorprüfung in src/proxy.ts.

/** Die Bereiche, die eine Anmeldung brauchen (/warten: wartende und gesperrte Konten). Der Matcher in src/proxy.ts muss dieselben nennen. */
export const PROTECTED_PREFIXES = [
  "/heute",
  "/lernen",
  "/statistik",
  "/einstellungen",
  "/verwaltung",
  "/warten",
] as const satisfies readonly string[];

/** Exakter Treffer oder Unterpfad, also nicht `/heutemorgen` für `/heute`. */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Nur Komfort, kein Schutz: Ein vorhandenes Cookie sagt nichts über eine gültige
 * Sitzung oder den Kontostatus. Das prüfen requireActiveUser() und requireAdmin().
 */
export function needsLoginRedirect(pathname: string, hasSessionCookie: boolean): boolean {
  return !hasSessionCookie && isProtectedPath(pathname);
}
