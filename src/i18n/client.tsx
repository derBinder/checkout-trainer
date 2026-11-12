"use client";

/**
 * Sprache und Wörterbuch in Client-Komponenten. Das Root-Layout setzt den
 * Provider mit der Sprache aus der URL. Beide Wörterbücher liegen im
 * Client-Bundle, weil Funktionswerte nicht vom Server serialisierbar sind.
 */

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { DICTIONARIES, type Dictionary } from "./dictionaries";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { localePath, splitLocale, type Route } from "./paths";

const LocaleContext = createContext<Locale | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (locale === null) throw new Error("useLocale() braucht einen I18nProvider.");
  return locale;
}

export function useDictionary(): Dictionary {
  return DICTIONARIES[useLocale()];
}

/** Pfad einer Seite in der Sprache der aktuellen Seite. */
export function useLocalePath(): (route: Route) => string {
  const locale = useLocale();
  return useCallback((route: Route) => localePath(locale, route), [locale]);
}

/**
 * Sprache aus der Adresse des Fensters, für global-error.tsx: Die Seite ersetzt das
 * Root-Layout und liegt damit außerhalb des Providers. Ohne Sprache im Pfad (oder
 * ohne Fenster, beim Rendern auf dem Server) gilt die Vorgabe.
 */
export function localeFromLocation(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return splitLocale(window.location.pathname).locale ?? DEFAULT_LOCALE;
}
