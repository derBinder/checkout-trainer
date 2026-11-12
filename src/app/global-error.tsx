"use client";

import { useEffect, useSyncExternalStore } from "react";
import { localeFromLocation } from "@/i18n/client";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { localePath, ROUTES } from "@/i18n/paths";
import "./globals.css";

/**
 * Letzter Rückfall, wenn selbst das Root-Layout scheitert. Ersetzt das ganze
 * Dokument: kein Layout, keine Schrift, keine feste Farbwahl aus den Einstellungen
 * (die Farben folgen dem System). Deshalb nur einfache Elemente. Die Sprache kommt
 * aus der Adresse, nicht aus dem Provider des Layouts.
 */
const noSubscribe = () => () => {};

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Auf dem Server und beim Hydrieren gilt die Vorgabe, danach die Sprache der Adresse.
  const locale = useSyncExternalStore(noSubscribe, localeFromLocation, () => DEFAULT_LOCALE);
  const t = DICTIONARIES[locale].errors;
  return (
    // lang kann nach dem Hydrieren von der Vorgabe abweichen, daher suppressHydrationWarning.
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <title>{`${t.metaTitle}${DICTIONARIES[locale].common.titleSuffix}`}</title>
        <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-page py-16">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">
            {t.description}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="h-13 rounded-pill bg-primary px-6 font-semibold text-primary-foreground"
          >
            {t.retry}
          </button>
          {/* Bewusst ein normaler Link: lädt die Seite ganz neu. */}
          <a href={localePath(locale, ROUTES.today)} className="text-center font-semibold underline underline-offset-4">
            {t.toOverview}
          </a>
        </main>
      </body>
    </html>
  );
}
