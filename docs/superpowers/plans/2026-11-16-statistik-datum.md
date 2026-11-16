# Statistik: Datum „gelernt am“ und „sicher seit“ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Detailblatt einer Zahl in der Statistik nennt bei Zahlen im Lernen „gelernt am …“ und bei sicheren Zahlen zusätzlich „sicher seit …“.

**Architecture:** `introducedAt` liefert „gelernt am“. „Sicher seit“ berechnet die neue reine Funktion `restDates` beim Laden: Sie spielt die Bewertungen jeder Rest- bzw. Bogey-Karte durch `rate()` ab. Der Datenbaustein der Statistik formatiert die Tage nach Sprache und reicht sie an `RestSheet`. Kein Schema-, Migrations- oder `applyReview`-Eingriff.

**Tech Stack:** Next.js 16, TypeScript, Drizzle (PGlite in Tests), ts-fsrs über `src/lib/srs/fsrs.ts`, Vitest und Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-16-statistik-datum-design.md](../specs/2026-11-16-statistik-datum-design.md)

## Global Constraints

- Tests zuerst. Vor jedem Commit laufen `npm run test:coverage`, `npm run typecheck` und `npm run lint` grün. Die Schwellen in `vitest.config.ts` werden nicht gesenkt.
- Nur lokal committen, nie pushen, keine Attributionszeilen in Commit-Nachrichten.
- Alle Oberflächentexte stehen in `src/i18n/dictionaries/` (`de.ts` ist die Quelle des Typs `Dictionary`, `en.ts` muss passen). Keine Emojis. Keine Tailwind-Klassen mit freien Werten in eckigen Klammern.
- Datumsformat: `01.01.2026` auf Deutsch (`de-DE`), `01/01/2026` auf Englisch (`en-GB`), Berliner Tag. Texte: „gelernt am …“ / „sicher seit …“ und „learned on …“ / „known since …“.
- Nutzerdaten werden nie gecacht und entstehen erst im Datenbaustein nach `requireActiveUser()`, nie im vorgerenderten Gerüst.
- Komponententests als `*.test.tsx` mit `// @vitest-environment jsdom` in der ersten Zeile, Eingaben mit user-event, Prüfung über Rollen und Texte.
- `src/lib/db/schema.ts`, Migrationen und `applyReview` bleiben unangetastet. `summarize` bleibt unverändert: Auch die Heute-Seite ruft es auf und soll nicht abspielen.

## Review Focus

Eingaben, die der Entwurf nicht ausdrücklich nennt und die in der Praxis auftreten. Erwartet wird jeweils kein Absturz und kein falsches Datum. Jede Zeile hat einen Test in der genannten Aufgabe.

1. Rest mit Lernstand, aber ohne Bewertungen im Log (Altdaten): „gelernt am“ erscheint, „sicher seit“ fehlt (Task 2).
2. Bewertungen der Zwei-Dart-, Fehlwurf- und Über-170-Karten desselben Rests oder unbekannter Karten-IDs fließen nicht in den Verlauf des Rests ein (Task 2).
3. Bewertung kurz vor Mitternacht UTC fällt auf den nächsten Berliner Tag, auch über den Jahreswechsel (Task 2 für `restDates`, Task 1 für die Jahresangabe).
4. Zwei Bewertungen mit gleichem `reviewedAt`: feste Reihenfolge über die `id` (Task 2, `loadStatsData`).
5. Eine sichere Bogey-Zahl bekommt wie jede andere die Daten (Task 2).

---

### Task 1: `formatDate` für Zahlenformat nach Sprache

**Files:**
- Modify: `src/lib/forecast.ts` (neben `formatDay`)
- Test: `src/lib/forecast.test.ts`

**Interfaces:**
- Produces: `formatDate(day: string, locale: Locale): string`. `day` ist ein Berliner Tag `YYYY-MM-DD` (Ausgabe von `dayKey`), Rückgabe der numerische Tag mit Jahr.

- [ ] **Step 1: Write the failing test** in `src/lib/forecast.test.ts`, `describe("formatDate")`:

```ts
expect(formatDate("2026-01-05", "de")).toBe("05.01.2026");
expect(formatDate("2026-01-05", "en")).toBe("05/01/2026");
expect(formatDate("2025-12-31", "de")).toBe("31.12.2025"); // Jahr bleibt immer stehen, auch im laufenden Jahr
```

- [ ] **Step 2: Run** `npx vitest run src/lib/forecast.test.ts`. Expected: FAIL, `formatDate` ist nicht exportiert.

- [ ] **Step 3: Implement** `formatDate` in `src/lib/forecast.ts` mit `Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })` auf `new Date(`${day}T12:00:00Z`)`, wie `formatDay` den Tag mittags liest.

- [ ] **Step 4: Run** `npx vitest run src/lib/forecast.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit** nach den drei Prüfbefehlen aus den Global Constraints:

```bash
git add src/lib/forecast.ts src/lib/forecast.test.ts
git commit -m "feat: add formatDate for numeric day in both languages"
```

---

### Task 2: `restDates` und die geladenen Daten

**Files:**
- Create: `src/lib/rest-dates.ts`, `src/lib/rest-dates.test.ts`
- Modify: `src/lib/stats.ts` (`levelOf` exportieren), `src/lib/review/queries.ts` (`loadStatsData`), `src/lib/srs/fsrs.ts` (Kommentar am Planer), `src/lib/stats.test.ts` (Test von `loadStatsData`)

**Interfaces:**
- Consumes: `levelOf(state: number, scheduledDays: number): Level` aus `src/lib/stats.ts` (jetzt exportiert), `rate(prev: SrsState | null, rating: Rating, now: Date): SrsState` und `Rating` aus `src/lib/srs/fsrs.ts`, `cardById` aus `@/lib/cards`, `dayKey` aus `@/lib/time`, `MIN_REST` und `MAX_REST` aus `@/lib/stats`.
- Produces:
  - `type RestDates = { learned: string; known?: string }` (Berliner Tage `YYYY-MM-DD`).
  - `restDates(input: { states: { cardId: string; state: number; scheduledDays: number; introducedAt: Date }[]; logs: { cardId: string; rating: number; reviewedAt: Date }[] }): Record<number, RestDates>`. Je ein Eintrag für jeden Rest 2 bis 170, dessen Rest- oder Bogey-Karte einen Lernstand hat, sonst kein Schlüssel.
  - `loadStatsData(db, userId)` liefert `states` jetzt mit `introducedAt: Date` und `logs` sortiert nach `reviewedAt`, dann `id`.

- [ ] **Step 1: Write the failing tests** in `src/lib/rest-dates.test.ts`. Ein Testhelfer `simulate(cardId, start, ratings)` spielt die Bewertungen durch `rate()` ab, jede folgende Bewertung zum `due` des vorigen Ergebnisses (mindestens einen Tag später), und liefert `{ logs, final: SrsState, trace: { reviewedAt: Date; level: Level }[] }`. So passen gespeicherter Stand und Bewertungen per Konstruktion zusammen; erwartete Daten ergeben sich aus `trace`, nicht aus festen Zahlen. Die Zeilen für `states` entstehen aus `final`. Tests:
  - `"gives only learned for a card in learning"`: Zeile `{ cardId: "r-40", state: State.Learning, scheduledDays: 0, introducedAt }`, keine Logs ergibt `{ 40: { learned: dayKey(introducedAt) } }`.
  - `"gives learned and known for a known card"`: so viele Gut-Bewertungen, bis die Zahl sicher ist; erwartet `known` ist der Tag der ersten Bewertung des abschließenden sicheren Abschnitts in `trace`.
  - `"resets known after a lapse and sets it again later"`: bis sicher, dann `Nochmal` (Rating 1), dann Gut bis wieder sicher; `learned` bleibt, `known` ist der Tag der neuen Wiederkehr, nicht der erste.
  - `"drops known while a lapsed card is not known again"`: bis sicher, dann `Nochmal`; erwartet nur `learned`.
  - `"drops known when the stored state and the replay disagree"`: gespeicherter Stand `Review` mit 30 Tagen, Log ist nur ein `Nochmal`; erwartet nur `learned`.
  - `"gives learned only when there are no logs"` (Review Focus 1): gespeicherter Stand sicher, `logs: []`; erwartet nur `learned`, kein Absturz.
  - `"ignores logs of other cards and unknown ids"` (Review Focus 2): Logs von `t-100`, `m-100-0`, `o-199` und `x-unknown` beeinflussen den Eintrag von Rest 100 nicht.
  - `"uses the Berlin day"` (Review Focus 3): `introducedAt` `2025-12-31T23:30:00Z` ergibt `learned: "2026-01-01"`.
  - `"also covers a bogey card"` (Review Focus 5): `b-169` sicher ergibt `{ 169: { learned, known } }`.
  - `"has no entry for a rest without state"`: leere Eingabe ergibt `{}`.
  - `"keeps log order for equal timestamps"` (Review Focus 4): zwei Logs gleicher Zeit in Reihenfolge (Gut, Nochmal) ergeben dasselbe Ergebnis, egal wie sie in `logs` stehen, solange `loadStatsData` sie so liefert: hier nur prüfen, dass `restDates` die Reihenfolge von gleichen Zeitstempeln beibehält (stabile Sortierung).

  In `src/lib/stats.test.ts`, `describe("loadStatsData")`:
  - Die vorhandene Erwartung ändert sich zu `expect(data.states).toEqual([{ cardId: "r-40", state: State.Review, scheduledDays: 30, introducedAt: now }])`.
  - Neu `"returns logs ordered by time, then id"`: drei Logs in ungeordneter Einfügereihenfolge, zwei davon mit gleicher `reviewedAt`; erwartet die Sortierung nach Zeit und bei Gleichstand nach Einfügereihenfolge (`id`).

- [ ] **Step 2: Run** `npx vitest run src/lib/rest-dates.test.ts src/lib/stats.test.ts`. Expected: FAIL (Modul fehlt, `introducedAt` fehlt, Reihenfolge nicht garantiert).

- [ ] **Step 3: Implement.**
  - `src/lib/stats.ts`: `levelOf` exportieren, sonst nichts ändern.
  - `src/lib/review/queries.ts`, `loadStatsData`: `introducedAt: cardState.introducedAt` zur Auswahl der Zustände, `.orderBy(reviewLog.reviewedAt, reviewLog.id)` an der Abfrage der Bewertungen (die Spalte `id` selbst wird nicht ausgewählt).
  - `src/lib/rest-dates.ts`: Für jede Zeile aus `states`, deren Karte (`cardById`) `kind === "rest"` oder `"bogey"` ist und deren `rest` zwischen `MIN_REST` und `MAX_REST` liegt: `learned = dayKey(introducedAt)`. Dann die Bewertungen dieser `cardId` (stabil nach `reviewedAt` sortiert, Gruppierung nach `cardId` einmal vorab) mit `rate()` abspielen, von `null` startend. Nach jedem Schritt: `levelOf(...) === "known"` setzt `known ??= dayKey(reviewedAt)`, sonst `known = undefined`. `known` bleibt nur, wenn zusätzlich `levelOf(gespeicherterStand) === "known"` gilt. Ein Eintrag je Rest ohne `known`-Schlüssel, wenn keiner da ist.
  - `src/lib/srs/fsrs.ts`: Kommentar am `scheduler`: Die Statistik („sicher seit“, `src/lib/rest-dates.ts`) spielt `review_log` mit diesen Parametern neu ab. Änderungen verschieben diese Daten, ohne dass etwas fehlschlägt.

- [ ] **Step 4: Run** `npx vitest run src/lib/rest-dates.test.ts src/lib/stats.test.ts src/components/today src/components/stats`. Expected: PASS. Die Tests der Seiten dürfen nichts melden: `loadStatsData` ist dort gemockt.

- [ ] **Step 5: Commit** nach den drei Prüfbefehlen:

```bash
git add src/lib/rest-dates.ts src/lib/rest-dates.test.ts src/lib/stats.ts src/lib/stats.test.ts src/lib/review/queries.ts src/lib/srs/fsrs.ts
git commit -m "feat: derive learned and known-since days per rest from the review log"
```

---

### Task 3: Anzeige im Detailblatt und Verdrahtung

**Files:**
- Modify: `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts` (Abschnitt `stats`), `src/components/rest-sheet.tsx`, `src/components/stats/stats-data.tsx`
- Test: `src/components/rest-sheet.test.tsx`, `src/components/stats/stats-data.test.tsx`

**Interfaces:**
- Consumes: `restDates` und `RestDates` (Task 2), `formatDate(day: string, locale: Locale): string` (Task 1), `getLocale()` aus `@/i18n/server`.
- Produces:
  - `t.stats.learnedOn(date: string): string` und `t.stats.knownSince(date: string): string`.
  - Neue Pflicht-Eigenschaft von `RestSheet`: `dates: Record<number, { learned: string; known?: string }>` mit **fertig formatierten** Texten wie `"01.01.2026"`.

- [ ] **Step 1: Write the failing tests.**
  - `src/components/rest-sheet.test.tsx`: `setup` bekommt eine Tabelle `dates` mit `dates[100] = { learned: "01.01.2026", known: "05.01.2026" }` und `dates[170] = { learned: "02.01.2026" }`; Rest 169 hat keinen Eintrag. Neue Tests:
    - `"nennt bei einer sicheren Zahl beide Daten"`: Dialog zu `"100, sicher"` enthält `gelernt am 01.01.2026` und `sicher seit 05.01.2026`.
    - `"nennt bei einer Zahl im Lernen nur das Lerndatum"`: Dialog zu `"170, im Lernen"` enthält `gelernt am 02.01.2026` und nicht `sicher seit`.
    - `"zeigt bei einer neuen Zahl kein Datum"`: Dialog zu `"169, neu, nicht checkbar"` enthält weder `gelernt am` noch `sicher seit`.
    - `"zeigt die Daten auf Englisch"`: `setup("en")`, Dialog enthält `learned on 01.01.2026` und `known since 05.01.2026`.
    - Alle bisherigen Tests laufen mit der neuen Eigenschaft unverändert weiter.
  - `src/components/stats/stats-data.test.tsx`: Die Lernstände im vorhandenen Test bekommen `introducedAt: new Date("2026-11-01T10:00:00Z")`. Neuer Test `"zeigt im Detailblatt das Lerndatum, aber kein falsches Sicher-seit-Datum"`: Zustand `r-5` sicher (30 Tage), Log nur ein `Nochmal`, dazu `r-7` im Lernen. Klick auf `"7, im Lernen, …"` zeigt `gelernt am 01.11.2026`. Klick auf `"5, sicher, …"` zeigt `gelernt am 01.11.2026` und kein `sicher seit` (Abweichung zwischen Stand und Abspielergebnis). Eine neue Zahl zeigt kein Datum. Die Tests der übrigen Fälle mit `states: []` bleiben unverändert.

- [ ] **Step 2: Run** `npx vitest run src/components/rest-sheet.test.tsx src/components/stats/stats-data.test.tsx`. Expected: FAIL (Eigenschaft `dates` und Texte fehlen).

- [ ] **Step 3: Implement.**
  - `de.ts`, `stats`: `learnedOn: (date: string) => `gelernt am ${date}``, `knownSince: (date: string) => `sicher seit ${date}``. `en.ts`: `learned on ${date}`, `known since ${date}`.
  - `RestSheet`: Eigenschaft `dates` ergänzen und an `RestDetailBody` reichen. Unter der Stufenzeile im `SheetHeader` je eine Zeile (`text-sm text-muted-foreground`, wie `SheetDescription`) für `learned` und, falls vorhanden, `known`. Hat der Rest keinen Eintrag, entfällt der Block ganz.
  - `stats-data.tsx`: In `loadStats` zusätzlich `dates: restDates({ states, logs })` zurückgeben (liegt im `cache()`, also pro Anfrage einmal). In `StatsOverview` `getLocale()` mitladen, die Tage mit `formatDate(day, locale)` in die formatierte Tabelle umsetzen und als `dates` an `RestSheet` reichen.

- [ ] **Step 4: Run** `npx vitest run src/components src/i18n`. Expected: PASS, auch `no-hardcoded-text.test.ts`.

- [ ] **Step 5: Run** `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Expected: alle grün, Schwellen von 80 % gehalten.

- [ ] **Step 6: Im Browser prüfen.** Entwicklungsserver über `preview_start` mit dem Launch-Eintrag `checkout-trainer` starten (Port 3000 belegt: `checkout-trainer-3001`), mit dem Testkonto aus `.data/test-user.json` anmelden, `/de/stats` öffnen und je eine Zahl im Lernen, eine sichere und eine neue antippen. Hat das Konto keine solchen Karten, vorher unter `/de/study` einige bewerten. Erwartet: Lern- und Sicher-Datum wie im Entwurf, bei neuen Zahlen keine Zeile. Danach `/en/stats` mit englischem Text. Ergebnis im Abschluss nennen, nicht nur „läuft“.

- [ ] **Step 7: Commit:**

```bash
git add src/i18n/dictionaries/de.ts src/i18n/dictionaries/en.ts src/components/rest-sheet.tsx src/components/rest-sheet.test.tsx src/components/stats/stats-data.tsx src/components/stats/stats-data.test.tsx
git commit -m "feat: show learned and known-since dates in the stats sheet"
```

---

## Self-Review

- **Spec-Abdeckung:** Anzeige und Format (Task 1, 3), „gelernt am“ aus `introducedAt` (Task 2), „sicher seit“ mit Rückfall-Regel und Sicherheitsnetz (Task 2), Heute-Seite bleibt unberührt (Global Constraints, `summarize` unverändert), Schema und `applyReview` unberührt, Hinweis am Planer (Task 2), Texte beider Sprachen (Task 3), Nutzerdaten nur im Datenbaustein (Task 3).
- **Abweichung vom Entwurf (dort nachgezogen):** Das Abspielen liegt in `src/lib/rest-dates.ts` statt in `summarize`, damit die Heute-Seite es nicht mitrechnet; die Reihenfolge bei gleichem Zeitstempel sichert `ORDER BY reviewedAt, id` in `loadStatsData`, statt die `id` in die Daten zu reichen.
- **Namen:** `restDates`, `RestDates`, `formatDate`, `learnedOn`, `knownSince`, `dates` heißen in allen Aufgaben gleich.
