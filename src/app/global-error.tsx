"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Letzter Rückfall, wenn selbst das Root-Layout scheitert. Ersetzt das ganze
 * Dokument: kein Layout, keine Schrift, keine feste Farbwahl aus den Einstellungen
 * (die Farben folgen dem System). Deshalb nur einfache Elemente.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <title>Fehler · Checkout-Trainer</title>
        <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-page py-16">
          <h1 className="text-2xl font-bold">Das hat nicht geklappt.</h1>
          <p className="text-muted-foreground">
            Die Seite konnte nicht geladen werden. Versuche es gleich noch einmal.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="h-13 rounded-pill bg-primary px-6 font-semibold text-primary-foreground"
          >
            Erneut versuchen
          </button>
          {/* Bewusst ein normaler Link: lädt die Seite ganz neu. */}
          <a href="/heute" className="text-center font-semibold underline underline-offset-4">
            Zur Übersicht
          </a>
        </main>
      </body>
    </html>
  );
}
