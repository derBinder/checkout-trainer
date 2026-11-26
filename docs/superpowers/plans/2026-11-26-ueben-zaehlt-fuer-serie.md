# Üben zählt für die Serie: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Tag mit mindestens einer geübten Karte oder Aufgabe verlängert die Serie wie ein Tag mit einer Bewertung.

**Architecture:** Eine neue Tabelle `practice_day` hält je Nutzer und Berliner Tag eine Zeile. Eine Server Action schreibt sie beim ersten Tipp auf eine Bewertung in einer Übungsrunde. Die Serie liest Lerntage und Übungstage als eine Menge, `streakOf` bleibt unverändert.

**Tech Stack:** Next.js 16 (Server Action), Drizzle mit PGlite in Tests, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-26-ueben-zaehlt-fuer-serie-design.md`

## Global Constraints

- Tests zuerst. Vor jedem Commit `npm run test:coverage`, `npm run typecheck` und `npm run lint`.
- Commit-Nachrichten englisch, mit `Refs #81`, ohne Attributionszeilen und ohne `Closes`/`Fixes`.
- Üben schreibt nie in `review_log` oder `card_state`.
- Keine Meldung und kein sichtbarer Zustand für das Speichern, auch nicht bei Fehlern.
- Alle Texte nur in `src/i18n/dictionaries/de.ts` und `en.ts`.
- `src/lib/db/schema.ts` von Hand ändern, die Migration mit `npm run db:generate` erzeugen. Sie darf nur `CREATE TABLE` und den Fremdschlüssel enthalten.
- Vor Arbeit an der Server Action die Next.js-Dokumentation unter `node_modules/next/dist/docs/` lesen.

## Review Focus

- Übung zwischen 0 und 1 Uhr Berliner Zeit: Der Tag ist der Berliner Tag, nicht der UTC-Tag. Test in Task 1.
- Aufruf der Action ohne Sitzung oder mit nicht freigeschaltetem Konto: Es wird nichts geschrieben und nichts geworfen. Test in Task 3.
- Die Action schlägt fehl oder das Gerät ist offline: Die Runde läuft weiter, es erscheint kein `role="alert"`. Test in Task 3.
- Zweite Runde oder doppelter Aufruf am selben Tag: kein Fehler, weiter genau eine Zeile. Test in Task 1.
- Lernen und Üben am selben Tag, und Übungstage eines anderen Nutzers: Der Tag zählt einmal, fremde Tage zählen nicht. Tests in Task 2.

## Dateien

| Datei | Aufgabe |
|---|---|
| `src/lib/db/schema.ts` | Tabelle `practiceDay` |
| `drizzle/0003_*.sql` | erzeugte Migration |
| `src/lib/practice/practice-day.ts` (neu) | `recordPracticeDay` |
| `src/lib/review/queries.ts` | `loadStreakDays`, `loadStatsData` mit Übungstagen |
| `src/lib/stats.ts` | `summarize` nimmt `practiceDays` |
| `src/app/[lang]/(app)/settings/reset-progress.ts` | löscht Übungstage |
| `src/app/[lang]/(app)/practice/actions.ts` (neu) | Server Action `recordPractice` |
| `src/components/practice/use-practice-day.ts` (neu) | Hook, ruft die Action einmal je Runde |
| `src/components/practice/practice-routes-round.tsx`, `math-round.tsx` | rufen den Hook |
| `src/components/today/today-data.tsx`, `src/components/stats/stats-data.tsx` | nutzen die neuen Lader |
| `src/i18n/dictionaries/de.ts`, `en.ts` | `today.streakPaused` |

---

### Task 1: Übungstage speichern und zurücksetzen

**Files:**
- Modify: `src/lib/db/schema.ts`, `src/app/[lang]/(app)/settings/reset-progress.ts`
- Create: `src/lib/practice/practice-day.ts`, `drizzle/0003_*.sql`
- Test: `src/lib/practice/practice-day.test.ts`, `src/app/[lang]/(app)/settings/reset-progress.test.ts`

**Interfaces:**
- Produces: `practiceDay` (Drizzle-Tabelle `practice_day`, Spalten `userId` als `user_id` und `day`, Primärschlüssel aus beiden, `user_id` mit `onDelete: "cascade"`)
- Produces: `recordPracticeDay(db: Db, userId: string, now: Date): Promise<void>`

- [ ] **Step 1: Vorbereitung.** Im Worktree `npm ci` ausführen.

- [ ] **Step 2: Fehlschlagende Tests schreiben** in `practice-day.test.ts`, mit `createTestDb()` und einem Nutzer wie in `src/lib/review/review.test.ts`:

```ts
it("writes the Berlin day once", async () => {
  await recordPracticeDay(db, "u1", new Date("2026-11-11T10:00:00Z"));
  await recordPracticeDay(db, "u1", new Date("2026-11-11T18:00:00Z"));
  expect(await db.select().from(practiceDay)).toEqual([{ userId: "u1", day: "2026-11-11" }]);
});
it("uses the Berlin day after midnight in Berlin", async () => {
  await recordPracticeDay(db, "u1", new Date("2026-11-11T23:30:00Z"));
  expect((await db.select().from(practiceDay))[0].day).toBe("2026-11-12");
});
it("removes the days with the account", async () => {
  await recordPracticeDay(db, "u1", now);
  await db.delete(user).where(eq(user.id, "u1"));
  expect(await db.select().from(practiceDay)).toEqual([]);
});
```

In `reset-progress.test.ts` einen Test ergänzen: Nach `recordPracticeDay` und `resetProgress` für denselben Nutzer ist `practice_day` für ihn leer, die Zeile eines zweiten Nutzers bleibt.

- [ ] **Step 3: Tests laufen lassen.** `npx vitest run src/lib/practice/practice-day.test.ts "src/app/[lang]/(app)/settings/reset-progress.test.ts"`. Erwartet: FAIL, weil `practiceDay` und `recordPracticeDay` fehlen.

- [ ] **Step 4: Umsetzen.**
  - Tabelle `practiceDay` in `schema.ts` neben `reviewLog`.
  - `npm run db:generate`, die erzeugte SQL-Datei lesen und gegen Global Constraints prüfen.
  - `recordPracticeDay`: `insert` mit `dayKey(now)` aus `@/lib/time` und `onConflictDoNothing()`.
  - `resetProgress`: `practiceDay` in derselben Transaktion löschen, den Kommentar der Funktion um die Übungstage ergänzen.

- [ ] **Step 5: Tests laufen lassen.** Derselbe Befehl, dazu `npx vitest run src/lib/db`. Erwartet: PASS.

- [ ] **Step 6: Commit.** `feat: store practice days`

---

### Task 2: Serie liest Übungstage

**Files:**
- Modify: `src/lib/review/queries.ts`, `src/lib/stats.ts`, `src/components/today/today-data.tsx`, `src/components/stats/stats-data.tsx`
- Test: `src/lib/stats.test.ts`, bestehende Tests zu `today-data` und `stats-data`

**Interfaces:**
- Consumes: `practiceDay`, `recordPracticeDay` aus Task 1
- Produces: `loadStreakDays(db: Db, userId: string): Promise<string[]>`. Ersetzt `loadReviewDays`. Liefert Lerntage und Übungstage, Doppelte sind erlaubt.
- Produces: `loadStatsData` liefert zusätzlich `practiceDays: string[]`.
- Produces: `StatsInput` bekommt `practiceDays?: string[]`.

- [ ] **Step 1: Fehlschlagende Tests schreiben** in `stats.test.ts`:

```ts
it("extends the streak on a day with practice only", () => {
  const s = summarize({ states: [], logs: logsOn(1, 2), practiceDays: [dayKey(now)], now });
  expect(s.streak).toEqual({ days: 3, paused: false, today: true });
});
it("counts a day with study and practice once", () => {
  const s = summarize({ states: [], logs: logsOn(0), practiceDays: [dayKey(now)], now });
  expect(s.streak.days).toBe(1);
});
it("keeps practice out of counts and hardest rests", () => {
  const s = summarize({ states: [], logs: [], practiceDays: [dayKey(now)], now });
  expect(s.counts).toEqual({ new: 169, learning: 0, known: 0 });
  expect(s.hardest).toEqual([]);
});
```

Den bestehenden Test „computes the same streak from the Berlin days alone“ um einen Übungstag erweitern: `streakOf` über Lerntage plus Übungstag ergibt dieselbe Serie wie `summarize` mit `practiceDays`. So fällt auf, wenn eine der beiden Seiten die Übungstage vergisst.

Die bestehenden Tests zu `loadReviewDays` auf `loadStreakDays` umstellen und ergänzen: Ein Nutzer mit einer Bewertung am 10.11. und einem Übungstag am 11.11. bekommt beide Tage. Der Übungstag eines zweiten Nutzers fehlt. `loadStatsData` liefert für denselben Nutzer `practiceDays: ["2026-11-11"]`.

- [ ] **Step 2: Tests laufen lassen.** `npx vitest run src/lib/stats.test.ts`. Erwartet: FAIL.

- [ ] **Step 3: Umsetzen.**
  - `loadReviewDays` in `loadStreakDays` umbenennen. Die Funktion fragt zusätzlich `practice_day` des Nutzers ab und hängt die Tage an.
  - `loadStatsData` lädt `practiceDays` als dritte Abfrage im selben `Promise.all`.
  - `summarize` bildet die Tagesmenge aus den Bewertungen und `practiceDays ?? []`.
  - `today-data.tsx` ruft `loadStreakDays`, `stats-data.tsx` gibt `practiceDays` an `summarize` weiter. `restDates` bekommt weiter nur `states` und `logs`.
  - Den Kommentar zu `Stats.streak` anpassen: Tage mit Bewertung oder Übung.

- [ ] **Step 4: Tests laufen lassen.** `npx vitest run src/lib src/components/today src/components/stats`. Erwartet: PASS.

- [ ] **Step 5: Commit.** `feat: count practice days towards the streak`

---

### Task 3: Übungsrunden melden den Tag

**Files:**
- Create: `src/app/[lang]/(app)/practice/actions.ts`, `src/components/practice/use-practice-day.ts`
- Modify: `src/components/practice/practice-routes-round.tsx`, `src/components/practice/math-round.tsx`
- Test: `src/app/[lang]/(app)/practice/actions.test.ts`, `src/components/practice/practice-routes-round.test.tsx`, `src/components/practice/math-round.test.tsx`

**Interfaces:**
- Consumes: `recordPracticeDay` aus Task 1
- Produces: `recordPractice(): Promise<void>`, Server Action ohne Argumente
- Produces: `usePracticeDay(): () => void`. Die Rückgabe ruft `recordPractice` beim ersten Aufruf je eingehängter Runde, danach nichts mehr. Fehler werden verschluckt.

- [ ] **Step 1: Fehlschlagende Tests für die Action schreiben.** `@/lib/db` mit `vi.hoisted` und `createTestDb()` mocken wie in `src/app/[lang]/(app)/settings/server-actions.test.ts`, `getSessionUser` aus `@/lib/auth/guard` wie in `src/lib/review/review.test.ts`. Die Action danach mit `await import("./actions")` laden:
  - aktiver Nutzer: Danach steht in `practice_day` eine Zeile mit seinem Nutzer und dem heutigen Berliner Tag.
  - keine Sitzung: keine Zeile, der Aufruf löst mit `undefined` auf.
  - Nutzer mit `status: "pending"`: keine Zeile.

- [ ] **Step 2: Fehlschlagende Tests für die Runden schreiben.** In beiden Testdateien die Action mocken:

```ts
const recordPractice = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/app/[lang]/(app)/practice/actions", () => ({ recordPractice }));
```

  `math-round.test.tsx` importiert `MathRound` heute statisch. Mit `vi.hoisted` bleibt das möglich.

  - „Wege“: Vor der ersten Bewertung ist `recordPractice` nicht aufgerufen. Nach „Weiter“ auf der ersten Karte genau einmal. Nach der zweiten Karte weiter genau einmal. Dasselbe mit „Nochmal“ als erster Bewertung.
  - „Rechnen“: Nach Zifferneingabe nicht aufgerufen, nach „Prüfen“ der ersten Aufgabe genau einmal, nach der zweiten Aufgabe weiter genau einmal.
  - Fehler: Mit `recordPractice.mockRejectedValueOnce(new Error("offline"))` zeigt die Runde nach der ersten Bewertung die nächste Karte, und `screen.queryByRole("alert")` ist `null`.

  Dieselbe `vi.mock`-Zeile auch in `practice-host.test.tsx` ergänzen, sonst lädt der Test die Datenbank.

- [ ] **Step 3: Tests laufen lassen.** `npx vitest run src/components/practice "src/app/[lang]/(app)/practice"`. Erwartet: FAIL.

- [ ] **Step 4: Umsetzen.**
  - `recordPractice`: `"use server"`, Sitzung mit `getSessionUser()` prüfen wie `submitReview` in `src/lib/review/actions.ts`. Ohne aktiven Nutzer still zurückkehren. Sonst `recordPracticeDay(db, u.id, new Date())`. Kein `revalidatePath`, wie bei `submitReview`.
  - `usePracticeDay`: merkt sich den Aufruf in einem `useRef` und ruft `void recordPractice().catch(() => {})`.
  - „Wege“: der Hook wird in `rate` vor `dispatch` aufgerufen.
  - „Rechnen“: der Hook wird in `onCheck` vor `dispatch` aufgerufen.
  - Ein Tipp, den der Tippschutz verwirft, darf den Tag schon melden. Das ist gewollt, weil die Karte dann aufgedeckt ist.

- [ ] **Step 5: Tests laufen lassen.** Derselbe Befehl. Erwartet: PASS.

- [ ] **Step 6: Commit.** `feat: record the practice day on the first practiced card`

---

### Task 4: Hinweis auf der Heute-Seite

**Files:**
- Modify: `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts`, `src/components/today/today-data.tsx`
- Test: `src/components/today/today-data.test.tsx`

- [ ] **Step 1: Fehlschlagenden Test schreiben.** Pausierte Serie, nichts fällig, nichts neu, `unseenCount` 0: Der Text `de.today.streakPaused` ist sichtbar. Einen bestehenden Test, der für diesen Fall das Gegenteil prüft, entsprechend umkehren.

- [ ] **Step 2: Test laufen lassen.** `npx vitest run src/components/today`. Erwartet: FAIL.

- [ ] **Step 3: Umsetzen.**
  - Die Bedingung in `TodayOverview` wird zu `streak.paused`.
  - `today.streakPaused` wörtlich:
    - de: `Lerne oder übe heute, damit deine Serie weiterläuft. Pro Woche darfst du einen Tag auslassen.`
    - en: `Study or practice today to keep your streak going. You can skip one day per week.`

- [ ] **Step 4: Tests laufen lassen.** `npx vitest run src/components/today src/i18n`. Erwartet: PASS.

- [ ] **Step 5: Commit.** `feat: mention practice in the paused streak hint`

---

### Task 5: Gesamtprüfung und Browser

- [ ] **Step 1: Prüfungen.** `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Erwartet: alle drei ohne Fehler, Coverage über 80 % in Backend und Frontend.

- [ ] **Step 2: Lokale Dateien und Datenbank im Worktree.** `.env.local` aus dem Hauptverzeichnis in den Worktree kopieren, sie ist gitignored. `.claude/launch.json` ist eingecheckt. Der Worktree hat eine eigene, leere `.data/pglite`. `npm run db:migrate` ausführen und das Testkonto mit `seedAdmin` neu anlegen, wie in `CLAUDE.md` unter „Testkonto für den Browser“ beschrieben. Das Passwort in `.data/test-user.json` des Worktrees ablegen.

- [ ] **Step 3: Im Browser prüfen**, am Smartphone-Viewport, mit dem Launch-Eintrag aus `.claude/launch.json`:
  - Frisches Konto ohne Serie: eine Karte in „Wege“ bewerten, die Runde abbrechen, zur Heute-Seite wechseln. Das Schildchen zeigt „1 Tag“ kräftig gelb.
  - „Rechnen“: Das Konto hat jetzt schon einen Übungstag, das Schildchen zeigt die Wirkung nicht mehr. Stattdessen in den Netzwerkanfragen prüfen, dass das erste „Prüfen“ genau eine Anfrage der Action auslöst und das zweite keine.
  - Die Statistik zeigt dasselbe Schildchen, die Zähler sind unverändert.
  - Während der Übung erscheint keine Meldung, die Runde stockt nicht.
  - Abgelaufene Sitzung: Mitten in einer Runde das Sitzungs-Cookie löschen und eine Karte bewerten. `proxy.ts` beantwortet die Anfrage dann mit 307. Die Runde zeigt keinen Fehler und läuft weiter.
  - Vergleich mit dem Lernen: Nach einer Bewertung in der Lernsitzung und nach einer geübten Karte jeweils über die Navigation und über „Zurück“ zur Heute-Seite wechseln. Nur wenn die Heute-Seite nach dem Üben älter ist als nach dem Lernen, in `recordPractice` nach dem Schreiben `revalidatePath("/[lang]/(app)/today", "page")` und `revalidatePath("/[lang]/(app)/stats", "page")` ergänzen, dazu einen Test, und erneut prüfen. Die laufende Runde muss das Neurendern überstehen.

- [ ] **Step 4: Abschluss.** Push und PR nach `develop` laut `CLAUDE.md`, Abschnitt „Feature“. Der PR-Text nennt die additive Migration.
