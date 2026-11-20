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
- Kein Zugriff auf Vercel, Neon oder andere fremde Dienste ohne vorherige Absprache mit dem Auftraggeber. Ausnahme: alles, was der Abschnitt „Git-Flow und Ablauf bis Produktion“ beschreibt (GitHub: Issues, Labels, Branches, PRs, Merges, Releases mit Tags; Vercel: Prod-Deploy per CLI), das hat der Auftraggeber dauerhaft freigegeben.
- `src/lib/db/schema.ts` von Hand pflegen und Migrationen mit `db:generate` erzeugen. Den Better-Auth-CLI-Generator nicht in diese Datei schreiben lassen, er überschreibt die Handänderungen.
- Tests zuerst schreiben. Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`.
- Testabdeckung mindestens 80 % (Zeilen, Anweisungen, Zweige, Funktionen), getrennt für Backend (`src/lib`, `src/proxy.ts`, `src/app/api`, `src/app/**/*.ts`) und Frontend (`src/components`, `src/app/**/*.tsx`). Die Schwellen stehen in `vitest.config.ts`. Neuer Code bringt seine Tests mit, die Schwellen werden nicht gesenkt.
- Komponententests als `*.test.tsx` mit `// @vitest-environment jsdom` in der ersten Zeile und Testing Library. Eingaben mit user-event; `fireEvent` nur, wo user-event nicht passt (etwa mit nachgebildeter Uhr in der Lernsitzung, deren Tippschutz kurz aufeinanderfolgende Tipps verwirft). Geprüft wird sichtbares Verhalten (Rollen, Beschriftungen, Texte), nicht der Aufbau.

## Git-Flow und Ablauf bis Produktion

Der Auftraggeber hat diesen Ablauf dauerhaft freigegeben und will ihn nicht jedes Mal nennen. Gilt für jede Änderung, sofern er nichts anderes sagt.

### Grundregeln

- Repository `derBinder/checkout-trainer` (privat), Remote `origin` = `git@github-privat:derBinder/checkout-trainer.git` (SSH-Alias `github-privat` mit eigenem Schlüssel). Jeder `gh`-Befehl mit `GH_TOKEN=$(gh auth token --user derBinder)` davor, das aktive `gh`-Konto kann ein anderes sein.
- Branch-Modell ist Git-Flow (Standard nach Driessen):
  - `main`: nur veröffentlichte Stände, jeder mit Tag `v<version>`. Aus `main` wird deployt.
  - `develop`: Integrations- und Standard-Branch auf GitHub.
  - `feature/<nr>-<kurzname>` aus `develop`, zurück nach `develop`.
  - `release/<version>` aus `develop`, nach `main` und danach nach `develop`.
  - `hotfix/<version>` aus `main`, nach `main` und danach nach `develop` (oder in einen offenen Release-Branch, siehe Hotfix).
- Versionen nach SemVer in `package.json`: neue Funktion im Release erhöht die mittlere Stelle (`0.2.0` → `0.3.0`), ein Release nur mit Fehlerbehebungen und jeder Hotfix die letzte (`0.2.0` → `0.2.1`). Gesetzt mit `npm version <version> --no-git-tag-version`.
- `main` und `develop` ändern sich nur durch Merges von PRs auf GitHub, immer als Merge-Commit (`gh pr merge <pr> -R derBinder/checkout-trainer --merge`), nie Squash oder Rebase. Lokal werden sie nur nachgezogen. Gepusht werden nur `feature/…`, `release/…`, `hotfix/…` und `merge/…`. Tags entstehen nur über `gh release create`. Kein Force-Push.
- Jede Arbeit in einem eigenen Worktree unter `.claude/worktrees/`, angelegt aus dem frischen Stand auf GitHub (`git fetch origin`, `git worktree add --no-track -b <branch> .claude/worktrees/<name> origin/<basis>`). Das Hauptverzeichnis bleibt sauber auf `main`. Nach dem letzten Merge eines Branches: Worktree und lokalen Branch aus dem Hauptverzeichnis entfernen.
- Alle Texte auf GitHub auf Englisch: Issues, PRs, Kommentare, Labels, Release-Notizen, Commit-Nachrichten, Branch-Namen. Entwürfe und Pläne unter `docs/` bleiben auf Deutsch. Keine Attributionszeilen.
- Issues werden nie über Schlüsselwörter geschlossen: kein `Closes`, `Fixes` oder `Resolves` vor einer Issue-Nummer, weder in PR-Texten noch in Commit-Nachrichten (in PRs nach `develop`, dem Standard-Branch, schlössen sie das Issue vor dem Livegang). Verweise immer als `Refs #<nr>`. Geschlossen wird nach dem Deploy per `gh` (Release, Schritt 6).
- Merge-Konflikte immer mit dem Skill `resolving-merge-conflicts` lösen (`/resolving-merge-conflicts`), nie von Hand oder per Skript, danach die drei Prüfungen.

### Code-Review

Vor jedem Merge von neuem Code läuft `/code-review` mit Stufe `high` (Skill `code-review`) im Worktree des Branches, nach `git fetch origin`, mit `high origin/<ziel>...HEAD` (Ziel `develop` für Features, `main` für Hotfixes). Nie `@{upstream}`, das ist nach dem Push der Branch selbst und ergibt einen leeren Diff. Gibt es Findings, legt Claude sie dem Auftraggeber vor und wartet auf seine Entscheidung, welche behoben werden. Korrekturen kommen als neue Commits auf den Branch, danach läuft das Review nur über sie: `git log --first-parent --no-merges --format=%h <Commit vor den Korrekturen>..HEAD` listet sie; ohne Merge im Bereich `high <Commit vor den Korrekturen>..HEAD`, sonst jeden Korrektur-Commit einzeln (`high <sha>^..<sha>`). Neue Findings gehen wieder an den Auftraggeber. Ohne Findings das Ergebnis melden und weiter. Kein Review brauchen PRs, die nur schon geprüften Inhalt verschieben: Release nach `main` und die Rück-PRs nach `develop`. Was dabei neu entsteht, wird gezielt reviewt: Fehlerbehebungen auf einem Release-Branch jeder Fix-Commit einzeln (`high <sha>^..<sha>`, nicht der Versions-Commit), eine Konfliktlösung auf einem `merge/…`-Branch nur die Lösung selbst (Umfang `git show --remerge-diff <merge-sha>`, das zeigt genau, was beim Lösen anders gewählt wurde als in den beiden Seiten).

### CI

Der Workflow `CI` (`.github/workflows/ci.yml`, Job `check`: `test:coverage`, `typecheck`, `lint`) läuft gezielt:

| PR | CI | Grund |
|---|---|---|
| `feature/*` → `develop` | ja | neuer Code |
| `feature/*` → `develop`, nur `docs/**` oder `*.md` | nein (`paths-ignore`) | Tests, Typen und Lint hängen nicht daran |
| `release/*` → `main` | ja | letzte Prüfung vor der Produktion, auch für die neue Versionsnummer |
| `hotfix/*` → `main` | ja | neuer Code, direkt vor der Produktion |
| `release/*` oder `hotfix/*` → `develop`, `develop` seit dem Abzweig unverändert | nein (Job `scope` überspringt `check`) | derselbe Stand war gerade in `main` grün |
| `release/*` oder `hotfix/*` → `develop`, `develop` ist weiter | ja | die Kombination mit neueren Features wurde noch nie getestet |
| `merge/*` → `develop` | ja | Konfliktlösung ist neuer Inhalt |

Wo CI läuft, wird nur gemergt, wenn `gh pr checks <pr> --watch` mit Exit-Code 0 endet; nie rot mergen. Wo CI nicht läuft, meldet `gh pr checks` keine oder übersprungene Checks, dann ohne Warten mergen.

### Feature

1. **Issue.** Jede Änderung hat ein Issue (Was und Warum, Label `bug`, `enhancement` oder `documentation`). Nennt der Auftraggeber den Auftrag im Chat, legt Claude es an.
2. **Branch.** `feature/<nr>-<kurzname>` (englischer Kurzname, etwa `feature/12-streak-pause`) aus `origin/develop` im Worktree `.claude/worktrees/<nr>-<kurzname>`.
3. **Arbeit.** Tests zuerst. Größere Funktionen: Entwurf und Plan (Superpowers, `docs/superpowers/`) auf dem Feature-Branch, sie kommen mit dem Code in denselben PR. Bei `finishing-a-development-branch` immer Push und PR nach `develop`, ohne Rückfrage.
4. **PR nach `develop`.** `git push -u origin feature/<nr>-<kurzname>`, PR mit Titel wie die Commit-Nachricht; Text: was sich ändert, wie geprüft, Hinweis auf eine Migration, `Refs #<nr>`.
5. **Review, CI, Merge.** Code-Review, CI laut Tabelle, dann `gh pr merge <pr> -R derBinder/checkout-trainer --merge --delete-branch` (mit `-R` bleibt der lokale Worktree unberührt), Worktree und Branch entfernen. Trägt das Issue das Label `review` oder hat der Auftraggeber „erst zeigen“ gesagt, vor dem Merge auf sein OK warten.
6. **Release.** Direkt danach folgt ein Release, außer der Auftraggeber will Features sammeln.

### Release

1. **Inhalt bestimmen.** `git fetch origin`, dann `git log --merges --first-parent --format=%s origin/main..origin/develop`. Jeder Merge eines Feature-PRs nennt den Branch `feature/<nr>-…`, daraus kommen die Issue-Nummern, auch die von Features anderer Sessions, die noch nicht veröffentlicht sind. Version nach SemVer festlegen.
2. **Release-Branch.** `release/<version>` aus `origin/develop` im Worktree `.claude/worktrees/release-<version>`. `npm version <version> --no-git-tag-version` (ändert `package.json` und `package-lock.json`), Prüfungen, Commit `chore: release <version>`, `git push -u origin release/<version>`. Auf dem Release-Branch nur noch Fehlerbehebungen für genau diesen Release, keine neuen Funktionen.
3. **PR nach `main`.** Titel `Release <version>`, Label `release`, Text: die enthaltenen Feature-PRs und je Issue `Refs #<nr>`. CI laut Tabelle, mergen ohne `--delete-branch`.
4. **Tag, nachziehen, Deploy.** `gh release create v<version> -R derBinder/checkout-trainer --target main --title "v<version>" --generate-notes --notes "<Zusammenfassung, Refs #<nr>>"` (`--notes` steht über der von GitHub erzeugten Liste der PRs seit dem letzten Release; PRs mit dem Label `release` blendet `.github/release.yml` dort aus). Im Hauptverzeichnis (`main`, sauber) den alten Stand merken, `git pull --ff-only origin main`, `git fetch --tags origin`. Bringt der Release eine Migration mit, die SQL-Datei vorher prüfen: Sie läuft beim Prod-Bau automatisch auf Neon (`scripts/vercel-build.sh`), aber erst nach erfolgreichem `next build`, und bleibt additiv (erst erweitern, später aufräumen), weil kurz noch der alte Code läuft. Dann `npx vercel@65.12.1 deploy --prod` aus dem Hauptverzeichnis (CLI, ohne Git-Anbindung, siehe [docs/bereitstellung.md](docs/bereitstellung.md)) und prüfen, dass die Produktionsadresse antwortet. Der Deploy entfällt, wenn `git diff --name-only <alter main> origin/main` außer `package.json` und `package-lock.json` nur `docs/`, `.github/` oder `*.md` zeigt.
5. **Zurück nach `develop`.** PR `release/<version>` → `develop`, Titel `Merge release <version> into develop`, Label `release`, ohne Review; ob CI läuft, entscheidet der Job `scope` (Tabelle). Unmittelbar vor dem Merge `git fetch origin` und `git rev-list --count origin/release/<version>..origin/develop`: Ist die Zahl größer als 0, aber CI wurde übersprungen, ist `develop` erst nach dem Öffnen weitergegangen; dann den PR schließen und wieder öffnen (`gh pr close`, `gh pr reopen`), damit CI mit dem aktuellen Stand läuft, und dessen Ergebnis abwarten. Dann mergen mit `--delete-branch`, Worktree und Branch entfernen, im Hauptverzeichnis `git fetch origin develop:develop`. Meldet GitHub Konflikte (weil `develop` inzwischen weiter ist), den PR schließen und stattdessen `merge/<version>-into-develop` aus dem Release-Branch anlegen, `origin/develop` hineinmergen, Konflikte mit `/resolving-merge-conflicts` lösen, Prüfungen, PR nach `develop` mit CI und Label `release`.
6. **Issues schließen.** Jedes Issue aus Schritt 1: `gh issue close <nr> -R derBinder/checkout-trainer --comment "Released in v<version> (#<pr>) and deployed to production."`, ohne Deploy `--comment "Released in v<version> (#<pr>); no deploy needed (docs/CI only)."`. Ein geschlossenes Issue heißt: Die Änderung ist live. Dann Ergebnis melden (Issues, PRs, Version, Deploy oder warum keiner nötig war).

### Hotfix

Nur für Fehler in der Produktion, die nicht auf den nächsten Release warten sollen.

1. Issue wie bei Features. `hotfix/<version>` (letzte Stelle von `main` erhöht) aus `origin/main` im Worktree `.claude/worktrees/hotfix-<version>`. Fix mit Tests, `npm version <version> --no-git-tag-version`, Prüfungen, Commit, Push.
2. PR nach `main` mit Code-Review gegen `main`, CI, Merge ohne `--delete-branch`.
3. Weiter wie Release Schritt 4 bis 6, mit dem Hotfix-Branch. Ausnahme in Schritt 5: Ist gerade ein Release-Branch offen, geht der Hotfix statt nach `develop` in diesen Release-Branch (PR `hotfix/<version>` → `release/<version>`, Label `release`, ohne CI, weil der folgende Release-PR nach `main` das Ergebnis prüft); `develop` bekommt ihn dann mit dem Release. Der Konflikt in `package.json` und `package-lock.json` wird zugunsten der Release-Version gelöst (mit `/resolving-merge-conflicts`).

## Pakete installieren

Auf diesem Rechner läuft Safe-chain und blendet Paketversionen aus, die jünger als ein Mindestalter sind. `@latest` und `@canary` liefern deshalb nicht die tatsächlich neueste Version, Canary-Versionen sind gar nicht installierbar. Versionen ausdrücklich angeben und die Prüfung nicht ohne Zustimmung des Auftraggebers überspringen.
