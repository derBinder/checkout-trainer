# Checkout-Trainer

Deutschsprachige Web-App, mit der Dartspieler Checkout-Wege (Rest 2 bis 170) per Karteikarten lernen: bester Weg, Alternativen, Folgeweg nach Single statt Triple, Bogey-Zahlen. Hauptsächlich am Smartphone genutzt.

@AGENTS.md

Die Datei [AGENTS.md](AGENTS.md) wird von `next dev` bei jedem Start aktualisiert und verweist auf die zur installierten Version passende Next.js-Dokumentation unter `node_modules/next/dist/docs/`. Das Projekt läuft auf Next.js 16: Vor jeder Arbeit an Next.js-Code dort nachlesen, nicht aus der Erinnerung an ältere Versionen arbeiten. Ändert ein Start die Datei, wird sie mit committet.

## Dokumente

- Entwurf: [docs/superpowers/specs/2026-11-11-checkout-trainer-design.md](docs/superpowers/specs/2026-11-11-checkout-trainer-design.md)
- Umsetzungsplan: [docs/superpowers/plans/2026-11-11-checkout-trainer.md](docs/superpowers/plans/2026-11-11-checkout-trainer.md)

## Technik

Next.js 16 (App Router, TypeScript, `src/`), shadcn/ui, lucide-react, Better Auth (E-Mail/Passwort, Admin-Plugin), Drizzle ORM, Postgres (lokal und in Tests PGlite, produktiv Neon über `pg`), ts-fsrs, Vitest, Vercel Web Analytics und Speed Insights (im Root-Layout).

## Befehle

```bash
npm run dev            # Entwicklungsserver
npm test               # Vitest, einmaliger Lauf
npm run test:coverage  # Vitest mit Coverage, bricht unter 80 % im Backend oder Frontend ab
npm run typecheck
npm run lint
npm run build
npm run generate:cards # src/data/cards.generated.json neu erzeugen
npm run db:generate    # Drizzle-Migration aus dem Schema erzeugen
npm run db:migrate
npm run db:seed-admin  # Betreiberkonto aus ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD anlegen
```

Lokal bleibt `DATABASE_URL` leer: Die App nutzt dann PGlite unter `.data/pglite`. Ist die lokale Datenbank beschädigt: `.data/pglite` löschen, dann `db:migrate` und `db:seed-admin`.

### Testkonto für den Browser

- Lokales Konto `testnutzer@checkout-trainer.test` mit Betreiberrolle (sieht alle Tabs inklusive Verwaltung). Passwort in `.data/test-user.json` (gitignored), nie in committete Dateien schreiben.
- Angelegt mit `seedAdmin` aus `src/lib/auth` (Status aktiv, keine Freischaltung nötig). Wird `.data/pglite` gelöscht, ist das Konto weg: neu anlegen und `.data/test-user.json` aktualisieren. PGlite erlaubt nur einen Prozess, dafür den Dev-Server vorher anhalten.
- Ist Port 3000 belegt, über den Launch-Eintrag `checkout-trainer-3001` starten. Er setzt `BETTER_AUTH_URL` auf Port 3001, sonst lehnt Better Auth die Anmeldung mit „Invalid origin" ab.

## Aufbau

- `src/lib/darts/`: Dart-Modell, Aufzählung und Bewertung der Wege, Referenztabelle, Kartenerzeugung. Reine Logik.
- `src/data/cards.generated.json`: erzeugte Karten, committet. Nie von Hand ändern. Ein Test prüft, dass die Datei zum Generator passt.
- `src/lib/db/`: Schema, Datenbankinstanz, Test-Datenbank.
- `src/lib/auth/`: Better-Auth-Konfiguration, Client, Zugriffsschutz.
- `src/lib/srs/`, `src/lib/review/`: Wiederholungslogik (FSRS), Warteschlange, Speichern der Bewertungen.
- `src/app/`: Seiten mit deutschen Routen (`/heute`, `/lernen`, `/statistik`, `/einstellungen`, `/verwaltung`, …).

## Cache Components

- `cacheComponents` ist eingeschaltet: Jede angemeldete Seite liefert sofort ein vorgerendertes Gerüst, die Nutzerdaten kommen hinter Suspense-Grenzen mit Skeletons nach. Nur `/warten` trägt `export const instant = false`.
- `partialPrefetching` bleibt ausgeschaltet. Mit dem Schalter laufen Sitzungsprüfung und Datenabfragen je Seitenaufruf doppelt (gemessen); das Gerüst erscheint auch ohne ihn sofort.
- Nutzerdaten werden nie gecacht: kein `use cache`, `use cache: private` oder `use cache: remote` für Sitzung oder Lerndaten. `React.cache` nur zum Teilen einer Abfrage innerhalb einer Anfrage.
- Jeder Datenbaustein prüft die Sitzung selbst: Der Lader ruft zuerst `requireActiveUser()` bzw. `requireAdmin()` auf, dann erst `new Date()` und die Abfragen. Aufbau je Seite unter `src/components/<bereich>/`: `*-parts` (gemeinsames Layout), `*-data` (Lader und Datenbausteine), `*-skeleton` (Rückfall-Inhalt in `LoadingRegion`).
- Das Gerüst (Seite ohne Datenbausteine, Layout, Skeletons) enthält keine Nutzerdaten und keine Lerninhalte (Wege, Begründungen, Alternativen, Stellwürfe, Karten).
- `src/proxy.ts` ist nur eine Cookie-Vorprüfung ohne Datenbank und ersetzt keine Prüfung. Echte Status-Codes gibt es nur noch aus `proxy.ts` (307 nach `/anmelden` ohne Sitzungs-Cookie). Jede Seite antwortet sonst mit 200; `redirect()` und `notFound()` aus Datenbausteinen kommen als Anweisung im Datenstrom. Ein aktiver Nicht-Betreiber wird von `/verwaltung` nach `/heute` umgeleitet.
- Clientzustand überlebt Seitenwechsel (Activity). Formulare mit Geheimnissen (Passwortfelder, Rückfragen mit Passwort) setzen sich beim Verbergen per `useLayoutEffect`-Cleanup zurück. Die Lernsitzung bekommt je Navigation einen eigenen React-Schlüssel (`bfcacheId`) und startet nach dem Verlassen frisch.

## Regeln

- Oberfläche vollständig auf Deutsch. Keine Emojis. Icons nur aus `lucide-react` und nur, wo sie nötig sind.
- Jede Seite hat eine Aufgabe. Die App muss schnell und übersichtlich bleiben.
- Keine Tailwind-Klassen mit freien Werten in eckigen Klammern (`h-[3px]`, `text-[0.8125rem]`, `shadow-[…]`). Standardklassen der Skala verwenden (`shadow-lg`, `text-sm`). Fehlt ein Wert, einen benannten Token im Tailwind-Theme (`@theme` in `src/app/globals.css`) anlegen und dessen Klasse nutzen. Gilt auch für `src/components/ui/`.
- Für die Reste 41 bis 170 gelten alle Regeln der Referenztabelle (`src/lib/darts/reference.ts`): Variante 1 als bester Weg, Variante 2 als Alternative, die Spalte „mit 2 Darts" und das Zielen zwischen zwei Feldern. Unter 41 gilt das eigene Regelwerk.
- Kein E-Mail-Versand. Konten werden vom Betreiber manuell freigeschaltet.
- Alles muss in kostenlosen Tarifen bleiben (Vercel Hobby, Neon Free).
- Kein Zugriff auf Vercel, Neon oder andere fremde Dienste ohne vorherige Absprache mit dem Auftraggeber.
- Git: nur lokal committen, nie pushen. Keine Attributionszeilen in Commit-Nachrichten.
- `src/lib/db/schema.ts` von Hand pflegen und Migrationen mit `db:generate` erzeugen. Den Better-Auth-CLI-Generator nicht in diese Datei schreiben lassen, er überschreibt die Handänderungen.
- Tests zuerst schreiben. Vor jedem Commit: `npm test`, `npm run typecheck`, `npm run lint`.
- Testabdeckung mindestens 80 % (Zeilen, Anweisungen, Zweige, Funktionen), getrennt für Backend (`src/lib`, `src/proxy.ts`, `src/app/api`, `src/app/**/*.ts`) und Frontend (`src/components`, `src/app/**/*.tsx`). Die Schwellen stehen in `vitest.config.ts`; `npm run test:coverage` muss vor jedem Commit durchlaufen. Neuer Code bringt seine Tests mit, die Schwellen werden nicht gesenkt.
- Komponententests als `*.test.tsx` mit `// @vitest-environment jsdom` in der ersten Zeile, Testing Library und user-event. Geprüft wird sichtbares Verhalten (Rollen, Beschriftungen, Texte), nicht der Aufbau.

## Pakete installieren

Auf diesem Rechner läuft Safe-chain und blendet Paketversionen aus, die jünger als ein Mindestalter sind. `@latest` und `@canary` liefern deshalb nicht die tatsächlich neueste Version, Canary-Versionen sind gar nicht installierbar. Versionen ausdrücklich angeben und die Prüfung nicht ohne Zustimmung des Auftraggebers überspringen.
