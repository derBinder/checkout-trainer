# Paket 2: Seite „Üben“ – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seite `/<lang>/practice` mit den Übungen „Wege“ (Karten nach Bereich und Kartenart, Runden à höchstens 20, ohne Speicherung) und „Rechnen“ (10 Aufgaben, Startrest 171–230, Bogey-Erkennung), Einstieg auf „Heute“.

**Architecture:** Reine Logik (Bereiche, Kartenart-Gruppen, Ziehung, Auswahl prüfen, Rechenaufgaben, Auflösungsdaten) liegt unter `src/lib/practice/`. Der Datenbaustein der Übungsseite ruft zuerst `requireActiveUser()` und liefert dann alle 402 Kartenansichten (wie die Lernsitzung: `cardView` + `checkFor`, gemessen 151 KB roh, 12 KB gzip) plus die Auflösungen der Reste 2–170 an eine Client-Komponente; der Client filtert, zieht und führt die Runde. Der Lernbildschirm (Kopfzeile, Frage, Eingabe, Auflösung, Fußzeile) wird aus `StudySession` in `SessionScreen` herausgelöst; Lernsitzung und Übungsrunde „Wege“ nutzen ihn mit demselben `studyReducer`, die Übung mit `save: false`.

**Tech Stack:** Next.js 16 (Cache Components), React 19, TypeScript, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-13-paket-2-ueben-design.md](../specs/2026-11-13-paket-2-ueben-design.md)

## Global Constraints

- Alle Regeln aus `CLAUDE.md`: Texte in `de.ts` und `en.ts`, keine Emojis, Icons nur aus `lucide-react` und nur wo nötig, keine freien Tailwind-Werte, Tests zuerst, Abdeckung ≥ 80 % getrennt für Backend und Frontend.
- Keine Datenbankänderung, keine Migration, keine schreibende Server Action. Übungen erzeugen keine Zeilen in `review_log` oder `card_state`.
- Cache Components: Gerüst ohne Lerninhalte; der Datenbaustein ruft zuerst `requireActiveUser()`, erst danach Kartendaten. Kein `use cache`.
- Seitenname englisch: `/<lang>/practice`. Nur aktive Nutzer.
- Navigation bleibt bei drei Einträgen; auf der Auswahlseite sichtbar, während einer Runde ausgeblendet.
- Während einer Runde bleibt der Bildschirm an (`useWakeLock`).
- 375 × 667: „Los“ ohne Scrollen erreichbar.
- Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`.

## Entscheidungen des Umsetzers

1. **Übungsmodus:** Der Lernbildschirm wird zu `SessionScreen` (`src/components/study/session-screen.tsx`): Kopfzeile (Schließen als Element von außen, Zähler, Fortschritt), Frage mit Eingabe bzw. Auflösung, Fußzeile (`QuestionFooter` bzw. die Leiste von außen), Fokusführung und `useWakeLock(true)`. `StudySession` behält Speichern, Abmelde- und Endbildschirm und reicht die Bewertungsleiste herein. `PracticeRoutesRound` reicht „Nochmal“/„Weiter“ herein. Beide nutzen `studyReducer`; `initStudy(ids, reps, { save: false })` setzt `save` im Zustand, und der Zweig `rate` legt dann nichts in `unsynced` ab. So bleiben Tippschutz, „Nochmal“-Logik (Karte drei Plätze später) und Zähler gleich.
2. **Navigation:** Kein Unterpfad. Ein kleiner Client-Speicher `practice-round-store.ts` meldet „Runde läuft“; `AppNav` blendet sich auf `/practice` aus, solange er wahr ist. Die Runde selbst liegt wie die Lernsitzung als `StudySurface` (fixiert, z-20) über allem.
3. **Frische Runde je Navigation:** `PracticeHost` setzt `key={bfcacheId}` wie `StudySessionHost`. Die Kartendaten sind fest, die Ladungslogik der Lernsitzung (`loadId`) entfällt.
4. **Schließen in der Runde:** Knopf (kein Link) mit Kreuz, Beschriftung `Übung beenden` / `End practice`, zurück zur Auswahl ohne Rückfrage.
5. **Anzahl neben „Los“:** Eine Statuszeile über „Los“ zeigt `124 Karten passen` / `124 cards match` (1: `1 Karte passt` / `1 card matches`); ohne Bereich `Wähle mindestens einen Bereich.` / `Choose at least one range.`; ohne Treffer `Zu dieser Auswahl gibt es keine Karten.` / `No cards match this selection.` In beiden letzten Fällen ist „Los“ gesperrt. Nach heutigem Kartensatz leer: Fehlwürfe in 2–40, Stellwürfe in 2–40 und 41–60.
6. **Umschalter:** Segmentleiste wie die Darstellungswahl (echte Radio-Knöpfe), Gruppe `Übung` / `Exercise`, Einträge `Wege`/`Rechnen`, `Routes`/`Maths`.
7. **Chips:** Bereiche als Umschaltknöpfe (`aria-pressed`) in einer Gruppe `Bereich`/`Range`, Raster 4 Spalten; Kartenart als Radio-Gruppe `Kartenart`/`Card type`, 4 Spalten: `Alle, Wege, Fehlwürfe, Stellwürfe` / `All, Routes, Misses, Set-ups`. Bereichsnamen `2–40` usw. aus den Zahlen (Halbgeviertstrich, in beiden Sprachen gleich).
8. **Gespeicherte Auswahl:** localStorage-Schlüssel `practice`, JSON `{ exercise, ranges, kind }`. Prüfung in `parsePracticeSelection`: kein Objekt oder kein JSON → Vorauswahl; `exercise` nur `routes`/`math`, sonst `routes`; `ranges` nur ein Array, unbekannte Einträge fallen weg, Doppelte zusammen, Reihenfolge wie `RANGES`; kein Array → alle; ein leeres Array bleibt leer (der Nutzer hat es so verlassen); `kind` nur bekannte Werte, sonst `all`. Speicher wie `theme-store.ts` (Wahl im Tab gilt vor dem Speicher, gesperrter Speicher still).
9. **Rechenaufgaben:** Je Aufgabe mit Wahrscheinlichkeit 1/4 eine Bogey-Aufgabe: Bogey-Zahl gleichverteilt, dann gleichverteilt unter allen geordneten Wurf-Dreiern aus dem Vorrat mit Startrest `bogey + Summe` in 171–230. Sonst: Startrest gleichverteilt 171–230, dann gleichverteilt unter allen Dreiern, deren neuer Rest in 2–170 liegt und keine Bogey-Zahl ist (für jeden Startrest nicht leer). Keine Verwerfungsschleife, mit `rng: () => number` testbar.
10. **Rechnen: Eingabe:** Zahlenfeld 3 × 4 in der Fußzeile: `1 2 3 / 4 5 6 / 7 8 9 / ⌫ 0 Prüfen`; „Prüfen“ ist die Hauptaktion (gelb/schwarz). Eine führende 0 wird nicht angenommen (0-Taste gesperrt, solange nichts eingegeben ist), höchstens drei Ziffern. Tippschutz `TAP_GUARD_MS` zwischen „Prüfen“ und „Weiter“, weil beide unten rechts liegen.
11. **Rechnen: Auflösung:** Ergebniszeile in den Tönen der Lernkarte: richtig `Richtig` · `es bleiben 89` (Ton strong), falsch `Falsch, es bleiben 89` · `nicht 98` (Ton bad); en `Correct` · `89 left`, `Wrong, 89 left` · `not 98`. Darunter checkbar: Beschriftung `Checkbar, bester Weg` / `Checkable, best route` und die Felder im Ton „best“; Bogey: `Bogey, nicht checkbar` / `Bogey, no checkout`, Felder ohne Farbe (Stellwurf) und Notiz `Stellwurf` · `Danach Rest 50` (vorhandene Texte der Bogey-Karte). `VerdictLine` bekommt dafür den Baustein `ResultLine({ tone, title, note })`.
12. **Texte (neu, `practice`):** Seitentitel/Überschrift `Üben`/`Practice`; Satz zu „Rechnen“: `Zehn kurze Rechnungen vor dem Checkout: Was bleibt nach drei Darts, und ist es eine Bogey-Zahl?` / `Ten quick sums before the checkout: what is left after three darts, and is it a bogey number?`; `Los`/`Start`; Runde: `Nochmal`/`Again`, `Weiter`/`Next`, Fortschritt `3 von 10 erledigt` / `3 of 10 done`; Ende Wege `Runde geschafft` / `Round complete`, `20 Karten geübt.` / `20 cards practised.` (1: `1 Karte` / `1 card`); Ende Rechnen `8 von 10 richtig` / `8 of 10 correct`; `Noch eine Runde`/`Another round`, `Fertig`/`Done`; Rechnen `Was bleibt?` / `What is left?`, Antwortfeld (Screenreader) `Deine Antwort` / `Your answer`, `Letzte Ziffer löschen` / `Delete last digit`, `Prüfen`/`Check`. Heute: `Üben`/`Practice`.
13. **Einstieg auf „Heute“:** In `TodayOverview` unter „Lernen“ ein `Link` mit `variant: "secondary"`, `size: "xl"`; beide in `LEARN_ACTIONS = "mt-4 flex flex-col gap-3 sm:flex-row"`, Knöpfe `w-full sm:w-auto sm:px-10`. Ohne „Lernen“ steht „Üben“ allein an derselben Stelle (ruhig, nicht primär). Das Skeleton zeigt „Lernen“ als Skeleton und „Üben“ als Skeleton derselben Form.
14. **Datenform:** `PracticeCard = SessionCard & { rest: number; groups: PracticeGroup[] }`; `MathSolution` je Rest 2–170 vom Server. Fehlende Auflösung (kann nach Kartensatz nicht vorkommen) zeigt nur die Ergebniszeile.

## Review Focus

1. Gespeicherte Auswahl von Hand verändert (`ranges: ["999", 3, null]`, `kind: "x"`, kein JSON) → Seite lädt mit gültiger Auswahl, kein Absturz – Tests in Task 3.
2. „Nochmal“ auf der letzten Karte einer Runde → Karte kommt sofort wieder, Zähler `n / n+1`, Ende erst danach – Test in Task 6.
3. Rechnen: Doppeltipp auf „Prüfen“ überspringt die Auflösung nicht – Test in Task 7 (zweiter Tipp innerhalb `TAP_GUARD_MS` wird verworfen).
4. Runde verlassen über Zurück (Activity) und wieder öffnen über „Üben“ → frische Auswahlseite, Navigation sichtbar – Test in Task 8 (Speicher fällt beim Aushängen auf falsch) und im Browsertest.
5. Auswahl, die nur 1–19 Karten ergibt (Fehlwürfe 41–60: 1 Karte) → Runde mit genau diesen Karten, Ende nach der letzten – Test in Task 2 (Ziehung) und Task 9 (Start mit kleiner Auswahl).

---

### Task 1: Pfad und Zugriffsschutz

**Files:** Modify `src/i18n/paths.ts`, `src/lib/auth/protected-routes.ts`, Tests `src/i18n/paths.test.ts`, `src/lib/auth/protected-routes.test.ts`, `src/proxy.test.ts`

**Interfaces:** Produces `ROUTES.practice = "/practice"`.

- [ ] **Step 1: Failing tests:** `PROTECTED_ROUTES` enthält `/practice`; `isProtectedPath("/practice")` und `("/practice/x")` wahr, `("/practicex")` falsch; `proxyDecision` für `GET /de/practice` ohne Cookie → Umleitung `/de/sign-in`; `localePath("en", ROUTES.practice)` = `/en/practice`.
- [ ] **Step 2:** `npx vitest run src/i18n/paths.test.ts src/lib/auth/protected-routes.test.ts src/proxy.test.ts` → FAIL.
- [ ] **Step 3:** Eintrag in `ROUTES` und `PROTECTED_ROUTES`.
- [ ] **Step 4:** PASS. Commit erst mit Task 2 (eigenständig, aber klein).

### Task 2: Bereiche, Kartenart-Gruppen, Ziehung

**Files:** Create `src/lib/practice/filter.ts`, `src/lib/practice/filter.test.ts`

**Interfaces:**
- Produces:
  - `export const RANGES: readonly { id: RangeId; from: number; to: number }[]` mit `RangeId = "2-40" | "41-60" | "61-80" | "81-100" | "101-120" | "121-140" | "141-170"`.
  - `export const PRACTICE_KINDS = ["all", "ways", "misses", "setups"] as const; type PracticeKind`.
  - `export type PracticeGroup = "ways" | "misses" | "setups"`; `practiceGroups(card: Card): PracticeGroup[]`.
  - `export type PracticeFilter = { ranges: readonly RangeId[]; kind: PracticeKind }`; `matchesFilter(card: { rest: number; groups: readonly PracticeGroup[] }, filter: PracticeFilter): boolean`.
  - `export type Rng = () => number`; `drawRound<T>(items: readonly T[], rng: Rng, max = ROUND_SIZE): T[]` mit `ROUND_SIZE = 20` (Fisher-Yates, dann die ersten `max`).

- [ ] **Step 1: Failing tests:**
  - Gruppen: `r-170` → `["ways"]`; `t-61` → `["ways"]`; `t-125` → `["setups"]`; `b-159` → `["setups"]`; eine Fehlwurf-Karte mit `follow.kind === "setup"` → `["misses","setups"]`; eine mit Finish → `["misses"]`.
  - Zählungen über `CARDS` mit `practiceGroups` (fester Kartensatz, Tabelle als `it.each`): `2-40` all 39 / ways 39 / misses 0 / setups 0; `41-60` 21/20/1/0; `61-80` 50/30/20/0; `81-100` 41/21/19/1; `101-120` 65/24/25/16; `121-140` 80/20/40/43; `141-170` 106/23/46/83. Alle Bereiche, „all“ → 402.
  - Maßgeblich ist `rest`: Fehlwurf-Karte mit `rest` 121 und `newRest` 100 gehört zu `121-140`, nicht `81-100`.
  - Leere Bereichsauswahl → keine Karte passt.
  - `drawRound`: aus 402 → 20, keine Doppelten, alle aus der Eingabe; aus 7 → alle 7; mit festem `rng` reproduzierbar; leere Eingabe → `[]`.
- [ ] **Step 2:** `npx vitest run src/lib/practice/filter.test.ts` → FAIL.
- [ ] **Step 3:** Implementieren; „ways“ = Rest-Karte oder Zwei-Dart-Karte mit Finish; „setups“ = Bogey-Karte oder Zwei-Dart-/Fehlwurf-Karte mit `follow.kind === "setup"`.
- [ ] **Step 4:** PASS. Commit `feat: add practice routes, ranges, card groups and round draw`.

### Task 3: Gespeicherte Auswahl

**Files:** Create `src/lib/practice/selection.ts` (+test), `src/components/practice/selection-store.ts` (+test, jsdom)

**Interfaces:**
- Consumes: `RANGES`, `PRACTICE_KINDS`, `RangeId`, `PracticeKind`.
- Produces: `export type Exercise = "routes" | "math"`; `export type PracticeSelection = { exercise: Exercise; ranges: RangeId[]; kind: PracticeKind }`; `DEFAULT_SELECTION` (routes, alle Bereiche, all); `PRACTICE_STORAGE_KEY = "practice"`; `parsePracticeSelection(raw: string | null): PracticeSelection`. Store: `readPracticeSelection(): PracticeSelection` (gleiche Referenz bei unverändertem Rohwert, sonst Endlosschleife in `useSyncExternalStore`), `savePracticeSelection(s: PracticeSelection): void`, `subscribePracticeSelection(cb): () => void`.

- [ ] **Step 1: Failing tests:** `null`, `"kein json"`, `"42"`, `"[]"` → `DEFAULT_SELECTION`; `{"exercise":"math","ranges":["41-60","2-40","2-40","999",3,null],"kind":"setups"}` → `{ exercise: "math", ranges: ["2-40","41-60"], kind: "setups" }`; `ranges: []` bleibt leer; `ranges: "2-40"` → alle; `exercise: "x"` → `routes`; `kind: "x"` → `all`. Store: speichert und liest zurück; `localStorage.getItem` wirft → Vorauswahl; `setItem` wirft → Wahl gilt trotzdem im Tab; zwei Aufrufe ohne Änderung liefern dieselbe Referenz; `subscribe` meldet Speichern und `storage`-Ereignis mit Schlüssel `practice`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren wie `theme-store.ts`. **Step 4:** PASS. Commit `feat: remember the practice selection per device`.

### Task 4: Rechenaufgaben und Auflösungsdaten

**Files:** Create `src/lib/practice/math.ts` (+test)

**Interfaces:**
- Consumes: `BOGEYS`, `isBogey` aus `checkouts.ts`; `parseDart`, `dartValue` aus `model.ts`; `Card`; `Rng`.
- Produces: `THROW_POOL = ["S20","T20","S1","T1","S5","T5","S19","T19","S3","T3","S7","T7"] as const`; `export type MathTask = { start: number; throws: [string, string, string]; rest: number }`; `MATH_ROUND_SIZE = 10`; `mathTask(rng: Rng): MathTask`; `mathRound(rng: Rng, n = MATH_ROUND_SIZE): MathTask[]`; `export type MathSolution = { kind: "finish"; route: string[] } | { kind: "bogey"; throws: string[]; leaves: number }`; `mathSolutions(cards: readonly Card[]): Record<number, MathSolution>` (aus `r-<n>.best` bzw. `b-<n>.setup`).

- [ ] **Step 1: Failing tests** (Zufall per Seed, Hilfsfunktion `mulberry32` im Test):
  - 5000 Aufgaben: `start` in 171–230, alle Würfe aus `THROW_POOL`, `rest` in 2–170, `rest === start − Summe`.
  - Anteil Bogey-Reste über 5000 Aufgaben zwischen 0,22 und 0,28.
  - Jede Bogey-Zahl erreichbar: mit `rng`, das zuerst `0` (Bogey-Zweig) und dann den Index der Bogey-Zahl trifft, entsteht genau diese Bogey-Zahl; und über 5000 Aufgaben kommt jede der sieben vor.
  - Nicht-Bogey-Aufgaben haben nie einen Bogey-Rest.
  - `mathRound` liefert 10 Aufgaben.
  - `mathSolutions(CARDS)`: Schlüssel genau 2–170; `170` → `{ kind: "finish", route: ["T20","T20","Bull"] }`; `159` → `{ kind: "bogey", … }` mit `leaves` = Bogey-Karte.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren laut Entscheidung 9; Dreier-Liste (12³ = 1728) einmal beim Laden des Moduls. **Step 4:** PASS. Commit `feat: generate score sums with bogey numbers`.

### Task 5: Lernbildschirm herauslösen, Übungszweig im Reducer

**Files:**
- Create: `src/components/study/session-screen.tsx`
- Modify: `src/components/study/study-session.tsx`, `study-state.ts` (+test), `study-close-link.tsx`, `verdict.tsx` (+test)

**Interfaces:**
- Produces:
  - `export type SessionCard = { id: string; view: CardView; check: Check }`; `StudyItem = SessionCard & { reps; labels }`.
  - `SessionScreen({ current, session, answer, close, progressText, hints, revealedFooter, onReveal })` mit `current: SessionCard`, `session: SessionState`, `answer: Answer | null`, `close: React.ReactNode`, `progressText: (done: number, total: number) => string`, `hints?: React.ReactNode`, `revealedFooter: React.ReactNode`, `onReveal: (answer?: Answer) => void`. Ruft `useWakeLock(true)`.
  - `initStudy(cardIds, reps, options?: { save?: boolean })`; `StudyState.save: boolean`.
  - `StudyCloseButton({ label, onClick })` neben `StudyCloseLink` (gleiche Klassen).
  - `ResultLine({ tone, title, note }: { tone: VerdictTone; title: string; note: string })` in `verdict.tsx`; `VerdictLine` nutzt sie.
- [ ] **Step 1: Failing tests:** `study-state.test.ts`: mit `save: false` liefert `rate` 1 und 3 keine Einträge in `unsynced`, `nextToSend` ist `null`, `isFinished` wahr am Ende; „Nochmal“ stellt die Karte trotzdem drei Plätze nach hinten. `verdict.test.tsx`: `ResultLine` zeigt Titel und Hinweis mit `role="status"`.
- [ ] **Step 2:** FAIL. **Step 3:** Herauslösen; `StudySession` verhält sich unverändert (alle vorhandenen Tests in `study-session.test.tsx`, `study-session-host.test.tsx`, `use-wake-lock.test.tsx` bleiben unverändert grün). **Step 4:** PASS. Commit `refactor: share the study screen and allow sessions without saving`.

### Task 6: Runde „Wege“

**Files:** Create `src/components/practice/practice-routes-round.tsx` (+ `.test.tsx`), Modify `de.ts`, `en.ts` (Abschnitt `practice`, Texte laut Entscheidung 12)

**Interfaces:**
- Consumes: `SessionScreen`, `SessionCard`, `studyReducer`/`initStudy({ save: false })`, `StudyCloseButton`, `StudySurface`.
- Produces: `PracticeRoutesRound({ items, onClose, onRestart }: { items: SessionCard[]; onClose: () => void; onRestart: () => void })`.

- [ ] **Step 1: Failing tests** (Muster wie `study-session.test.tsx`, `fireEvent` mit Uhr wegen Tippschutz; `@/lib/review/actions` gemockt):
  - Zeigt `1 / 2`, Frage, „Prüfen“; nach Aufdecken die Knöpfe „Nochmal“ und „Weiter“, keine Bewertungen „Schwer/Gut/Leicht“.
  - „Nochmal“ auf der letzten Karte: Zähler `2 / 3`, dieselbe Karte erneut mit leerer Eingabe.
  - Nach der letzten Karte „Runde geschafft“ und `2 Karten geübt.`; „Noch eine Runde“ ruft `onRestart`, „Fertig“ und das Kreuz (`Übung beenden`) rufen `onClose`.
  - `submitReview` wurde nie aufgerufen; kein `beforeunload`-Hinweis.
  - Zwei-Dart-Karte `t-125`: Urteil „Richtiger Stellwurf“ nach `T20 T11`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren; Endbildschirm wie der der Lernsitzung (`StudySurface`, `type-display text-hero`), „Noch eine Runde“ primär, „Fertig“ secondary. **Step 4:** PASS. Commit `feat: practise routes without saving`.

### Task 7: Runde „Rechnen“

**Files:** Create `src/components/practice/math-state.ts` (+test), `math-round.tsx` (+ `.test.tsx`), `math-pad.tsx`; Modify `de.ts`, `en.ts`

**Interfaces:**
- Consumes: `MathTask`, `MathSolution`, `TAP_GUARD_MS`, `ResultLine`, `DartSlots`, `NoteList`, `StudySurface`, Kopfzeilen-Klassen aus `study-parts.tsx`, `useWakeLock`.
- Produces: `MathState = { tasks; index; input: string; revealed: boolean; correct: number; lastFlipAt: number | null }`, `MathAction = { type: "digit"; d: number } | { type: "delete" } | { type: "check"; at?: number } | { type: "next"; at?: number }`, `initMath(tasks)`, `mathReducer`; `MathRound({ tasks, solutions, onClose, onRestart })`.

- [ ] **Step 1: Failing tests:**
  - Reducer: führende 0 verworfen; vierte Ziffer verworfen; `delete`; `check` ohne Ziffer verworfen; richtige Antwort zählt `correct`; `next` innerhalb `TAP_GUARD_MS` nach `check` verworfen, danach nächste Aufgabe mit leerer Eingabe; Ziffern nach dem Aufdecken verworfen.
  - Komponente: Aufgabe `211`, `T20 · T19 · S5` → zeigt „Rest“, `211`, die drei Würfe, „Was bleibt?“, „Prüfen“ gesperrt; `8`,`9` → Antwortfeld `89`, „Prüfen“ → „Richtig“ und „es bleiben 89“, „Checkbar, bester Weg“ mit dem Weg aus `solutions[89]`.
  - Falsch: `9`,`8` → „Falsch, es bleiben 89“, „nicht 98“.
  - Bogey: Aufgabe mit Rest 159 → „Bogey, nicht checkbar“, Stellwurf-Notiz.
  - Ende nach 10 (Test mit 2 Aufgaben): „1 von 2 richtig“, „Noch eine Runde“ → `onRestart`, „Fertig“ → `onClose`; Kreuz → `onClose`.
  - Bildschirm an: `navigator.wakeLock.request` beim Start aufgerufen.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren laut Entscheidungen 10 und 11; Antwortfeld `aria-label` „Deine Antwort“, `aria-live="polite"`. **Step 4:** PASS. Commit `feat: practise score sums and bogey numbers`.

### Task 8: Navigation während einer Runde

**Files:** Create `src/components/practice/practice-round-store.ts`; Modify `src/components/app-nav.tsx` (+ `app-nav.test.tsx`)

**Interfaces:** Produces `useRoundActive(): boolean`, `useMarkRoundActive(active: boolean): void` (setzt in `useEffect`, Aufräumen setzt falsch).

- [ ] **Step 1: Failing tests:** Auf `/de/practice` mit einer gerenderten Komponente, die `useMarkRoundActive(true)` ruft, gibt es keine Navigation; nach dem Aushängen wieder; auf `/de/today` bleibt sie trotz aktivem Speicher sichtbar; auf `/de/practice` ohne Runde sichtbar.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS. Commit `feat: hide the navigation during a practice round`.

### Task 9: Übungsseite mit Auswahl

**Files:**
- Create: `src/app/[lang]/(app)/practice/page.tsx`, `src/components/practice/practice-data.tsx` (+test), `practice-host.tsx` (+test), `practice-select.tsx` (+test), `practice-skeleton.tsx`, `practice-parts.tsx`
- Modify: `src/components/loaders-guard.test.ts`, `src/app/[lang]/(app)/app-pages.test.tsx`, `src/components/skeletons.test.tsx`, `de.ts`, `en.ts`

**Interfaces:**
- Consumes: alles aus Task 2–8.
- Produces: `PracticeCard = SessionCard & { rest: number; groups: PracticeGroup[] }`; `PracticeData()` (Server: `requireActiveUser()`, dann `CARDS` → `PracticeCard[]` und `mathSolutions(CARDS)`); `PracticeHost({ cards, solutions })` (`key={bfcacheId}`, Phasen `select | routes | math`, `useMarkRoundActive(phase !== "select")`); `PracticeSelect({ cards, onStart })`; `PracticeSkeleton()`.

- [ ] **Step 1: Failing tests:**
  - `loaders-guard.test.ts`: `PracticeData` wirft die Umleitung, ohne `cardView` aufzurufen (Mock auf `@/components/study/card-view` zählt Aufrufe).
  - `practice-data.test.tsx`: aktiver Nutzer → `PracticeHost` bekommt 402 Karten mit `groups` und Auflösungen 2–170; kein Datenbankzugriff (`db` wird nicht angefasst).
  - `practice-select.test.tsx` (user-event): Vorauswahl alle Bereiche gedrückt, „Alle“ gewählt, „402 Karten passen“; alle Bereiche abwählen → „Wähle mindestens einen Bereich.“, „Los“ gesperrt; nur „2–40“ + „Fehlwürfe“ → „Zu dieser Auswahl gibt es keine Karten.“, „Los“ gesperrt; nur „41–60“ + „Fehlwürfe“ → „1 Karte passt“; Umschalter „Rechnen“ → Satz zur Übung, keine Chips, „Los“ aktiv; Auswahl landet im Speicher.
  - `practice-host.test.tsx`: „Los“ mit „41–60“ + „Fehlwürfe“ → Runde mit `1 / 1`; Ende → „Fertig“ → Auswahlseite mit derselben Auswahl; „Rechnen“ → „Los“ → `1 / 10`; Kreuz → Auswahl.
  - `app-pages.test.tsx`: Seite zeigt Überschrift „Üben“ und Datenbaustein; Titel `Üben · Checkout-Trainer`; beim Laden genau eine `aria-busy`-Region und kein Kartentext.
  - `skeletons.test.tsx`: Übungs-Skeleton ohne Zahlen von Karten, mit `aria-busy`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. Seite: `h1` im Gerüst, `Suspense` mit `PracticeSkeleton`. Abstände kompakt (Ziel 375 × 667 ohne Scrollen bis „Los“). **Step 4:** PASS. Commit `feat: add the practice page with route and score exercises`.

### Task 10: Einstieg auf „Heute“

**Files:** Modify `src/components/today/today-data.tsx` (+test), `today-parts.tsx`, `today-skeleton.tsx`, `skeletons.test.tsx`, `de.ts`, `en.ts`

- [ ] **Step 1: Failing tests:** Mit fälligen Karten: Links „Lernen“ (`/de/study`) und „Üben“ (`/de/practice`), „Üben“ nach „Lernen“; ohne fällige Karten: kein „Lernen“, „Üben“ vorhanden; englisch „Practice“ → `/en/practice`. Skeleton enthält zwei Knopf-Skeletons.
- [ ] **Step 2:** FAIL. **Step 3:** Laut Entscheidung 13. **Step 4:** PASS. Commit `feat: link the practice page from today`.

### Task 11: Reviews und Browsertest

- [ ] `code-review` (high) des Paket-Diffs gegen `develop`; Security-Review von Hand (Zugriffsschutz, Gerüst ohne Lerninhalte im Server-HTML, keine schreibende Server Action, Prüfung der localStorage-Auswahl, keine Suchparameter). Befunde beheben oder begründet zurückweisen, je ein Commit.
- [ ] Browsertest laut Auftrag (375 × 667 und Desktop, hell und dunkel, de und en), PGlite auf `review_log`/`card_state` prüfen, Screenshots im Scratchpad.
