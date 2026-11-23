# Checkout-Trainer

Zweisprachige Web-App auf Deutsch und Englisch. Dartspieler lernen damit Checkout-Wege für die Reste 2 bis 170 mit Karteikarten. Die Karten zeigen den besten Weg, Alternativen, den Folgeweg nach Single statt Triple und die Bogey-Zahlen. Die App wird vor allem am Smartphone genutzt.

@AGENTS.md

`next dev` aktualisiert die Datei [AGENTS.md](AGENTS.md) bei jedem Start. Sie verweist auf die Next.js-Dokumentation zur installierten Version unter `node_modules/next/dist/docs/`. Das Projekt läuft auf Next.js 16. Vor jeder Arbeit an Next.js-Code dort nachlesen und nicht aus der Erinnerung an ältere Versionen arbeiten. Ändert ein Start die Datei, wird sie mit committet.

## Dokumente

- Entwurf: [docs/superpowers/specs/2026-11-11-checkout-trainer-design.md](docs/superpowers/specs/2026-11-11-checkout-trainer-design.md)
- Umsetzungsplan: [docs/superpowers/plans/2026-11-11-checkout-trainer.md](docs/superpowers/plans/2026-11-11-checkout-trainer.md)
- Entwurf Mehrsprachigkeit: [docs/superpowers/specs/2026-11-12-mehrsprachigkeit-design.md](docs/superpowers/specs/2026-11-12-mehrsprachigkeit-design.md)
- Umsetzungsplan Mehrsprachigkeit: [docs/superpowers/plans/2026-11-12-mehrsprachigkeit.md](docs/superpowers/plans/2026-11-12-mehrsprachigkeit.md)
- Bereitstellung: [docs/bereitstellung.md](docs/bereitstellung.md)

## Technik

- Next.js 16 mit App Router, TypeScript und `src/`
- shadcn/ui und lucide-react
- Better Auth mit E-Mail und Passwort und dem Admin-Plugin
- Drizzle ORM mit Postgres. Lokal und in Tests läuft PGlite, produktiv Neon über `pg`.
- ts-fsrs und Vitest
- Vercel Web Analytics und Speed Insights, eingebunden im Root-Layout

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

Lokal bleibt `DATABASE_URL` leer. Die App nutzt dann PGlite unter `.data/pglite`. Ist die lokale Datenbank beschädigt, `.data/pglite` löschen und danach `db:migrate` und `db:seed-admin` ausführen.

### Testkonto für den Browser

- Das lokale Konto `testnutzer@checkout-trainer.test` hat die Betreiberrolle und sieht alle Tabs, auch die Verwaltung. Das Passwort steht in `.data/test-user.json`. Die Datei ist gitignored. Das Passwort nie in committete Dateien schreiben.
- Das Konto wurde mit `seedAdmin` aus `src/lib/auth` angelegt. Es ist aktiv und braucht keine Freischaltung. Wird `.data/pglite` gelöscht, ist das Konto weg. Dann das Konto neu anlegen und `.data/test-user.json` aktualisieren. PGlite erlaubt nur einen Prozess, dafür den Dev-Server vorher anhalten.
- Ist Port 3000 belegt, über den Launch-Eintrag `checkout-trainer-3001` starten. Er setzt `BETTER_AUTH_URL` auf Port 3001. Sonst lehnt Better Auth die Anmeldung mit "Invalid origin" ab.

## Aufbau

- `src/lib/darts/` enthält das Dart-Modell, die Aufzählung und Bewertung der Wege, die Referenztabelle und die Kartenerzeugung. Das ist reine Logik.
- `src/data/cards.generated.json` enthält die erzeugten Karten und ist committet. Nie von Hand ändern. Ein Test prüft, dass die Datei zum Generator passt.
- `src/lib/db/` enthält das Schema, die Datenbankinstanz und die Test-Datenbank.
- `src/lib/auth/` enthält die Better-Auth-Konfiguration, den Client und den Zugriffsschutz.
- `src/lib/srs/` und `src/lib/review/` enthalten die Wiederholungslogik mit FSRS, die Warteschlange und das Speichern der Bewertungen.
- `src/app/[lang]/` enthält alle Seiten unter dem Sprachsegment `/de/…` oder `/en/…`. Die Seitennamen sind englisch: `/today`, `/study`, `/stats`, `/settings`, `/admin`, `/pending`, `/sign-in`, `/sign-up`, `/imprint`, `/privacy`. Die Startseite ist `/de` oder `/en`.
- `src/i18n/` enthält die Mehrsprachigkeit:
  - `locales.ts` mit den Sprachen und `paths.ts` mit den Sprachpfaden
  - `dictionaries/` mit `de.ts` und `en.ts`. `de.ts` ist die Quelle des Typs `Dictionary`.
  - `dictionaries/index.ts` mit `DICTIONARIES`
  - `server.ts` mit `getDictionary()`, `getLocale()`, `requestLocale()` und `localeRedirectPath()`
  - `client.tsx` mit `useDictionary()`, `useLocale()` und `useLocalePath()`
  - Der Test `no-hardcoded-text.test.ts` schlägt bei harten Texten in der Oberfläche an.
- Umleitungen in Server Actions und Zugriffsprüfungen laufen nur über `localeRedirectPath()`. Ein nacktes `redirect('/today')` wechselt ohne Hinweis die Sprache.

## Cache Components

- `cacheComponents` ist eingeschaltet. Jede angemeldete Seite liefert sofort ein vorgerendertes Gerüst. Die Nutzerdaten kommen hinter Suspense-Grenzen mit Skeletons nach. Nur `/pending` trägt `export const instant = false`.
- `partialPrefetching` bleibt ausgeschaltet. Mit dem Schalter laufen Sitzungsprüfung und Datenabfragen je Seitenaufruf doppelt, das ist gemessen. Das Gerüst erscheint auch ohne den Schalter sofort.
- Nutzerdaten werden nie gecacht. Für Sitzung und Lerndaten gibt es kein `use cache`, `use cache: private` oder `use cache: remote`. `React.cache` dient nur dazu, eine Abfrage innerhalb einer Anfrage zu teilen.
- Jeder Datenbaustein prüft die Sitzung selbst. Der Lader ruft zuerst `requireActiveUser()` oder `requireAdmin()` auf, erst danach `new Date()` und die Abfragen.
- Jede Seite hat unter `src/components/<bereich>/` drei Arten von Dateien:
  - `*-parts` für das gemeinsame Layout
  - `*-data` für Lader und Datenbausteine
  - `*-skeleton` für den Rückfall-Inhalt in `LoadingRegion`
- Das Gerüst besteht aus der Seite ohne Datenbausteine, dem Layout und den Skeletons. Es enthält keine Nutzerdaten und keine Lerninhalte, also keine Wege, Begründungen, Alternativen, Stellwürfe oder Karten.
- `src/proxy.ts` ist nur eine Cookie-Vorprüfung ohne Datenbank und ersetzt keine Prüfung. Echte Status-Codes kommen nur noch aus `proxy.ts`. Ohne Sitzungs-Cookie leitet es mit 307 nach `/<lang>/sign-in` um. Sonst antwortet jede Seite mit 200. `redirect()` und `notFound()` aus Datenbausteinen kommen als Anweisung im Datenstrom. Ein aktiver Nicht-Betreiber wird von `/<lang>/admin` nach `/<lang>/today` umgeleitet.
- `proxy.ts` leitet außerdem Adressen ohne Sprache mit 307 auf `/<lang>/…` um. Die Sprache kommt aus dem Cookie `lang`, dann aus `Accept-Language`, sonst ist sie Englisch. `proxy.ts` setzt `x-locale` für die Seite. Der Sprachumschalter lädt die Seite vollständig neu.
- React Activity behält den Clientzustand über Seitenwechsel. Formulare mit Geheimnissen setzen sich beim Verbergen per `useLayoutEffect`-Cleanup zurück. Das betrifft Passwortfelder und Rückfragen mit Passwort. Die Lernsitzung bekommt je Navigation einen eigenen React-Schlüssel `bfcacheId` und startet nach dem Verlassen neu.

## Regeln

- Die Oberfläche ist vollständig auf Deutsch und Englisch. Alle Texte stehen in `src/i18n/dictionaries/`. Keine Emojis. Icons nur aus `lucide-react` und nur, wo sie nötig sind.
- Jede Seite hat eine Aufgabe. Die App muss schnell und übersichtlich bleiben.
- Keine Tailwind-Klassen mit freien Werten in eckigen Klammern wie `h-[3px]`, `text-[0.8125rem]` oder `shadow-[…]`. Standardklassen der Skala verwenden, etwa `shadow-lg` oder `text-sm`. Fehlt ein Wert, einen benannten Token im Tailwind-Theme anlegen und dessen Klasse nutzen. Das Theme steht unter `@theme` in `src/app/globals.css`. Die Regel gilt auch für `src/components/ui/`.
- Für die Reste 41 bis 170 gelten alle Regeln der Referenztabelle in `src/lib/darts/reference.ts`:
  - Variante 1 ist der beste Weg.
  - Variante 2 ist die Alternative.
  - Die Spalte "mit 2 Darts" gilt.
  - Das Zielen zwischen zwei Feldern gilt.
  - Unter 41 gilt das eigene Regelwerk.
- Kein E-Mail-Versand. Der Betreiber schaltet Konten von Hand frei.
- Alles muss in kostenlosen Tarifen bleiben, also Vercel Hobby und Neon Free.
- Kein Zugriff auf Vercel, Neon oder andere fremde Dienste ohne vorherige Absprache mit dem Auftraggeber. Ausgenommen ist alles, was der Abschnitt "Git-Flow und Ablauf bis Produktion" beschreibt. Das hat der Auftraggeber dauerhaft freigegeben. Dazu gehören auf GitHub Issues, Labels, Branches, PRs, Merges, Releases mit Tags und das Lesen des Deploy-Status. Den Prod-Deploy selbst übernimmt die Vercel-Git-Anbindung.
- `src/lib/db/schema.ts` von Hand pflegen und Migrationen mit `db:generate` erzeugen. Den Better-Auth-CLI-Generator nicht in diese Datei schreiben lassen, er überschreibt die Handänderungen.
- Tests zuerst schreiben. Vor jedem Commit `npm run test:coverage`, `npm run typecheck` und `npm run lint` ausführen.
- Die Testabdeckung ist mindestens 80 % für Zeilen, Anweisungen, Zweige und Funktionen. Sie gilt getrennt für das Backend und das Frontend:
  - Backend: `src/lib`, `src/proxy.ts`, `src/app/api`, `src/app/**/*.ts`
  - Frontend: `src/components`, `src/app/**/*.tsx`
  - Die Schwellen stehen in `vitest.config.ts`. Neuer Code bringt seine Tests mit, die Schwellen werden nicht gesenkt.
- Komponententests heißen `*.test.tsx`, tragen `// @vitest-environment jsdom` in der ersten Zeile und nutzen Testing Library. Eingaben laufen über user-event. `fireEvent` nur, wo user-event nicht passt. Ein Beispiel ist die Lernsitzung mit nachgebildeter Uhr, deren Tippschutz kurz aufeinanderfolgende Tipps verwirft. Geprüft wird sichtbares Verhalten wie Rollen, Beschriftungen und Texte, nicht der Aufbau.

## Git-Flow und Ablauf bis Produktion

Der Auftraggeber hat diesen Ablauf dauerhaft freigegeben und will ihn nicht jedes Mal nennen. Er gilt für jede Änderung, sofern der Auftraggeber nichts anderes sagt.

### Grundregeln

- Das Repository ist `derBinder/checkout-trainer` und privat. Remote `origin` ist `git@github-privat:derBinder/checkout-trainer.git`. `github-privat` ist ein SSH-Alias mit eigenem Schlüssel. Jedem `gh`-Befehl `GH_TOKEN=$(gh auth token --user derBinder)` voranstellen, weil das aktive `gh`-Konto ein anderes sein kann.
- Das Branch-Modell ist Git-Flow nach Driessen:
  - `main` enthält nur veröffentlichte Stände, jeder mit Tag `v<version>`. Jeder Merge nach `main` startet über die Vercel-Git-Anbindung den Prod-Deploy. Andere Branches deployt Vercel nicht. Das regelt `git.deploymentEnabled` in `vercel.json` und im Dashboard zusätzlich der Ignored Build Step "Only build production". Es gibt keine Previews, weil die Datenbank-Variablen der Neon-Integration auch für Preview gelten und auf die Produktionsdatenbank zeigen. Nie `vercel deploy` von Hand ausführen, das stellt doppelt bereit.
  - `develop` ist der Integrations-Branch und der Standard-Branch auf GitHub.
  - `feature/<nr>-<kurzname>` geht aus `develop` hervor und zurück nach `develop`.
  - `release/<version>` geht aus `develop` hervor und nach `main`. Danach wird `main` nach `develop` zurückgeführt.
  - `hotfix/<version>` geht aus `main` hervor und nach `main`. Danach wird `main` nach `develop` zurückgeführt. Ist ein Release-Branch offen, geht der Hotfix stattdessen dorthin, siehe Hotfix.
  - Zurückgeführt wird immer `main` selbst, nicht der Release- oder Hotfix-Branch. Nur so kommen auch die Merge-Commits aus `main` nach `develop`. Nach jeder Rückführung ist `git rev-list --count origin/develop..origin/main` 0.
- Versionen folgen SemVer in `package.json`. Eine neue Funktion im Release erhöht die mittlere Stelle, etwa von `0.2.0` auf `0.3.0`. Ein Release nur mit Fehlerbehebungen und jeder Hotfix erhöhen die letzte Stelle, etwa von `0.2.0` auf `0.2.1`. Gesetzt wird die Version mit `npm version <version> --no-git-tag-version`.
- `main` und `develop` ändern sich nur durch Merges von PRs auf GitHub. Gemergt wird immer als Merge-Commit mit `gh pr merge <pr> -R derBinder/checkout-trainer --merge`, nie als Squash oder Rebase. Lokal werden die beiden Branches nur nachgezogen.
- Gepusht werden nur `feature/…`, `release/…`, `hotfix/…` und `merge/…`. Tags entstehen nur über `gh release create`. Kein Force-Push.
- Auf GitHub erzwingt der Ruleset "Protect main and develop" unter Settings, Rules diese Regeln. Er verbietet Löschen und Force-Push und erlaubt Änderungen nur per PR mit Merge-Commit. Er hat keine Ausnahmen, auch nicht für den Inhaber des Repositorys. Er verlangt weder Freigaben durch Reviewer noch Status-Checks. Der Grund: PRs mit nur `docs/**` oder `*.md` bekommen kein CI und blieben sonst hängen. Dass nie rot gemergt wird, siehe Abschnitt CI, bleibt Aufgabe von Claude.
- Jede Arbeit läuft in einem eigenen Worktree unter `.claude/worktrees/`. Er wird aus dem frischen Stand auf GitHub angelegt, mit `git fetch origin` und `git worktree add --no-track -b <branch> .claude/worktrees/<name> origin/<basis>`. Das Hauptverzeichnis bleibt sauber auf `main`. Nach dem letzten Merge eines Branches Worktree und lokalen Branch aus dem Hauptverzeichnis entfernen.
- Alle Texte auf GitHub sind englisch. Das gilt für Issues, PRs, Kommentare, Labels, Release-Notizen, Commit-Nachrichten und Branch-Namen. Entwürfe und Pläne unter `docs/` bleiben deutsch. Keine Attributionszeilen.
- Issues werden nie über Schlüsselwörter geschlossen. Kein `Closes`, `Fixes` oder `Resolves` vor einer Issue-Nummer, weder in PR-Texten noch in Commit-Nachrichten. In PRs nach `develop`, dem Standard-Branch, würden sie das Issue vor dem Livegang schließen. Verweise immer als `Refs #<nr>` schreiben. Geschlossen wird nach dem Deploy per `gh`, siehe Release Schritt 6.
- Merge-Konflikte immer mit dem Skill `resolving-merge-conflicts` lösen, also mit `/resolving-merge-conflicts`. Nie von Hand oder per Skript. Danach die drei Prüfungen ausführen.

### Code-Review

Vor jedem Merge von neuem Code läuft `/code-review` mit Stufe `high` aus dem Skill `code-review`:

1. Im Worktree des Branches `git fetch origin` ausführen.
2. Das Review mit `high origin/<ziel>...HEAD` starten. Das Ziel ist `develop` für Features und `main` für Hotfixes. Nie `@{upstream}` verwenden. Das ist nach dem Push der Branch selbst und ergibt einen leeren Diff.
3. Gibt es Findings, legt Claude sie dem Auftraggeber vor und wartet auf seine Entscheidung, welche behoben werden.
4. Korrekturen kommen als neue Commits auf den Branch. Danach läuft das Review nur über diese Commits. `git log --first-parent --no-merges --format=%h <Commit vor den Korrekturen>..HEAD` listet sie. Liegt kein Merge im Bereich, läuft das Review über `high <Commit vor den Korrekturen>..HEAD`. Sonst läuft es über jeden Korrektur-Commit einzeln mit `high <sha>^..<sha>`.
5. Neue Findings gehen wieder an den Auftraggeber. Ohne Findings das Ergebnis melden und weitermachen.

Kein Review brauchen PRs, die nur schon geprüften Inhalt verschieben. Das sind der Release nach `main` und die Rück-PRs nach `develop`. Was dabei neu entsteht, wird gezielt reviewt:

- Auf einem Release-Branch jeder Fix-Commit einzeln mit `high <sha>^..<sha>`, nicht der Versions-Commit.
- Auf einem `merge/…`-Branch nur die Konfliktlösung selbst. Den Umfang zeigt `git show --remerge-diff <merge-sha>`. Der Befehl zeigt genau, was beim Lösen anders gewählt wurde als in den beiden Seiten.

### CI

Der Workflow `CI` in `.github/workflows/ci.yml` hat den Job `check` mit `test:coverage`, `typecheck` und `lint`. Er läuft gezielt:

| PR | CI | Grund |
|---|---|---|
| `feature/*` nach `develop` | ja | neuer Code |
| `feature/*` nach `develop`, nur `docs/**` oder `*.md` | nein, wegen `paths-ignore` | Tests, Typen und Lint hängen nicht daran |
| `release/*` nach `main` | ja | letzte Prüfung vor der Produktion, auch für die neue Versionsnummer |
| `hotfix/*` nach `main` | ja | neuer Code, direkt vor der Produktion |
| Rückführung `main` nach `develop`, `develop` hat keine Commits, die nicht in `main` sind | nein, der Job `scope` überspringt `check` | derselbe Stand war gerade in `main` grün |
| `main` nach `develop`, `develop` ist weiter | ja | die Kombination mit neueren Features wurde noch nie getestet |
| `merge/*` nach `develop` | ja | Konfliktlösung ist neuer Inhalt |

Wo CI läuft, wird nur gemergt, wenn `gh pr checks <pr> --watch` mit Exit-Code 0 endet. Nie rot mergen. Wo CI nicht läuft, meldet `gh pr checks` keine oder übersprungene Checks. Dann ohne Warten mergen.

### Feature

1. **Issue.** Jede Änderung hat ein Issue mit Was und Warum und dem Label `bug`, `enhancement` oder `documentation`. Nennt der Auftraggeber den Auftrag im Chat, legt Claude das Issue an.
2. **Branch.** `feature/<nr>-<kurzname>` mit englischem Kurznamen, etwa `feature/12-streak-pause`, aus `origin/develop` im Worktree `.claude/worktrees/<nr>-<kurzname>`.
3. **Arbeit.** Tests zuerst. Für größere Funktionen entstehen Entwurf und Plan mit Superpowers unter `docs/superpowers/` auf dem Feature-Branch. Sie kommen mit dem Code in denselben PR. Bei `finishing-a-development-branch` immer Push und PR nach `develop`, ohne Rückfrage.
4. **PR nach `develop`.** `git push -u origin feature/<nr>-<kurzname>`. Der PR-Titel lautet wie die Commit-Nachricht. Der Text nennt, was sich ändert, wie es geprüft wurde, eine etwaige Migration und `Refs #<nr>`.
5. **Review, CI, Merge.** Code-Review, CI laut Tabelle, dann `gh pr merge <pr> -R derBinder/checkout-trainer --merge --delete-branch`. Mit `-R` bleibt der lokale Worktree unberührt. Danach Worktree und Branch entfernen. Trägt das Issue das Label `review` oder hat der Auftraggeber "erst zeigen" gesagt, vor dem Merge auf sein OK warten.
6. **Release.** Direkt danach folgt ein Release, außer der Auftraggeber will Features sammeln.

### Release

1. **Inhalt bestimmen.** `git fetch origin`, dann `git rev-list --count origin/develop..origin/main`.
   - Ist die Zahl größer als 0, ist ein Release oder Hotfix noch nicht nach `develop` zurückgeführt. Ist ein PR von `main` nach `develop` offen, ihn abwarten, er gehört zu einer anderen Session. Sonst die Rückführung jetzt nach Schritt 5 nachholen. Ihr Titel ist `Merge main into develop` ohne Version, weil sie zu keinem gerade fertigen Release gehört. Bei Konflikten heißt der Branch `merge/main-into-develop`. Danach von vorn beginnen.
   - Ist die Zahl 0, `git log --merges --first-parent --format=%s origin/main..origin/develop` ausführen. Jeder Merge eines Feature-PRs nennt den Branch `feature/<nr>-…`. Daraus kommen die Issue-Nummern, auch die von unveröffentlichten Features anderer Sessions.
   - Die Version nach SemVer festlegen.
2. **Release-Branch.** `release/<version>` aus `origin/develop` im Worktree `.claude/worktrees/release-<version>` anlegen. `npm version <version> --no-git-tag-version` ändert `package.json` und `package-lock.json`. Dann die Prüfungen, der Commit `chore: release <version>` und `git push -u origin release/<version>`. Auf dem Release-Branch nur noch Fehlerbehebungen für genau diesen Release, keine neuen Funktionen.
3. **PR nach `main`.** Titel `Release <version>`, Label `release`. Der Text nennt die enthaltenen Feature-PRs und je Issue `Refs #<nr>`.
   - Bringt der Release eine Migration mit, die SQL-Datei vor dem Merge prüfen. Der Merge startet den Prod-Deploy, und `scripts/vercel-build.sh` spielt die Migration dabei auf Neon ein, aber erst nach erfolgreichem `next build`. Migrationen bleiben additiv: erst erweitern, später aufräumen. Für kurze Zeit läuft noch der alte Code.
   - CI laut Tabelle, dann mergen mit `--delete-branch`. Danach Worktree und lokalen Branch entfernen. Die Rückführung in Schritt 5 kommt aus `main`, der Release-Branch wird nicht mehr gebraucht.
4. **Nachziehen, Deploy prüfen, Tag.**
   - Im Hauptverzeichnis auf sauberem `main` `git pull --ff-only origin main` ausführen.
   - Den Deploy am Commit-Status `Vercel` des Merge-Commits ablesen: `gh api repos/derBinder/checkout-trainer/commits/$(git rev-parse origin/main)/status --jq '.statuses[] | select(.context=="Vercel") | .state + " " + .description'`
   - Den Befehl wiederholen, bis die Ausgabe mit `success`, `failure` oder `error` beginnt. Eine leere Ausgabe heißt, dass Vercel den Status noch nicht gesetzt hat. Bei leerer Ausgabe und bei `pending` weiter warten, der Bau dauert rund eine Minute.
   - Fertig ist der Deploy bei `success Deployment has completed`. Dann prüfen, dass die Produktionsadresse antwortet.
   - Bei `failure` oder `error` den Bau-Log hinter `target_url` lesen, dem Auftraggeber melden und kein Release anlegen. Die Live-Seite läuft mit dem alten Stand weiter, siehe [docs/bereitstellung.md](docs/bereitstellung.md).
   - Erst nach erfolgreichem Deploy `gh release create v<version> -R derBinder/checkout-trainer --target main --title "v<version>" --generate-notes --notes "<Zusammenfassung, Refs #<nr>>"` ausführen. `--notes` steht über der Liste der PRs seit dem letzten Release, die GitHub erzeugt. PRs mit dem Label `release` blendet `.github/release.yml` dort aus. Danach `git fetch --tags origin`.
5. **Zurück nach `develop`.**
   - Den PR von `main` nach `develop` mit `gh pr create -R derBinder/checkout-trainer --base develop --head main` öffnen. Titel `Merge main into develop after <version>`, Label `release`, ohne Review. Ob CI läuft, entscheidet der Job `scope`, siehe Tabelle.
   - Unmittelbar vor dem Merge `git fetch origin` und `git rev-list --count origin/main..origin/develop` ausführen. Ist die Zahl größer als 0, aber CI wurde übersprungen, ist `develop` erst nach dem Öffnen weitergegangen. Dann den PR mit `gh pr close` schließen und mit `gh pr reopen` wieder öffnen, damit CI mit dem aktuellen Stand läuft. Das Ergebnis abwarten.
   - Dann mergen, **ohne** `--delete-branch`, weil der Kopf des PRs `main` ist. Mit dem Schalter würde `gh` trotzdem mergen und erst danach am Löschen von `main` scheitern, das die Schutzregel verweigert. Die Fehlermeldung heißt dann nicht, dass der Merge ausblieb.
   - Danach im Hauptverzeichnis `git fetch origin develop:develop`. Jetzt ist `git rev-list --count origin/develop..origin/main` 0.
   - Meldet GitHub Konflikte, weil `develop` inzwischen weiter ist, den PR schließen. Stattdessen `merge/<version>-into-develop` aus `origin/main` anlegen und `origin/develop` hineinmergen. Die Konflikte mit `/resolving-merge-conflicts` lösen, die Prüfungen ausführen und einen PR nach `develop` mit CI und Label `release` öffnen. Mergen mit `--delete-branch`.
6. **Issues schließen.** Jedes Issue aus Schritt 1 mit `gh issue close <nr> -R derBinder/checkout-trainer --comment "Released in v<version> (#<pr>) and deployed to production."` schließen. Ein geschlossenes Issue heißt, dass die Änderung live ist. Dann das Ergebnis melden mit Issues, PRs, Version und Deploy.

### Hotfix

Nur für Fehler in der Produktion, die nicht auf den nächsten Release warten sollen.

1. Issue wie bei Features. `hotfix/<version>` aus `origin/main` im Worktree `.claude/worktrees/hotfix-<version>` anlegen. Die Version erhöht die letzte Stelle von `main`. Fix mit Tests, `npm version <version> --no-git-tag-version`, Prüfungen, Commit, Push.
2. PR nach `main` mit Code-Review gegen `main`, CI und Prüfung der Migration wie in Release Schritt 3. Merge mit `--delete-branch` startet den Prod-Deploy. Danach Worktree und lokalen Branch entfernen. Ist gerade ein Release-Branch offen, ohne `--delete-branch` mergen, weil Schritt 3 den Hotfix-Branch noch braucht.
3. Weiter wie Release Schritt 4 bis 6. Ausnahme in Schritt 5: Ist gerade ein Release-Branch offen, entfällt die Rückführung von `main` nach `develop`. Der Hotfix geht stattdessen in diesen Release-Branch:
   - Beide Seiten ändern die Version, deshalb gibt es immer einen Konflikt in `package.json` und `package-lock.json`.
   - `merge/<hotfix-version>-into-release-<version>` aus `origin/release/<version>` im eigenen Worktree anlegen und `origin/hotfix/<hotfix-version>` hineinmergen.
   - Den Konflikt mit `/resolving-merge-conflicts` zugunsten der Release-Version lösen, die Prüfungen ausführen und pushen.
   - PR nach `release/<version>` mit Label `release` und ohne CI, weil der folgende Release-PR nach `main` das Ergebnis prüft. Die Konfliktlösung wird reviewt wie im Abschnitt Code-Review. Mergen mit `--delete-branch`.
   - Danach den Hotfix-Branch auf GitHub mit `gh api -X DELETE repos/derBinder/checkout-trainer/git/refs/heads/hotfix/<hotfix-version>` löschen und beide Worktrees und lokalen Branches entfernen.
   - `develop` bekommt den Hotfix mit der Rückführung von `main` nach `develop` nach diesem Release.

## Pakete installieren

Auf diesem Rechner läuft Safe-chain und blendet Paketversionen aus, die jünger als ein Mindestalter sind. `@latest` und `@canary` liefern deshalb nicht die tatsächlich neueste Version, und Canary-Versionen sind gar nicht installierbar. Versionen ausdrücklich angeben. Die Prüfung nur mit Zustimmung des Auftraggebers überspringen.
