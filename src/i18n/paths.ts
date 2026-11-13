/**
 * Seitenpfade mit Sprache als erstem Segment (`/de/today`). Die Seitennamen
 * sind in beiden Sprachen gleich. Reine Logik, in Client und Server nutzbar.
 */

import { isLocale, type Locale } from "./locales";

export const ROUTES = {
  home: "",
  signIn: "/sign-in",
  signUp: "/sign-up",
  pending: "/pending",
  today: "/today",
  study: "/study",
  practice: "/practice",
  stats: "/stats",
  settings: "/settings",
  admin: "/admin",
  imprint: "/imprint",
  privacy: "/privacy",
} as const;
export type Route = (typeof ROUTES)[keyof typeof ROUTES];

export function localePath(locale: Locale, route: Route): string {
  return `/${locale}${route}`;
}

/** Trennt die Sprache ab; erkannt wird nur ein ganzes erstes Segment. */
export function splitLocale(pathname: string): { locale: Locale | null; rest: string } {
  const [, first = "", ...others] = pathname.split("/");
  if (isLocale(first)) {
    return { locale: first, rest: others.length > 0 ? `/${others.join("/")}` : "" };
  }
  return { locale: null, rest: pathname === "/" ? "" : pathname };
}

export function switchLocalePath(pathname: string, to: Locale): string {
  return `/${to}${splitLocale(pathname).rest}`;
}
