# Checkout-Trainer

Zweisprachige Web-App (Deutsch und Englisch), mit der Dartspieler Checkout-Wege (Rest 2 bis 170) per Karteikarten lernen: bester Weg, Alternativen, Folgeweg nach Single statt Triple, Bogey-Zahlen. Hauptsächlich am Smartphone genutzt.

@AGENTS.md

Die Datei [AGENTS.md](AGENTS.md) wird von `next dev` bei jedem Start aktualisiert und verweist auf die zur installierten Version passende Next.js-Dokumentation unter `node_modules/next/dist/docs/`. Das Projekt läuft auf Next.js 16: Vor jeder Arbeit an Next.js-Code dort nachlesen, nicht aus der Erinnerung an ältere Versionen arbeiten. Ändert ein Start die Datei, wird sie mit committet.

## Dokumente

- Entwurf: [docs/superpowers/specs/2026-11-11-checkout-trainer-design.md](docs/superpowers/specs/2026-11-11-checkout-trainer-design.md)
- Umsetzungsplan: [docs/superpowers/plans/2026-11-11-checkout-trainer.md](docs/superpowers/plans/2026-11-11-checkout-trainer.md)
- Entwurf Mehrsprachigkeit: [docs/superpowers/specs/2026-11-12-mehrsprachigkeit-design.md](docs/superpowers/specs/2026-11-12-mehrsprachigkeit-design.md)
- Umsetzungsplan Mehrsprachigkeit: [docs/superpowers/plans/2026-11-12-mehrsprachigkeit.md](docs/superpowers/plans/2026-11-12-mehrsprachigkeit.md)

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
- `src/app/[lang]/`: alle Seiten unter dem Sprachsegment (`/de/…`, `/en/…`) mit englischen Seitennamen (`/today`, `/study`, `/stats`, `/settings`, `/admin`, `/pending`, `/sign-in`, `/sign-up`, `/imprint`, `/privacy`); die Startseite ist `/de` bzw. `/en`.
- `src/i18n/`: `locales.ts` (Sprachen), `paths.ts` (Sprachpfade), `dictionaries/` (`de.ts` als Quelle des Typs `Dictionary`, `en.ts`), `dictionaries/index.ts` (`DICTIONARIES`), `server.ts` (`getDictionary()`, `getLocale()`, `requestLocale()`, `localeRedirectPath()`), `client.tsx` (`useDictionary()`, `useLocale()`, `useLocalePath()`). Der Test `no-hardcoded-text.test.ts` schlägt bei harten Texten in der Oberfläche an.
- Umleitungen in Server Actions und Zugriffsprüfungen nur über `localeRedirectPath()`; ein nacktes `redirect('/today')` wechselt still die Sprache.

## Cache Components

- `cacheComponents` ist eingeschaltet: Jede angemeldete Seite liefert sofort ein vorgerendertes Gerüst, die Nutzerdaten kommen hinter Suspense-Grenzen mit Skeletons nach. Nur `/pending` trägt `export const instant = false`.
- `partialPrefetching` bleibt ausgeschaltet. Mit dem Schalter laufen Sitzungsprüfung und Datenabfragen je Seitenaufruf doppelt (gemessen); das Gerüst erscheint auch ohne ihn sofort.
- Nutzerdaten werden nie gecacht: kein `use cache`, `use cache: private` oder `use cache: remote` für Sitzung oder Lerndaten. `React.cache` nur zum Teilen einer Abfrage innerhalb einer Anfrage.
- Jeder Datenbaustein prüft die Sitzung selbst: Der Lader ruft zuerst `requireActiveUser()` bzw. `requireAdmin()` auf, dann erst `new Date()` und die Abfragen. Aufbau je Seite unter `src/components/<bereich>/`: `*-parts` (gemeinsames Layout), `*-data` (Lader und Datenbausteine), `*-skeleton` (Rückfall-Inhalt in `LoadingRegion`).
- Das Gerüst (Seite ohne Datenbausteine, Layout, Skeletons) enthält keine Nutzerdaten und keine Lerninhalte (Wege, Begründungen, Alternativen, Stellwürfe, Karten).
- `src/proxy.ts` ist nur eine Cookie-Vorprüfung ohne Datenbank und ersetzt keine Prüfung. Echte Status-Codes gibt es nur noch aus `proxy.ts` (307 nach `/<lang>/sign-in` ohne Sitzungs-Cookie). Jede Seite antwortet sonst mit 200; `redirect()` und `notFound()` aus Datenbausteinen kommen als Anweisung im Datenstrom. Ein aktiver Nicht-Betreiber wird von `/<lang>/admin` nach `/<lang>/today` umgeleitet.
- `proxy.ts` leitet außerdem Adressen ohne Sprache auf `/<lang>/…` um (307): Sprache aus dem Cookie `lang`, dann aus `Accept-Language`, sonst Englisch. Es setzt `x-locale` für die Seite. Der Sprachumschalter lädt die Seite vollständig neu.
- Clientzustand überlebt Seitenwechsel (Activity). Formulare mit Geheimnissen (Passwortfelder, Rückfragen mit Passwort) setzen sich beim Verbergen per `useLayoutEffect`-Cleanup zurück. Die Lernsitzung bekommt je Navigation einen eigenen React-Schlüssel (`bfcacheId`) und startet nach dem Verlassen frisch.

## Regeln

- Oberfläche vollständig auf Deutsch und Englisch, alle Texte in `src/i18n/dictionaries/`. Keine Emojis. Icons nur aus `lucide-react` und nur, wo sie nötig sind.
- Jede Seite hat eine Aufgabe. Die App muss schnell und übersichtlich bleiben.
- Keine Tailwind-Klassen mit freien Werten in eckigen Klammern (`h-[3px]`, `text-[0.8125rem]`, `shadow-[…]`). Standardklassen der Skala verwenden (`shadow-lg`, `text-sm`). Fehlt ein Wert, einen benannten Token im Tailwind-Theme (`@theme` in `src/app/globals.css`) anlegen und dessen Klasse nutzen. Gilt auch für `src/components/ui/`.
- Für die Reste 41 bis 170 gelten alle Regeln der Referenztabelle (`src/lib/darts/reference.ts`): Variante 1 als bester Weg, Variante 2 als Alternative, die Spalte „mit 2 Darts" und das Zielen zwischen zwei Feldern. Unter 41 gilt das eigene Regelwerk.
- Kein E-Mail-Versand. Konten werden vom Betreiber manuell freigeschaltet.
- Alles muss in kostenlosen Tarifen bleiben (Vercel Hobby, Neon Free).
- Kein Zugriff auf Vercel, Neon oder andere fremde Dienste ohne vorherige Absprache mit dem Auftraggeber. Ausnahme: Prod-Deploy sowie Issues, Labels, PRs, Merges, Releases mit Tags und Push von Feature-, Release- und Hotfix-Branches auf GitHub im Abschnitt „Ablauf bis Produktion“, all das hat der Auftraggeber dauerhaft freigegeben.
- Git und GitHub: Remote `origin` ist `git@github-privat:derBinder/checkout-trainer.git` (SSH-Alias `github-privat` mit eigenem Schlüssel). Jeden `gh`-Befehl mit `GH_TOKEN=$(gh auth token --user derBinder)` davor ausführen, das aktive `gh`-Konto kann ein anderes sein. Branch-Modell ist Git-Flow (Abschnitt „Ablauf bis Produktion“). Gepusht werden nur `feature/…`, `release/…` und `hotfix/…` für PRs. `develop` und `main` ändern sich nur durch Merges von PRs auf GitHub (Merge-Commit, kein Squash), lokal werden sie nur nachgezogen (`git pull --ff-only`). Tags entstehen nur über `gh release create`, nie per `git push`. Kein Force-Push. Keine Attributionszeilen in Commits, PRs und Issues.
- Alle Texte auf GitHub sind auf Englisch: Issues (Titel und Text), PRs und Release-PRs, Kommentare, Labels und deren Beschreibungen. Commit-Nachrichten und Branch-Namen ebenso. Entwürfe und Pläne unter `docs/` bleiben auf Deutsch.
- Merge-Konflikte (etwa beim Nachziehen von `develop` in einen Branch) immer mit dem Skill `resolving-merge-conflicts` lösen (`/resolving-merge-conflicts`), nie von Hand oder per Skript. Das Ergebnis danach wie jeden Commit prüfen (`npm run test:coverage`, `npm run typecheck`, `npm run lint`).
- `src/lib/db/schema.ts` von Hand pflegen und Migrationen mit `db:generate` erzeugen. Den Better-Auth-CLI-Generator nicht in diese Datei schreiben lassen, er überschreibt die Handänderungen.
- Tests zuerst schreiben. Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`.
- Testabdeckung mindestens 80 % (Zeilen, Anweisungen, Zweige, Funktionen), getrennt für Backend (`src/lib`, `src/proxy.ts`, `src/app/api`, `src/app/**/*.ts`) und Frontend (`src/components`, `src/app/**/*.tsx`). Die Schwellen stehen in `vitest.config.ts`. Neuer Code bringt seine Tests mit, die Schwellen werden nicht gesenkt.
- Komponententests als `*.test.tsx` mit `// @vitest-environment jsdom` in der ersten Zeile und Testing Library. Eingaben mit user-event; `fireEvent` nur, wo user-event nicht passt (etwa mit nachgebildeter Uhr in der Lernsitzung, deren Tippschutz kurz aufeinanderfolgende Tipps verwirft). Geprüft wird sichtbares Verhalten (Rollen, Beschriftungen, Texte), nicht der Aufbau.

## Ablauf bis Produktion

Der Auftraggeber hat diesen Ablauf dauerhaft freigegeben und will ihn nicht jedes Mal nennen. Gilt für jede abgeschlossene Änderung, sofern er nichts anderes sagt. Branch-Modell ist Git-Flow:

- `main`: nur veröffentlichte Stände, jeder mit Tag `v<version>`. Aus `main` wird deployt.
- `develop`: Standard- und Integrations-Branch auf GitHub.
- `feature/<nr>-<kurzname>` aus `develop`, zurück per PR nach `develop`.
- `release/<version>` aus `develop`, per PR nach `main` und danach nach `develop`.
- `hotfix/<version>` aus `main`, per PR nach `main` und danach nach `develop`.

Versionen nach SemVer (`package.json`): Ein Release mit neuer Funktion erhöht die mittlere Stelle (`0.2.0` → `0.3.0`), ein Release nur mit Fehlerbehebungen und jeder Hotfix die letzte (`0.2.0` → `0.2.1`). Jede abgeschlossene Änderung geht wie bisher gleich live: Nach dem Feature folgt direkt ein Release, außer der Auftraggeber will Features sammeln.

### Feature

1. **Issue.** Jede Änderung hat ein Issue in `derBinder/checkout-trainer` (auf Englisch: Was und Warum, Label `bug`, `enhancement` oder `documentation`). Nennt der Auftraggeber den Auftrag im Chat, legt Claude das Issue an.
2. **Branch.** `feature/<nr>-<kurzname>` mit englischem Kurznamen (etwa `feature/12-streak-pause`) aus dem aktuellen `origin/develop`: `git fetch origin`, dann `git worktree add --no-track -b feature/<nr>-<kurzname> .claude/worktrees/<nr>-<kurzname> origin/develop`. Nie direkt auf `develop` oder `main`.
3. **Arbeit.** Tests zuerst. Vor jedem Commit `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Größere Funktionen: Entwurf und Plan (Superpowers, `docs/superpowers/`) auf dem Feature-Branch, sie kommen mit dem Code in denselben PR. Bei `finishing-a-development-branch` immer Push und PR nach `develop`, ohne Rückfrage.
4. **PR nach `develop`.** Branch pushen (`git push -u origin feature/<nr>-<kurzname>`), PR öffnen, alles auf Englisch. Titel wie die Commit-Nachricht, Text: was sich ändert, wie geprüft, Hinweis auf eine Migration, `Refs #<nr>`. Nie Schlüsselwörter wie `Closes`, `Fixes` oder `Resolves` vor einer Issue-Nummer, weder im PR-Text noch in Commit-Nachrichten: `develop` ist der Standard-Branch, ein solches Wort schlösse das Issue schon beim Merge nach `develop`, bevor die Änderung live ist. Geschlossen wird nach dem Deploy per `gh`.
5. **Code-Review.** Vor dem Merge läuft `/code-review` mit Stufe `high` (Skill `code-review`) im Worktree des Branches, nach `git fetch origin`, mit den Argumenten `high origin/develop...HEAD`. Umfang ist genau der Diff gegen `origin/develop`; nie `@{upstream}`, das ist nach dem Push der Branch selbst und ergibt einen leeren Diff. Gibt es Findings, legt Claude sie dem Auftraggeber vor und wartet auf seine Entscheidung, welche behoben werden. Behobene Findings kommen als neuer Commit auf den Branch. Danach läuft das Review erneut, nur über die Korrektur-Commits: `git log --first-parent --no-merges --format=%h <Commit vor den Korrekturen>..HEAD` listet sie (`--first-parent` bleibt auf der Linie des Branches, sonst erscheinen die Commits aus einem Merge von `develop` mit). Liegt kein Merge im Bereich, `high <Commit vor den Korrekturen>..HEAD`, sonst jeden Korrektur-Commit einzeln (`high <sha>^..<sha>`). Neue Findings gehen wieder an den Auftraggeber. Dann erneut Prüfungen und CI. Ohne Findings das Ergebnis melden und weiter.
6. **CI und Merge.** Der Workflow `CI` (`.github/workflows/ci.yml`) muss grün sein (`gh pr checks <pr> --watch`, nur Exit-Code 0 zählt). Nie rot mergen, nie ohne CI, nie ohne Review aus Schritt 5. Dann mergt Claude selbst mit `gh pr merge <pr> -R derBinder/checkout-trainer --merge --delete-branch`; mit `-R` löscht `gh` nur den Branch auf GitHub und lässt den lokalen Worktree in Ruhe. Worktree und lokalen Branch danach aus dem Hauptverzeichnis entfernen (`git worktree remove .claude/worktrees/<nr>-<kurzname>`, `git branch -D feature/<nr>-<kurzname>`). Ausnahme: Das Issue trägt das Label `review` oder der Auftraggeber hat „erst zeigen“ gesagt, dann nach dem Öffnen des PRs auf sein OK warten.

### Release

7. **Release-Branch.** Direkt nach dem Feature: Version nach SemVer festlegen (neue Funktion im Release: mittlere Stelle, nur Fehlerbehebungen: letzte Stelle). `git fetch origin`, `git worktree add --no-track -b release/<version> .claude/worktrees/release-<version> origin/develop`, darin `npm version <version> --no-git-tag-version` (ändert `package.json` und `package-lock.json`), Prüfungen, Commit `chore: release <version>`, `git push -u origin release/<version>`. Ein Release-Branch bekommt sonst nur Fehlerbehebungen für genau diesen Release, keine neuen Funktionen.
8. **PR nach `main`.** Titel `Release <version>`, Text auf Englisch mit den enthaltenen PRs und `Refs #<nr>` je Issue (ohne schließende Schlüsselwörter). Kein eigenes Code-Review, der Inhalt ist schon in den Feature-PRs geprüft; enthält der Release-Branch eigene Fehlerbehebungen, laufen diese Commits durch Schritt 5 (`high origin/develop...HEAD`). CI abwarten, mit Merge-Commit mergen, Branch noch nicht löschen (`gh pr merge <pr> -R derBinder/checkout-trainer --merge`).
9. **Tag und GitHub-Release.** `gh release create v<version> -R derBinder/checkout-trainer --target main --title "v<version>" --notes "<englische Zusammenfassung, Refs #<nr>>"`. Danach im Hauptverzeichnis (`main`, sauber) `git pull --ff-only origin main` und `git fetch --tags origin`.
10. **Migrationen.** Bringt der Release eine Migration mit, vor dem Deploy die erzeugte SQL-Datei prüfen: Sie läuft beim Prod-Bau automatisch auf Neon (`scripts/vercel-build.sh`), aber erst nach erfolgreichem `next build`. Sie bleibt trotzdem additiv (erst erweitern, später aufräumen), weil zwischen Migration und Freischaltung der neuen Version noch kurz der alte Code läuft.
11. **Deploy.** `npx vercel@65.12.1 deploy --prod` aus dem Hauptverzeichnis (CLI, ohne Git-Anbindung, siehe [docs/bereitstellung.md](docs/bereitstellung.md)). Entscheidend ist, was der Release nach `main` bringt: `git diff --name-only <main vor dem Pull> origin/main`. Ändert er außer `package.json` und `package-lock.json` (Versionsnummer) nur Dateien unter `docs/`, `.github/` oder `*.md`, entfällt der Deploy, sonst nicht. Nach einem Deploy prüfen, dass die Produktionsadresse antwortet.
12. **Zurück nach `develop`.** PR `release/<version>` → `develop`, Titel `Merge release <version> into develop`. Kein Code-Review (gleicher Inhalt wie Schritt 8). CI abwarten, mit `--merge --delete-branch` mergen, Worktree und lokalen Branch aus dem Hauptverzeichnis entfernen, `git fetch origin develop:develop`. Konflikte (weil `develop` inzwischen weiter ist) mit `/resolving-merge-conflicts` auf dem Release-Branch lösen.
13. **Issues schließen.** Jedes Issue des Release: `gh issue close <nr> -R derBinder/checkout-trainer --comment "Released in v<version> (#<pr>) and deployed to production."`, ohne Deploy mit `--comment "Released in v<version> (#<pr>); no deploy needed (docs/CI only)."`. Ein geschlossenes Issue heißt: Die Änderung ist live. Danach Ergebnis melden (Issue, PRs, Version, Deploy oder warum keiner nötig war).

### Hotfix

Nur für Fehler in der Produktion, die nicht auf den nächsten regulären Release warten sollen. Issue wie Schritt 1, dann `hotfix/<version>` (letzte Stelle erhöht) aus `origin/main` im Worktree `.claude/worktrees/hotfix-<version>`. Fix mit Tests, `npm version <version> --no-git-tag-version`, Prüfungen, Commit, Push. PR nach `main` mit Code-Review wie Schritt 5, aber gegen `origin/main` (`high origin/main...HEAD`), Findings an den Auftraggeber, CI, Merge. Dann Schritte 9 bis 13 mit dem Hotfix-Branch statt des Release-Branches.

## Pakete installieren

Auf diesem Rechner läuft Safe-chain und blendet Paketversionen aus, die jünger als ein Mindestalter sind. `@latest` und `@canary` liefern deshalb nicht die tatsächlich neueste Version, Canary-Versionen sind gar nicht installierbar. Versionen ausdrücklich angeben und die Prüfung nicht ohne Zustimmung des Auftraggebers überspringen.
