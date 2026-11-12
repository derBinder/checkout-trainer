/**
 * Sprache und Wörterbuch auf dem Server. Seiten und Server Components lesen die
 * Sprache aus dem ersten URL-Segment (`next/root-params`); Server Actions und
 * Route Handler kennen keine Root-Params und lesen den Header von proxy.ts.
 * Ohne `server-only`: `next/root-params` lässt sich ohnehin nur auf dem Server
 * importieren.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { dictionaryFor, type Dictionary } from "./dictionaries";
import { isLocale, LOCALE_HEADER, type Locale } from "./locales";
import { localePath, ROUTES, type Route } from "./paths";

/** Sprache der aktuellen Seite; eine unbekannte Sprache im Pfad ergibt 404. */
export async function getLocale(): Promise<Locale> {
  const value: unknown = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaryFor(await getLocale());
}

/** Sprache aus dem Header von proxy.ts, auch in Server Actions; `null` ohne gültigen Header. */
export async function requestLocale(): Promise<Locale | null> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : null;
}

/**
 * Ziel einer Umleitung aus Zugriffsprüfung oder Server Action, in der Sprache der
 * Anfrage. Ohne Header bleibt die Sprache weg (`/sign-in`, `/`), proxy.ts ergänzt
 * sie beim nächsten Aufruf.
 */
export async function localeRedirectPath(route: Route): Promise<string> {
  const locale = await requestLocale();
  if (locale !== null) return localePath(locale, route);
  return route === ROUTES.home ? "/" : route;
}
