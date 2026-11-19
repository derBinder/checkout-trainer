# Entwicklungsablauf mit Issues, PRs und CI: Entwurf

Stand: 2026-11-19

## Worum es geht

Das Repository liegt jetzt privat auf GitHub (`derBinder/checkout-trainer`). Bisher läuft alles lokal: Branch im Worktree, lokale Prüfungen, Merge nach `develop` und `main`, Deploy per Vercel-CLI, danach Push. Künftig beginnt jede Änderung als Issue, landet über einen PR und wird auf GitHub automatisch geprüft. Die Änderungen werden damit am Repository nachvollziehbar, und Aufträge lassen sich auch unterwegs als Issue anlegen.

## Ziele

- Jede Änderung hat ein Issue (Was und Warum) und einen PR (Wie, Prüfergebnis).
- Die Pflichtprüfungen laufen zusätzlich auf GitHub und stehen sichtbar am PR.
- Der dauerhaft freigegebene Ablauf bis Produktion bleibt so schnell wie heute: Kein Schritt wartet auf den Auftraggeber, solange er nichts anderes sagt.

## Nicht-Ziele

- Keine Git-Anbindung bei Vercel, keine Preview-Deployments, keine Änderungen bei Vercel oder Neon.
- Keine Issue-Vorlagen, kein Projekt-Board, kein Dependabot.
- Keine Branch-Schutzregeln: Im kostenlosen GitHub-Tarif gibt es sie für private Repositories nicht. Die Regeln stehen stattdessen in der CLAUDE.md.

## Ansätze

- **A: Issues, PRs nach `develop`, GitHub Actions, Deploy weiter per CLI.** Gewählt. Bringt Tickets, PRs und sichtbare Prüfung, ohne fremde Dienste umzubauen.
- B: wie A, dazu Vercel mit GitHub verbinden (Preview je PR, Auto-Deploy von `main`). Verworfen: braucht eigene Neon-Verzweigungen und Auth-Adressen für Previews, sonst schreiben sie in die Produktionsdatenbank; mehr Einrichtung, Neon-Free-Grenzen. Lässt sich später ergänzen.
- C: ohne `develop`, PRs direkt nach `main`. Verworfen: Der Zwischenstand zum Sammeln mehrerer Änderungen fällt weg.

## Entscheidungen des Auftraggebers

- Variante A.
- Claude mergt PRs selbst, sobald CI grün ist. Ausnahmen: Das Issue trägt das Label `review`, oder der Auftraggeber sagt „erst zeigen“. Dann wartet Claude nach dem Öffnen des PRs auf sein OK.

## Ablauf

1. **Issue.** Der Auftraggeber legt es an (auch am Handy) oder nennt den Auftrag im Chat, dann legt Claude das Issue an: Titel, kurz Was und Warum, Labels `bug`, `enhancement` oder `documentation`. Ein Auftrag im Chat ist gleichzeitig die Freigabe, das Issue anzulegen.
2. **Branch.** `<nr>-<kurzname>` (etwa `12-serien-pause`) aus dem aktuellen `origin/develop`, im Worktree `.claude/worktrees/<nr>-<kurzname>`.
3. **Arbeit.** Wie bisher: Tests zuerst, vor jedem Commit `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Commit-Nachrichten wie bisher (`feat:`, `fix:`, `docs:`, `chore:`), ohne Attributionszeilen.
4. **PR nach `develop`.** Branch pushen, PR öffnen. Titel wie die Commit-Nachricht. Text: was sich ändert, wie geprüft, `Refs #<nr>`, bei Migration der Hinweis darauf. Ohne Attributionszeilen.
5. **CI.** Der Workflow läuft auf dem PR. Rot: auf dem Branch beheben, nie rot mergen. Hängt oder fällt GitHub Actions selbst aus: melden, nicht ohne CI mergen.
6. **Merge nach `develop`.** Grün und kein `review`: Claude mergt mit Merge-Commit (entspricht `--no-ff`) und löscht den Branch auf GitHub und lokal, Worktree entfernen.
7. **Release-PR `develop` → `main`.** Direkt danach. Titel `Release: <kurze Zusammenfassung>`, Text mit `Closes #<nr>` für jedes enthaltene Issue. GitHub schließt Issues nur über PRs in den Standard-Branch `main`; so schließt sich das Issue genau dann, wenn die Änderung live geht. CI läuft erneut auf dem Gesamtstand. Grün: Merge mit Merge-Commit.
8. **Deploy.** Im Hauptverzeichnis (`main`, sauber) `git pull --ff-only` für `main` und `develop`, dann `npx vercel@65.12.1 deploy --prod`. Migrationen wie bisher vorher prüfen (additiv). Danach prüfen, dass die Produktionsadresse antwortet, und Ergebnis melden (Issue, PR, Deploy).

Ändert eine Änderung nur Dokumentation oder CI (nichts, was in den Bau eingeht), entfällt der Deploy (Entscheidung von Claude). Das Issue schließt sich trotzdem mit dem Release-PR.

Ein eigener Push von `main` und `develop` entfällt: Beide Branches entstehen jetzt durch Merges auf GitHub, lokal wird nur nachgezogen.

## CI-Workflow

`.github/workflows/ci.yml`, ausgelöst durch `pull_request` (Ziel `develop` oder `main`). Ein Job auf `ubuntu-latest`: Checkout, Node 24 (wie `engines`), `npm ci` mit npm-Cache, `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Kein `next build` (braucht Produktionsvariablen; der Bau läuft beim Deploy). Keine Geheimnisse nötig, die Tests nutzen PGlite.

Kosten: etwa 3 Minuten je Lauf, zwei Läufe je Änderung. Das kostenlose Kontingent für private Repositories (2000 Minuten im Monat) reicht für mehrere hundert Änderungen.

## Superpowers

Der Ablauf bleibt bei den Superpowers-Skills (Entscheidung des Auftraggebers, statt der Skills von Matt Pocock).

- Kleine Änderung: Issue, Branch, TDD, PR.
- Größere Funktion: Das Issue hält Was und Warum fest. Entwurf (`docs/superpowers/specs/`) und Plan (`docs/superpowers/plans/`) entstehen wie bisher auf dem Issue-Branch und kommen mit dem Code in denselben PR. Das Issue verweist auf den Entwurf.
- `finishing-a-development-branch`: Die CLAUDE.md legt die Wahl fest (immer Push und PR nach `develop`), die Rückfrage entfällt.

## Konten

- `git push` über den SSH-Alias `github-privat` (Remote `origin`).
- Jeder `gh`-Befehl in diesem Repository mit `GH_TOKEN=$(gh auth token --user derBinder)`, damit das aktive `gh`-Konto des Auftraggebers keine Rolle spielt.

## Was sich ändert

- Neu: `.github/workflows/ci.yml`, Label `review` im Repository.
- `CLAUDE.md`: Abschnitt „Ablauf bis Produktion“ durch den Ablauf oben ersetzen; Git-Regel (Push nur Arbeits-Branches für PRs, kein Force-Push auf `main`/`develop`, Merges nach `develop`/`main` nur über PRs); Ausnahme bei fremden Diensten um GitHub (Issues, PRs, Actions) erweitern.
- `docs/bereitstellung.md`: Abschnitt „Git“ an den neuen Ablauf anpassen.

## Dem Umsetzenden überlassen

- Exakte Versionen der Actions (`actions/checkout`, `actions/setup-node`), fest angegeben.
- Formulierungen in CLAUDE.md und `docs/bereitstellung.md`.
- Die Umsetzung selbst läuft schon nach dem neuen Ablauf (Issue, PR, CI), soweit der Workflow dafür schon existiert.
