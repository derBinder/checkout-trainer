// Reine Logik ohne Next-Importe: Grundlage der Vorprüfung in src/proxy.ts.

import { type Locale, pickLocale } from "@/i18n/locales";
import { localePath, ROUTES, splitLocale } from "@/i18n/paths";

/** Die Bereiche, die eine Anmeldung brauchen, ohne Sprache (/pending: wartende und gesperrte Konten). */
export const PROTECTED_ROUTES = [
  ROUTES.today,
  ROUTES.study,
  ROUTES.practice,
  ROUTES.stats,
  ROUTES.settings,
  ROUTES.admin,
  ROUTES.pending,
] as const;

/** Pfad ohne Sprache; exakter Treffer oder Unterpfad, also nicht `/todayx` für `/today`. */
export function isProtectedPath(rest: string): boolean {
  return PROTECTED_ROUTES.some((route) => rest === route || rest.startsWith(`${route}/`));
}

/** Alles außer api, _next und Dateien mit Endung. Der Matcher in src/proxy.ts nennt denselben Ausdruck. */
export const PROXY_MATCHER = "/((?!api|_next|.*\\..*).*)";

export type ProxyDecision =
  | { type: "redirect"; location: string }
  | { type: "next"; locale: Locale | null };

/**
 * Erst die Sprache, dann die Anmeldung. Ohne Sprache im Pfad wird auf
 * `/<Sprache>` + Pfad umgeleitet, ohne die Anmeldung zu prüfen (das erledigt
 * der nächste Aufruf). Die Anmeldung ist nur Komfort, kein Schutz: Ein Cookie
 * sagt nichts über eine gültige Sitzung oder den Kontostatus, das prüfen
 * requireActiveUser() und requireAdmin(). Nur Seitenaufrufe (GET, HEAD) werden
 * umgeleitet; Server Actions kommen als POST und antworten selbst.
 */
export function proxyDecision(req: {
  method: string;
  pathname: string;
  hasSessionCookie: boolean;
  cookieLocale: string | null;
  acceptLanguage: string | null;
}): ProxyDecision {
  const { locale, rest } = splitLocale(req.pathname);
  const isPageRequest = req.method === "GET" || req.method === "HEAD";
  if (locale === null) {
    if (!isPageRequest) return { type: "next", locale: null };
    const picked = pickLocale({ cookie: req.cookieLocale, acceptLanguage: req.acceptLanguage });
    return { type: "redirect", location: `/${picked}${rest}` };
  }
  if (isPageRequest && !req.hasSessionCookie && isProtectedPath(rest)) {
    return { type: "redirect", location: localePath(locale, ROUTES.signIn) };
  }
  return { type: "next", locale };
}
