# Checkout-Trainer

Deutschsprachige Web-App, mit der Dartspieler Checkout-Wege (Rest 2 bis 170) per Karteikarten lernen: bester Weg, Alternativen, Folgeweg nach Single statt Triple, Bogey-Zahlen. Hauptsächlich am Smartphone genutzt.

@AGENTS.md

Die Datei [AGENTS.md](AGENTS.md) wird von `next dev` bei jedem Start aktualisiert und verweist auf die zur installierten Version passende Next.js-Dokumentation unter `node_modules/next/dist/docs/`. Das Projekt läuft auf Next.js 16: Vor jeder Arbeit an Next.js-Code dort nachlesen, nicht aus der Erinnerung an ältere Versionen arbeiten. Ändert ein Start die Datei, wird sie mit committet.

## Dokumente

- Entwurf: [docs/superpowers/specs/2026-11-11-checkout-trainer-design.md](docs/superpowers/specs/2026-11-11-checkout-trainer-design.md)
- Umsetzungsplan: [docs/superpowers/plans/2026-11-11-checkout-trainer.md](docs/superpowers/plans/2026-11-11-checkout-trainer.md)

## Technik

Next.js 16 (App Router, TypeScript, `src/`), shadcn/ui, lucide-react, Better Auth (E-Mail/Passwort, Admin-Plugin), Drizzle ORM, Postgres (lokal und in Tests PGlite, produktiv Neon über `pg`), ts-fsrs, Vitest.

## Befehle

```bash
npm run dev            # Entwicklungsserver
npm test               # Vitest, einmaliger Lauf
npm run typecheck
npm run lint
npm run build
npm run generate:cards # src/data/cards.generated.json neu erzeugen
npm run db:generate    # Drizzle-Migration aus dem Schema erzeugen
npm run db:migrate
npm run db:seed-admin  # Betreiberkonto aus ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD anlegen
```

Lokal bleibt `DATABASE_URL` leer: Die App nutzt dann PGlite unter `.data/pglite`. Ist die lokale Datenbank beschädigt: `.data/pglite` löschen, dann `db:migrate` und `db:seed-admin`.

## Aufbau

- `src/lib/darts/`: Dart-Modell, Aufzählung und Bewertung der Wege, Referenztabelle, Kartenerzeugung. Reine Logik.
- `src/data/cards.generated.json`: erzeugte Karten, committet. Nie von Hand ändern. Ein Test prüft, dass die Datei zum Generator passt.
- `src/lib/db/`: Schema, Datenbankinstanz, Test-Datenbank.
- `src/lib/auth/`: Better-Auth-Konfiguration, Client, Zugriffsschutz.
- `src/lib/srs/`, `src/lib/review/`: Wiederholungslogik (FSRS), Warteschlange, Speichern der Bewertungen.
- `src/app/`: Seiten mit deutschen Routen (`/heute`, `/lernen`, `/statistik`, `/einstellungen`, `/verwaltung`, …).

## Regeln

- Oberfläche vollständig auf Deutsch. Keine Emojis. Icons nur aus `lucide-react` und nur, wo sie nötig sind.
- Jede Seite hat eine Aufgabe. Die App muss schnell und übersichtlich bleiben.
- Für die Reste 41 bis 170 gelten alle Regeln der Referenztabelle (`src/lib/darts/reference.ts`): Variante 1 als bester Weg, Variante 2 als Alternative, die Spalte „mit 2 Darts" und das Zielen zwischen zwei Feldern. Unter 41 gilt das eigene Regelwerk.
- Kein E-Mail-Versand. Konten werden vom Betreiber manuell freigeschaltet.
- Alles muss in kostenlosen Tarifen bleiben (Vercel Hobby, Neon Free).
- Kein Zugriff auf Vercel, Neon oder andere fremde Dienste ohne vorherige Absprache mit dem Auftraggeber.
- Git: nur lokal committen, nie pushen. Keine Attributionszeilen in Commit-Nachrichten.
- `src/lib/db/schema.ts` von Hand pflegen und Migrationen mit `db:generate` erzeugen. Den Better-Auth-CLI-Generator nicht in diese Datei schreiben lassen, er überschreibt die Handänderungen.
- Tests zuerst schreiben. Vor jedem Commit: `npm test`, `npm run typecheck`, `npm run lint`.

## Pakete installieren

Auf diesem Rechner läuft Safe-chain und blendet Paketversionen aus, die jünger als ein Mindestalter sind. `@latest` und `@canary` liefern deshalb nicht die tatsächlich neueste Version, Canary-Versionen sind gar nicht installierbar. Versionen ausdrücklich angeben und die Prüfung nicht ohne Zustimmung des Auftraggebers überspringen.
