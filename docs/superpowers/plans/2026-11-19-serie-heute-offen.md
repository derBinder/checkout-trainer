# Schildchen „Serie heute noch offen“ – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Serien-Schildchen zeigt hellgelb, dass die Serie heute noch nicht verlängert wurde, und wird nach der ersten Bewertung des Tages wieder kräftig gelb. Dazu kommt in die CLAUDE.md die Regel, Merge-Konflikte immer mit dem Skill `resolving-merge-conflicts` zu lösen (Wunsch des Auftraggebers, Teil von #4).

**Architecture:** `streakOf` in `src/lib/stats.ts` liefert zusätzlich `today` (heute mindestens eine Bewertung, Berliner Tag). `StreakChip` wählt aus `paused` und `today` eine von drei Darstellungen. Zwei neue Theme-Farben `streak-open` in `src/app/globals.css`. Keine Migration, keine neue Abfrage, kein neuer Text.

**Tech Stack:** Next.js 16, TypeScript, Tailwind (Theme-Tokens), Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-19-serie-heute-offen-design.md](../specs/2026-11-19-serie-heute-offen-design.md)

**Issue:** derBinder/checkout-trainer#4

## Global Constraints

- Worktree `.claude/worktrees/4-streak-open-today`, Branch `4-streak-open-today` (aus `origin/develop`, ohne Upstream). Entwurf und dieser Plan liegen dort ungetrackt und kommen mit dem Code in denselben PR.
- Ablauf bis Produktion laut CLAUDE.md (PR nach `develop` mit `Refs #4`, Code-Review `high` mit Absprache der Findings, CI, Merge, Release-PR mit `Closes #4`, Deploy). `gh` immer mit `GH_TOKEN=$(gh auth token --user derBinder)`.
- „Heute“ ist der Berliner Tag (`dayKey` aus `src/lib/time.ts`).
- Farben, wörtlich: hell `--streak-open: #fff6c2`, `--streak-open-foreground: #0b0b0c`; dunkel `--streak-open: #332b00`, `--streak-open-foreground: #ffd400`; im `@theme`-Block `--color-streak-open: var(--streak-open)` und `--color-streak-open-foreground: var(--streak-open-foreground)`.
- Klassen, wörtlich: verlängert `bg-accent text-accent-foreground`, offen `bg-streak-open text-streak-open-foreground`, pausiert `bg-muted text-muted-foreground`.
- Kein neuer Text, keine Wörterbuch-Änderung. Keine Tailwind-Klassen mit eckigen Klammern.
- Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Im Worktree fehlt `node_modules`: `ln -s ../../../node_modules node_modules`, nie committen.

## Review Focus

- Bewertung kurz nach Mitternacht Berliner Zeit (UTC noch Vortag): `today` muss `true` sein. Test in Task 1.
- „Heute offen“ und „pausiert“ dürfen nie gleich aussehen: pausiert hat Vorrang, `today` ist bei Pause immer `false`. Test in Task 2 (pausiert zeigt `bg-muted`, nicht `bg-streak-open`).
- Lesbarkeit im hellen und dunklen Design: nur im Browser prüfbar. Task 4.
- Nach der ersten Bewertung des Tages zurück auf „Heute“: Das Schildchen muss kräftig sein, auch wenn die Seite per Activity im Hintergrund lag. Task 4 prüft das im Browser.
- Statistik-Seite zeigt dasselbe Schildchen: gleiche Darstellung dort. Task 4.

---

### Task 1: `today` in der Serie

**Files:**
- Modify: `src/lib/stats.ts` (Typ `Streak`, Kommentar an `Stats.streak`, `streakOf`)
- Test: `src/lib/stats.test.ts`

**Interfaces:**
- Produces: `export type Streak = { days: number; paused: boolean; today: boolean }`. `today` ist `true`, wenn am Berliner Tag von `now` mindestens eine gültige Bewertung liegt. Dann ist `days` mindestens 1 und `paused` immer `false`.

- [ ] **Step 1: Neue Tests schreiben**

Im `describe` der Serie in `src/lib/stats.test.ts`:
```ts
it("marks the streak as extended today after a rating today", () => {
  expect(summarize({ states: [], logs: logsOn(0, 1), now }).streak).toEqual({ days: 2, paused: false, today: true });
});

it("leaves the streak open today when only yesterday is rated", () => {
  expect(summarize({ states: [], logs: logsOn(1, 2), now }).streak).toEqual({ days: 2, paused: false, today: false });
});

it("counts a rating just after midnight in Berlin as today", () => {
  const logs = [{ cardId: "r-2", rating: 3, reviewedAt: new Date("2026-11-09T23:30:00Z") }]; // Berlin 10.11. 00:30
  const s = summarize({ states: [], logs, now: new Date("2026-11-10T08:00:00Z") }); // Berlin 10.11. 09:00
  expect(s.streak).toEqual({ days: 1, paused: false, today: true });
});
```

- [ ] **Step 2: Bestehende Erwartungen ergänzen**

Jedes `toEqual({ days, paused })` auf `streak` bekommt `today`, mit dem Wert „liegt eine Bewertung am Berliner Tag von `now`“. Bei `logsOn(...)` mit dem Standard-`now`: `true` genau dann, wenn `0` unter den Argumenten ist. Pausierte Fälle und `days: 0` sind `false`; der Sommerzeit-Fall („bridges a gap across the DST change“, Bewertung am 25.10., `now` Berlin 25.10. 23:30) ist `true`.

- [ ] **Step 3: Tests laufen lassen, Fehlschlag sehen**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: FAIL, die neuen und ergänzten Erwartungen vermissen `today`.

- [ ] **Step 4: Umsetzen**

`Streak` um `today: boolean` erweitern, in `streakOf` als `days.has(dayKey(now))` setzen (der Ausdruck steht dort schon) und mit zurückgeben. Kommentar an `Stats.streak` um einen Satz zu `today` ergänzen.

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/lib/stats.test.ts && npm run typecheck`
Expected: PASS. Typecheck meldet nur noch die Testobjekte in `src/components/streak-chip.test.tsx` (fehlendes `today`); die behebt Task 2.

### Task 2: Schildchen mit drei Zuständen

**Files:**
- Modify: `src/app/globals.css` (`@theme`-Block neben `--color-verdict-soft…`, hell neben `--verdict-soft`, dunkel im `@variant dark` neben `--verdict-soft`)
- Modify: `src/components/streak-chip.tsx`
- Test: `src/components/streak-chip.test.tsx`

**Interfaces:**
- Consumes: `Streak` mit `today` (Task 1).

- [ ] **Step 1: Tests schreiben**

Bestehende Testobjekte ergänzen: nicht pausiert `today: true`, pausiert `today: false`. Neu:
```tsx
describe("StreakChip heute", () => {
  it("zeigt die heute verlängerte Serie kräftig", () => {
    render(<StreakChip streak={{ days: 5, paused: false, today: true }} />, { wrapper });
    expect(screen.getByText("5 Tage Serie").className).toContain("bg-accent");
  });

  it("zeigt die heute noch offene Serie hellgelb, ohne zusätzlichen Text", () => {
    render(<StreakChip streak={{ days: 5, paused: false, today: false }} />, { wrapper });
    const chip = screen.getByText("5 Tage Serie");
    expect(chip.className).toContain("bg-streak-open");
    expect(chip.className).toContain("text-streak-open-foreground");
  });

  it("zeigt die pausierte Serie grau, nicht als offen", () => {
    render(<StreakChip streak={{ days: 5, paused: true, today: false }} />, { wrapper });
    const chip = screen.getByText("5 Tage Serie · pausiert");
    expect(chip.className).toContain("bg-muted");
    expect(chip.className).not.toContain("bg-streak-open");
  });
});
```

- [ ] **Step 2: Fehlschlag sehen**

Run: `npx vitest run src/components/streak-chip.test.tsx`
Expected: FAIL bei „hellgelb“ (Klasse `bg-accent` statt `bg-streak-open`).

- [ ] **Step 3: Theme-Farben anlegen**

Die vier Variablen und zwei `@theme`-Einträge aus den Global Constraints, mit einem Kommentar wie bei `verdict-soft` (Kontrast 18 : 1, dunkel 9,9 : 1; gleiche Werte, eigener Name, damit Schildchen und Lernanzeige unabhängig bleiben).

- [ ] **Step 4: `StreakChip` umsetzen**

Klasse: `paused` → pausiert, sonst `today` → verlängert, sonst offen (Klassen aus den Global Constraints). Text unverändert.

- [ ] **Step 5: Prüfen und committen**

Run: `npm run test:coverage && npm run typecheck && npm run lint`
Expected: alles grün, Abdeckung über den Schwellen.
```bash
git add src/lib/stats.ts src/lib/stats.test.ts src/app/globals.css src/components/streak-chip.tsx src/components/streak-chip.test.tsx docs/superpowers/specs/2026-11-19-serie-heute-offen-design.md docs/superpowers/plans/2026-11-19-serie-heute-offen.md
git commit -m "feat: show a streak that is still open today in light yellow"
```

### Task 3: Konfliktregel in der CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (Abschnitt „Regeln“, nach der Regel „Git und GitHub: …“ und der Regel zu englischen Texten auf GitHub)

- [ ] **Step 1: Regel ergänzen**

Neuer Punkt: Merge-Konflikte (beim Nachziehen von `develop` in einen Branch, bei Merges, Rebases nur falls doch nötig) immer mit dem Skill `resolving-merge-conflicts` lösen (`/resolving-merge-conflicts`), nie von Hand oder per Skript. Das Ergebnis danach wie jeden Commit prüfen (`npm run test:coverage`, `npm run typecheck`, `npm run lint`).

- [ ] **Step 2: Prüfen und committen**

Run: `npm run test:coverage && npm run typecheck && npm run lint`
Expected: alles grün.
```bash
git add CLAUDE.md
git commit -m "docs: resolve merge conflicts with the resolving-merge-conflicts skill"
```

### Task 4: Ansicht im Browser

**Files:** keine.

- [ ] **Step 1: Dev-Server aus dem Worktree**

Ein Launch-Eintrag mit dem Worktree als Arbeitsverzeichnis (oder `cd` im Startbefehl), `node_modules` und `.data` per Symlink aus dem Hauptverzeichnis. PGlite erlaubt nur einen Prozess: Läuft im Hauptverzeichnis schon ein Dev-Server, diesen vorher anhalten. Ist Port 3000 belegt, Port 3001 mit `BETTER_AUTH_URL=http://localhost:3001`. Testkonto laut CLAUDE.md.

- [ ] **Step 2: Drei Zustände hell und dunkel ansehen**

Auf `/de/today` und `/de/stats` den echten Zustand des Testkontos ansehen. Die anderen beiden Zustände nur zur Ansicht per `javascript_tool` erzeugen (Klasse des Schildchens auf die Klassen aus den Global Constraints setzen), je hell und dunkel (`resize_window` mit `colorScheme`).
Expected: Text in allen sechs Fällen gut lesbar; „offen“ (hellgelb bzw. dunkel mit gelber Schrift) klar unterscheidbar von „pausiert“ (grau) und „verlängert“ (kräftig gelb). Screenshot je Theme für die Meldung.

- [ ] **Step 3: Nach einer Bewertung zurück auf „Heute“**

Ist das Schildchen beim Testkonto „offen“: eine Karte bewerten, über die Navigation zurück auf „Heute“. Expected: Schildchen kräftig gelb. Ist es schon „verlängert“, Schritt mit Begründung überspringen und im PR-Text vermerken.

- [ ] **Step 4: Abschluss**

Weiter nach CLAUDE.md, Ablauf ab Schritt 4 (Push, PR mit `Refs #4`, Code-Review mit `high` und Absprache der Findings mit dem Auftraggeber, CI, Merge, Release-PR mit `Closes #4`, Deploy, Produktionsadresse prüfen). Alle Texte auf GitHub auf Englisch.
