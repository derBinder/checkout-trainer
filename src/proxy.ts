import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { needsLoginRedirect } from "@/lib/auth/protected-routes";

/**
 * Schnelle Vorprüfung vor dem Ausliefern der Seite: Fehlt das Sitzungs-Cookie,
 * geht ein Seitenaufruf sofort zur Anmeldung. Server Actions (POST) laufen durch
 * und prüfen selbst. Nur hier entsteht noch ein echter Status-Code, Umleitungen
 * aus Seiten kommen mit Cache Components im Datenstrom.
 * Keine Datenbank, keine Sitzungsprüfung. Den Zugriff schützen weiterhin
 * requireActiveUser() und requireAdmin().
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = getSessionCookie(request) !== null;
  if (needsLoginRedirect(request.method, request.nextUrl.pathname, hasSessionCookie)) {
    return NextResponse.redirect(new URL("/anmelden", request.url));
  }
  return NextResponse.next();
}

// Muss konstant sein (wird beim Build statisch gelesen); entspricht PROTECTED_PREFIXES.
export const config = {
  matcher: [
    "/heute/:path*",
    "/lernen/:path*",
    "/statistik/:path*",
    "/einstellungen/:path*",
    "/verwaltung/:path*",
    "/warten/:path*",
  ],
};
