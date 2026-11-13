import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER } from "@/i18n/locales";
import { splitLocale } from "@/i18n/paths";
import { proxyDecision } from "@/lib/auth/protected-routes";

/**
 * Schnelle Vorprüfung vor dem Ausliefern der Seite: Erst bekommt ein Pfad ohne
 * Sprache die Sprache vorangestellt, dann geht ein Seitenaufruf ohne
 * Sitzungs-Cookie sofort zur Anmeldung. Server Actions (POST) laufen durch und
 * prüfen selbst. Nur hier entsteht noch ein echter Status-Code, Umleitungen aus
 * Seiten kommen mit Cache Components im Datenstrom.
 * Keine Datenbank, keine Sitzungsprüfung. Den Zugriff schützen weiterhin
 * requireActiveUser() und requireAdmin().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const decision = proxyDecision({
    method: request.method,
    pathname,
    hasSessionCookie: getSessionCookie(request) !== null,
    cookieLocale: request.cookies.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: request.headers.get("accept-language"),
  });

  if (decision.type === "redirect") {
    // Beim Ergänzen der Sprache bleiben die Suchparameter erhalten; die
    // Anmeldung beginnt ohne sie.
    const addsLocale = splitLocale(pathname).locale === null;
    const location = addsLocale ? decision.location + search : decision.location;
    return NextResponse.redirect(new URL(location, request.url));
  }

  // Server Actions kennen keine Root-Params: Sie lesen die Sprache aus diesem
  // Header (requestLocale in src/i18n/server.ts). Ein vom Client mitgeschickter
  // Wert wird immer entfernt; gesetzt wird er nur bei einem Pfad mit Sprache.
  const headers = new Headers(request.headers);
  headers.delete(LOCALE_HEADER);
  if (decision.locale !== null) headers.set(LOCALE_HEADER, decision.locale);
  return NextResponse.next({ request: { headers } });
}

// Muss konstant sein (wird beim Build statisch gelesen); entspricht PROXY_MATCHER.
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
