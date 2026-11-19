# Entwicklungsablauf mit Issues, PRs und CI – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jede Änderung läuft künftig über Issue, PR nach `develop`, GitHub Actions und Release-PR nach `main`; diese Umstellung selbst ist der erste Durchlauf.

**Architecture:** Ein GitHub-Actions-Workflow führt bei jedem PR die drei Pflichtprüfungen aus. CLAUDE.md und `docs/bereitstellung.md` beschreiben den neuen Ablauf. Am App-Code ändert sich nichts, deshalb gibt es keinen Deploy.

**Tech Stack:** GitHub Actions, `gh` CLI, npm, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-19-dev-prozess-design.md](../specs/2026-11-19-dev-prozess-design.md)

## Global Constraints

- Repository `derBinder/checkout-trainer`, Remote `origin` = `git@github-privat:derBinder/checkout-trainer.git`.
- Jeder `gh`-Befehl mit `GH_TOKEN=$(gh auth token --user derBinder)` davor. Unten abgekürzt als `GHP` (in der Shell: `GHP() { GH_TOKEN=$(gh auth token --user derBinder) gh "$@"; }`).
- Arbeit im Worktree `.claude/worktrees/dev-prozess` (Branch `chore/dev-prozess`, aus `origin/develop`, Entwurf und Plan liegen dort schon ungetrackt). Task 1 benennt beides nach der Issue-Nummer um.
- Kein Force-Push, keine Attributionszeilen in Commits, PRs oder Issues.
- Merge auf GitHub immer als Merge-Commit (`gh pr merge --merge`), nie Squash oder Rebase.
- Workflow: Auslöser nur `pull_request` auf `develop` und `main`; Node 24; kein `next build`; keine Geheimnisse.
- Action-Versionen fest: `actions/checkout@v7.0.1`, `actions/setup-node@v7.1.0` (beide älter als zwei Wochen, siehe Safe-chain-Regel).
- Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Im Worktree fehlt `node_modules`: vorher `ln -s ../../../node_modules node_modules`, Link vor dem Commit wieder entfernen (nicht committen).
- Kein Deploy: Die Änderung betrifft nur Dokumentation und CI.

## Review Focus

- Der Runner läuft in UTC, lokal gilt Europe/Berlin. Erwartung: alle Tests grün. Lokal mit `TZ=UTC npx vitest run` bereits geprüft (1173 grün); der CI-Lauf in Task 4 bestätigt es.
- `npm ci` auf Node 24 mit der Lock-Datei, die lokal unter Node 26 / npm 11 entstand. Erwartung: Installation klappt. Schlägt sie fehl, melden und nicht die Lock-Datei neu erzeugen.
- `gh` unter dem falschen Konto: `fbinder-mw` sieht das Repo nicht. Task 1 prüft das Konto, bevor etwas angelegt wird.
- Das Issue darf sich beim Merge nach `develop` nicht schließen, erst mit dem Release-PR nach `main`. Task 4 prüft beide Zustände.
- Ein roter CI-Lauf wird nie gemergt. Task 4 wartet mit `gh pr checks --watch` und mergt nur bei Exit-Code 0.

---

### Task 1: Issue, Label und Branch

**Files:** keine.

**Interfaces:**
- Produces: Issue-Nummer `N`, Branch `N-dev-prozess`, Worktree `.claude/worktrees/N-dev-prozess`, Label `review`.

- [ ] **Step 1: Konto prüfen**

Run: `GHP api user --jq .login`
Expected: `derBinder`

- [ ] **Step 2: Label anlegen**

Run: `GHP label create review --color FBCA04 --description "Vor dem Merge dem Auftraggeber zeigen" -R derBinder/checkout-trainer`
Expected: Label erscheint in `GHP label list -R derBinder/checkout-trainer`.

- [ ] **Step 3: Issue anlegen**

`GHP issue create -R derBinder/checkout-trainer --label documentation --title "Entwicklungsablauf mit Issues, PRs und CI"`, Text: zwei, drei Sätze Was und Warum aus dem Abschnitt „Worum es geht“ des Entwurfs, Verweis auf `docs/superpowers/specs/2026-11-19-dev-prozess-design.md`. Nummer als `N` merken.

- [ ] **Step 4: Branch und Worktree umbenennen, Upstream lösen**

Aus dem Hauptverzeichnis:
```bash
git worktree move .claude/worktrees/dev-prozess .claude/worktrees/N-dev-prozess
git -C .claude/worktrees/N-dev-prozess branch -m chore/dev-prozess N-dev-prozess
git -C .claude/worktrees/N-dev-prozess branch --unset-upstream
```
Expected: `git -C .claude/worktrees/N-dev-prozess status -sb` zeigt `## N-dev-prozess` ohne `...origin/develop`.

### Task 2: CI-Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: Check mit dem Namen `check` (Job-ID) am PR; Task 4 wartet darauf.

- [ ] **Step 1: Workflow schreiben**

`name: CI`; `on: pull_request: branches: [develop, main]`; `permissions: contents: read`; `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`. Ein Job `check` auf `ubuntu-latest`, `timeout-minutes: 15`, Schritte: `actions/checkout@v7.0.1`; `actions/setup-node@v7.1.0` mit `node-version: 24`, `cache: npm`; `npm ci`; `npm run test:coverage`; `npm run typecheck`; `npm run lint`.

- [ ] **Step 2: YAML prüfen**

Run: `ruby -ryaml -e 'p YAML.load_file(".github/workflows/ci.yml").keys'`
Expected: `["name", true, "permissions", "concurrency", "jobs"]` (Ruby liest `on` als `true`; das ist richtig). Der echte Nachweis ist der grüne Lauf in Task 4.

### Task 3: CLAUDE.md und Bereitstellungsdoku

**Files:**
- Modify: `CLAUDE.md` (Regeln „Kein Zugriff auf …“ und „Git: …“, Abschnitt „Ablauf bis Produktion“)
- Modify: `docs/bereitstellung.md` (Abschnitt „Git“, Absatz ab „Seit November 2026 pusht der Erbauer …“)

**Interfaces:**
- Consumes: Label `review` (Task 1), Job `check` (Task 2).

- [ ] **Step 1: Regel „fremde Dienste“**

Ausnahme erweitern: Prod-Deploy sowie Issues, PRs, Merges und Push von Arbeits-Branches auf GitHub im Abschnitt „Ablauf bis Produktion“, dauerhaft freigegeben.

- [ ] **Step 2: Git-Regel**

Ersetzen durch: Remote `origin` über den SSH-Alias `github-privat`; jeder `gh`-Befehl mit `GH_TOKEN=$(gh auth token --user derBinder)`. Gepusht werden nur Arbeits-Branches für PRs. `develop` und `main` ändern sich nur durch Merges von PRs auf GitHub (Merge-Commit), lokal nur nachziehen (`git pull --ff-only`). Kein Force-Push. Keine Attributionszeilen in Commits, PRs und Issues.

- [ ] **Step 3: Abschnitt „Ablauf bis Produktion“**

Die acht Schritte aus dem Entwurf (Abschnitt „Ablauf“) knapp übernehmen, mit: Branch `<nr>-<kurzname>` aus `origin/develop` im Worktree `.claude/worktrees/<nr>-<kurzname>`; PR-Text mit `Refs #<nr>`; Merge nach grünem CI durch Claude, außer Label `review` oder „erst zeigen“; Release-PR mit `Closes #<nr>`; Deploy unverändert (`npx vercel@65.12.1 deploy --prod` aus `main`, Migrationsprüfung wie bisher), entfällt bei reinen Doku- oder CI-Änderungen; nie rot mergen. Dazu ein Satz zu Superpowers: Entwurf und Plan auf dem Issue-Branch, im selben PR; bei `finishing-a-development-branch` immer Push und PR nach `develop`, ohne Rückfrage.

- [ ] **Step 4: `docs/bereitstellung.md`**

Den Absatz so ändern, dass er sagt: Änderungen kommen über PRs auf GitHub nach `develop` und `main`, bereitgestellt wird weiter per CLI. Den Rest des Absatzes (spätere Git-Anbindung bei Vercel, Previews) stehen lassen.

- [ ] **Step 5: Gegenlesen**

Run: `grep -n "push\|Push" CLAUDE.md docs/bereitstellung.md`
Expected: Keine Stelle mehr, die „nie pushen“ oder „nach jedem Deploy `git push origin main develop`“ verlangt.

### Task 4: Erster Durchlauf

**Files:** keine neuen.

**Interfaces:**
- Consumes: `N`, Branch `N-dev-prozess` (Task 1), Job `check` (Task 2).

- [ ] **Step 1: Pflichtprüfungen**

Run: `npm run test:coverage && npm run typecheck && npm run lint` (mit `node_modules`-Link, danach Link entfernen)
Expected: alles grün, Abdeckung über den Schwellen.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml CLAUDE.md docs/bereitstellung.md docs/superpowers/specs/2026-11-19-dev-prozess-design.md docs/superpowers/plans/2026-11-19-dev-prozess.md
git commit -m "chore: develop via issues, pull requests and CI"
```

- [ ] **Step 3: Push und PR nach `develop`**

`git push -u origin N-dev-prozess`, dann `GHP pr create -R derBinder/checkout-trainer --base develop --head N-dev-prozess`, Titel wie die Commit-Nachricht, Text: was sich ändert, wie geprüft, `Refs #N`.

- [ ] **Step 4: CI abwarten**

Run: `GHP pr checks <PR> -R derBinder/checkout-trainer --watch`
Expected: `check` pass, Exit-Code 0. Rot: Ursache beheben, neuer Commit, erneut warten.

- [ ] **Step 5: Merge nach `develop`**

`GHP pr merge <PR> -R derBinder/checkout-trainer --merge --delete-branch`
Expected: `GHP issue view N -R derBinder/checkout-trainer --json state` zeigt `OPEN`.

- [ ] **Step 6: Release-PR nach `main`**

`GHP pr create -R derBinder/checkout-trainer --base main --head develop --title "Release: Entwicklungsablauf mit Issues, PRs und CI"`, Text mit `Closes #N`. CI wie Step 4 abwarten, dann `GHP pr merge <PR> -R derBinder/checkout-trainer --merge` (ohne `--delete-branch`).
Expected: Issue `N` ist `CLOSED`.

- [ ] **Step 7: Lokal nachziehen und aufräumen**

Aus dem Hauptverzeichnis (auf `main`, sauber):
```bash
git pull --ff-only origin main
git fetch origin develop:develop
git worktree remove .claude/worktrees/N-dev-prozess
git branch -d N-dev-prozess
```
Expected: `git status -sb` zeigt `## main...origin/main` ohne Abweichung; `git log -1 develop` gleich `origin/develop`. Kein Deploy.
