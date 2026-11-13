# Paket 1: Zwei-Dart-Karten, Zerlegung, Prognose, Bildschirm an – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Kartenart „noch 2 Darts“ (15 Wege, 67 Stellwürfe), Zerlegungszeile statt Begründungssatz, Prognosezeile in der Statistik, Wake Lock während der Lernsitzung.

**Architecture:** Kartenlogik bleibt rein in `src/lib/darts/` und wird beim Erzeugen in `cards.generated.json` geschrieben. Die Zwei-Dart-Karte nutzt die vorhandenen Prüfarten `follow` und `setup`, die Oberfläche bekommt nur ein „verbrauchtes“ Feld dazu. Prognose ist reine Logik in `src/lib/forecast.ts`, angezeigt im Datenbaustein der Statistik. Wake Lock ist ein eigener Hook, den `StudySession` aufruft.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-13-paket-1-zwei-darts-zerlegung-design.md](../specs/2026-11-13-paket-1-zwei-darts-zerlegung-design.md)

## Global Constraints

- Alle Regeln aus `CLAUDE.md`: Texte in `de.ts` und `en.ts`, keine Emojis, keine freien Tailwind-Werte, Tests zuerst, Abdeckung ≥ 80 % getrennt für Backend und Frontend.
- `src/data/cards.generated.json` nur über `npm run generate:cards` ändern.
- Keine Datenbankänderung, keine Migration.
- Cache Components: keine Nutzerdaten oder Lerninhalte im Gerüst; jeder Datenbaustein ruft zuerst `requireActiveUser()` auf, dann `new Date()`.
- 375 × 667: Tastenfeld, „Prüfen“ und Bewertungsleiste ohne Scrollen erreichbar; Zerlegungszeile einzeilig.
- Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`.

## Entscheidungen des Umsetzers

Der Entwurf überlässt diese Punkte dem Umsetzer; so wird entschieden:

1. **Kartenart:** `kind: 'two'`, Kennung `t-<rest>`, Typ `TwoDartCard = { id; kind: 'two'; rest; follow: FollowText }`. `follow` ist `followAfterSingle(rest, 2)`.
2. **Zerlegung liegt neben `reason`:** neues optionales Feld `breakdown` an `RestCard`. `reason` bleibt für alle Karten erhalten und wird nur angezeigt, wenn `breakdown` fehlt (geteilter erster Dart, Ein-Dart-Wege).
   `Breakdown = { first: string; after: number; dartsLeft: 1 | 2; route?: string[] }` – `route` fehlt im verkürzten Fall.
3. **Wortlaut Zerlegung:** Notiz mit Titel `Nach T20` / `After T20` (wie „Nur S20“ der Single-Fälle) und Text `110 mit 2 Darts: T20 · Bull` / `110 with 2 darts: T20 · Bull`; verkürzt `bleiben 50` / `50 left`. Darts als Text, keine Pillen. Passt der längste Fall (geteilter Folgeweg, etwa 108) im Browser nicht in eine Zeile, wird „mit 2 Darts“ im Text gekürzt; das wird im Browsertest geprüft.
4. **Frage der Zwei-Dart-Karte:** Beschriftung „Rest“, große Zahl, darunter `noch 2 Darts` / `2 darts left`. Erstes Feld verbraucht: neutral `bg-muted`, Inhalt „–“ (aria-hidden) plus Screenreader-Text `verbraucht` / `used`. Kein Rot, kein Wert.
5. **Auflösung Weg-Karte:** wie Rest-Karte (Beschriftung „Rest“, Zahl), Felder: verbraucht + Weg als „Bester Weg“, keine Notizen.
   **Auflösung Stellwurf-Karte:** Beschriftung `Rest 125 mit 2 Darts` / `125 with 2 darts`, große Zeile `Kein Finish` / `No finish` (so bleibt die große Zeile einzeilig; zusammen gelesen „Kein Finish mit 2 Darts“), Felder verbraucht + Stellwurf ohne Farbe, Notiz „Stellwurf: T20 · T11, Rest 32“ wie bei Fehlwurf-Karten.
6. **Detailansicht in der Statistik:** zeigt den Zwei-Dart-Stellwurf **nicht** zusätzlich (unverändert, Seite bleibt knapp). Sie zeigt die Zerlegung statt des Satzes, wie die Rest-Karte.
7. **Prognosezeile:** direkt unter den drei Zählern, `text-sm text-muted-foreground`. Datum `14. Januar` / `January 14`, mit Jahr nur, wenn es nicht das laufende Berliner Jahr ist. Ist das Datum heute: trotzdem Datum (keine Sonderform).
8. **Wake Lock:** eigener Hook `useWakeLock(active: boolean)` in `src/components/study/use-wake-lock.ts`; `active` ist „es gibt eine aktuelle Karte und nicht abgemeldet“.
9. **Prognose-Daten:** `queueFromRows` liefert zusätzlich `newLeftToday`; der Stats-Lader ruft `loadQueue` zusätzlich zu `loadStatsData` (wie die Heute-Seite).

## Review Focus

1. Bestehender Nutzer jenseits Rest 61: neue Karten kommen zuerst als `t-61…` – gewollt, Test in Task 1 (Reihenfolge) sichert nur die Lage in `CARD_ORDER`.
2. Zwei-Dart-Karte nach „Nochmal“ erneut in derselben Sitzung: Eingabe startet leer mit verbrauchtem Feld – Test in Task 4 (zwei Runden).
3. Prognose um Mitternacht Berlin / Sommerzeitwechsel: Tage zählen nach Berliner Kalendertag – Test in Task 6 mit `now` kurz vor Mitternacht und über den 25.10.
4. Wake Lock: `request()` noch offen, während die Sitzung endet → Sperre muss sofort wieder freigegeben werden – Test in Task 7.
5. Stats-Raster: Zwei-Dart-Karte mit Lernstand „known“, Rest-Karte „learning“ → Raster zeigt „learning“ – Test in Task 3.

---

### Task 1: Zwei-Dart-Karten erzeugen

**Files:**
- Modify: `src/lib/darts/cards.ts`, `src/lib/darts/cards.test.ts`, `src/data/cards.generated.json` (erzeugt)

**Interfaces:**
- Produces: `export type TwoDartCard = { id: string; kind: 'two'; rest: number; follow: FollowText }`; `Card = RestCard | MissCard | BogeyCard | TwoDartCard`.

- [ ] **Step 1: Failing tests in `cards.test.ts`** (`describe('Zwei-Dart-Karten')`):
  - `erzeugt 15 Weg- und 67 Stellwurf-Karten an den richtigen Resten`: Weg-Reste `[61..70, 90, 101, 104, 107, 110]`, Stellwurf-Reste `[99, 102, 103, 105, 106, 108, 109, 111..170]`; Gesamtzahl Karten 402.
  - `checkt jede Weg-Karte mit höchstens zwei Darts` (`expectFollowFits(follow, rest, 2)`), Weg-Karte = `CHART[rest].twoDarts`.
  - `jeder Stellwurf: höchstens zwei Darts, Rest > 1, kein Finish mit zwei Darts möglich` (`allCheckouts(rest, 2).length === 0`).
  - Feste Fälle: `t-99` → `T20 S7`, leaves 32; `t-125` → `T20 T11`, 32; `t-161` → `T20 T17`, 50; `t-170` → `T20 T20`, 50; `t-159` → `T20 T20`, 39; `t-169` → `T20 T20`, 49.
  - `stimmt mit den Folgewegen der Fehlwurf-Karten überein`: für jede Fehlwurf-Karte mit `dartsLeft 2` und vorhandener `t-<newRest>` gilt `miss.follow` = `two.follow`.
  - Reihenfolge: `t-121` direkt nach `m-121-1`; `t-159` direkt nach `b-159`; `t-61` direkt nach der letzten Fehlwurf-Karte von 61.
  - Vorhandenen Test „erzeugt eindeutige Karten in Lernreihenfolge“ unverändert lassen.
- [ ] **Step 2:** `npx vitest run src/lib/darts/cards.test.ts` → FAIL.
- [ ] **Step 3:** In `buildCards` nach Rest/Bogey und Fehlwurf-Karten `twoDartCard(rest)` anhängen, wenn `chartTwoDarts(rest)` existiert oder `followAfterSingle(rest, 2).kind === 'setup'`. Kommentar von `buildCards` anpassen.
- [ ] **Step 4:** `npm run generate:cards` (402 Karten), Tests PASS. Typecheck zeigt fehlende `case 'two'` in `judge.ts` und `card-view.ts` – die schließen Task 2 und 4; bis dahin dort keine Platzhalter, Task 1 und 2 gemeinsam committen.

### Task 2: Prüfung der Zwei-Dart-Karten

**Files:** Modify `src/lib/darts/judge.ts`, `src/lib/darts/judge.test.ts`

**Interfaces:**
- Consumes: `TwoDartCard`.
- Produces: `checkFor(two)` → `{ kind: 'follow', rest, maxDarts: 2, best }` (Weg) bzw. `{ kind: 'setup', rest, maxDarts: 2, throws }` (Stellwurf). Keine neue Check-Art.

- [ ] **Step 1: Failing tests:**
  - `check('t-61')` = `{ kind: 'follow', rest: 61, maxDarts: 2, best: [['T11','D14']] }`; `judge(…, darts('T11','D14')).code` = `best`; `darts('T15','D8')` → `notRecommended`; `darts('T20','S1')` → `noCheckout`.
  - Geteilter Weg: eine Weg-Karte mit geteiltem Weg gibt es nicht (Tabellenspalte ohne Teilung); stattdessen `check('t-108')` (Stellwurf) prüfen und für Teilung den bestehenden Test `r-42` beibehalten. Zusätzlich: Test, dass kein `t-…`-Weg einen `/` enthält – dokumentiert, warum es den Fall nicht gibt.
  - `check('t-125')` = `{ kind: 'setup', rest: 125, maxDarts: 2, throws: ['T20','T11'] }`; `T20 T11` → `setupRight`; `T20 T15` → `setupOther`; `T20 Bull` → `setupOther`.
  - `offersNotCheckable(check('t-125'))` und `(check('t-61'))` → false; `maxDarts` → 2.
- [ ] **Step 2:** FAIL. **Step 3:** `case 'two'` in `checkFor`. **Step 4:** PASS, dann mit Task 1 committen: `feat: add two-dart cards with way and setup answers`.

### Task 3: Statistik-Stufe nur aus Rest- oder Bogey-Karte

**Files:** Modify `src/lib/stats.ts`, `src/lib/stats.test.ts`

- [ ] **Step 1: Failing test** `ignoriert Zwei-Dart-Karten für die Stufe`: states `r-125` learning (state 1) und `t-125` Review mit 30 Tagen → `levels[125] === 'learning'`; nur `t-130` known → `levels[130] === 'new'`. Und `zählt Nochmal auf Zwei-Dart-Karten zum Rest`: log `t-125` rating 1 → `hardest` enthält `{ rest: 125, again: 1 }`.
- [ ] **Step 2:** FAIL. **Step 3:** Bedingung `card.kind === 'rest' || card.kind === 'bogey'`. **Step 4:** PASS, Commit `fix: keep two-dart cards out of the rest level`.

### Task 4: Zwei-Dart-Karte in der Oberfläche

**Files:**
- Modify: `src/components/study/card-view.ts` (+test), `src/components/dart-slots.tsx` (+test), `src/components/study/study-question.tsx` (+test), `src/components/study/study-card.tsx` (+ `study-session.test.tsx`), `src/i18n/dictionaries/de.ts`, `en.ts`

**Interfaces:**
- Produces: `CardView.question.sub?: string` (Zeile unter der Zahl), `CardView.question.spent: number` und `CardView.answer.spent: number` (Anzahl verbrauchter Felder vorn, 0 oder 1); `DartSlots` Prop `spent?: number`.
- Texte: `study.card.twoDartsLeft` („noch 2 Darts“ / „2 darts left“), `study.card.twoDartsOf(rest)` („Rest 125 mit 2 Darts“ / „125 with 2 darts“), `study.card.noFinish` („Kein Finish“ / „No finish“), `study.slots.spent` („verbraucht“ / „used“).

- [ ] **Step 1: Failing tests:**
  - `card-view.test.ts`: `t-61` → question `{ label: 'Rest', big: '61', sub: 'noch 2 Darts', spent: 1 }`, answer `{ big: '61', slots: [null,'T11','D14'], slotTone: 'best', spent: 1, notes: [] }`; `t-125` → answer `{ label: 'Rest 125 mit 2 Darts', big: 'Kein Finish', slotTone: 'none', slots: [null,'T20','T11'], notes: [{ title: 'Stellwurf', text: 'T20 · T11, Rest 32' }] }`. Andere Karten haben `spent: 0`.
  - `dart-slots.test.tsx`: `spent={1}` → erstes Listenelement mit Text „verbraucht“ (sr-only), nicht „offen“, nicht „Fehlwurf“; in der Auflösung (`tone`) bleibt das verbrauchte Feld sichtbar.
  - `study-question.test.tsx`: Zwei-Dart-Frage zeigt „noch 2 Darts“, das verbrauchte Feld, keine Taste „Nicht checkbar“, nach drei Zifferntipps nur zwei Darts in den Feldern 2 und 3, Ziffern danach deaktiviert.
  - `study-session.test.tsx`: Zwei-Dart-Karte „Prüfen“ → Urteil „Richtiger Stellwurf“, „Dein Weg“ zeigt verbrauchtes Feld + zwei Darts; nach „Nochmal“ startet die Runde leer.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `cardView` `case 'two'`; `spent` in `toSlots`-Nutzern; `StudyQuestion` versetzt eingegebene Darts um `spent`, `next = spent + entered.length`; `DartSlots` zeigt `i < spent` als verbraucht und filtert es in der Auflösung nicht heraus; `YourRoute` setzt `spent` leere Felder vor. Skeleton unverändert.
- [ ] **Step 4:** PASS, Commit `feat: show two-dart cards with a spent first slot`.

### Task 5: Zerlegung

**Files:** Modify `src/lib/darts/cards.ts` (+test), `src/components/study/card-view.ts` (+test), `src/components/stats/rest-details.ts` (+test), `de.ts`, `en.ts`, `cards.generated.json`

**Interfaces:**
- Produces: `export type Breakdown = { first: string; after: number; dartsLeft: 1 | 2; route?: string[] }`; `RestCard.breakdown?: Breakdown`; `RestDetail` übernimmt `breakdown`. Texte `study.card.after(first)` („Nach T20“ / „After T20“), `study.card.breakdown(after, dartsLeft, route?)` („110 mit 2 Darts: T20 · Bull“ / „bleiben 50“; en „110 with 2 darts: T20 · Bull“ / „50 left“).

- [ ] **Step 1: Failing tests (`cards.test.ts`, `describe('Zerlegung')`):**
  - Zählung: 128 Rest-Karten mit voller Zerlegung, 11 verkürzt mit Resten `[104,106,107,110,112,113,125,134,139,142,145]`, ohne Zerlegung genau die Ein-Dart-Wege (`best.length === 1`) und `[42,46,48]`.
  - `r-170` → `{ first: 'T20', after: 110, dartsLeft: 2, route: ['T20','Bull'] }`; `r-60` → `{ first: 'S20', after: 40, dartsLeft: 1, route: ['D20'] }`; `r-110` → `{ first: 'T20', after: 50, dartsLeft: 2 }` ohne `route`.
  - Kein falscher Verweis: volle Zerlegung = `best.slice(1)`; bei `dartsLeft 2` gleich `t-<after>.follow.route`, falls die Karte ein Weg ist, sonst `r-<after>.best`; bei `dartsLeft 1` gleich `['Bull']` bzw. `['D<after/2>']`.
  - `card-view.test.ts`: `r-170` erste Notiz `{ title: 'Nach T20', text: '110 mit 2 Darts: T20 · Bull' }`, keine Notiz „Warum“; `r-110` erste Notiz `{ title: 'Nach T20', text: 'bleiben 50' }`; `r-42` behält `Warum`. Englisch einmal: `After T20` / `110 with 2 darts: T20 · Bull`.
  - `rest-details.test.ts`: Detail von 170 enthält `breakdown`.
- [ ] **Step 2:** FAIL. **Step 3:** `breakdownFor(rest, best)` in `cards.ts` über `followAfterSingle(rest - value(best[0]), best.length - 1)`; Anzeige ersetzt in `restDetailView` die „Warum“-Notiz. **Step 4:** `npm run generate:cards`, PASS, Commit `feat: explain routes as first dart plus known rest`.

### Task 6: Prognose

**Files:**
- Create: `src/lib/forecast.ts`, `src/lib/forecast.test.ts`
- Modify: `src/lib/review/queries.ts` (+ `review.test.ts`), `src/components/stats/stats-data.tsx` (+test), `stats-skeleton.tsx`, `stats-parts.tsx`, `src/components/skeletons.test.tsx`, `de.ts`, `en.ts`

**Interfaces:**
- Produces: `export type Forecast = { kind: 'done' } | { kind: 'date'; day: string } | { kind: 'none' }` (`day` = Berliner `YYYY-MM-DD`); `forecast(input: { unseen: number; newLeftToday: number; newPerDay: number; now: Date }): Forecast`; `queueFromRows(...).newLeftToday: number` (auch in `loadQueue`). Texte `stats.forecast.until(date: string)` („Alle Karten freigeschaltet voraussichtlich am 14. Januar“ / „All cards unlocked by January 14“), `stats.forecast.done` („Alle Karten freigeschaltet“ / „All cards unlocked“), `stats.forecast.none` („Keine neuen Karten eingestellt“ / „No new cards set“). Datum formatiert `formatDay(day: string, locale: Locale, now: Date): string` in `src/lib/forecast.ts`.

- [ ] **Step 1: Failing tests (`forecast.test.ts`):**
  - `unseen 0` → `done`.
  - `unseen 5, newLeftToday 10` → Datum heute.
  - `unseen 402, newLeftToday 10, newPerDay 10, now 2026-11-13T10:00Z` → `2026-12-23` (392 / 10 = 39,2, aufgerundet 40 Tage nach heute).
  - Einstellung 1: `unseen 3, newLeftToday 0, newPerDay 1` → heute + 3 Tage.
  - Extrakarten nur heute: `unseen 30, newLeftToday 20 (10 + 10 Extra), newPerDay 10` → morgen.
  - Einstellung 0 mit genügend Extrakarten (`unseen 5, newLeftToday 5, newPerDay 0`) → heute; ohne (`unseen 6`) → `none`.
  - Zeitgrenze: `now = 2026-11-13T22:59:59Z` (23:59 Berlin) zählt als 13.11.; Sommerzeit: `now 2026-10-24T12:00Z, unseen 2, newLeftToday 0, newPerDay 1` → `2026-10-26`.
  - `formatDay('2027-01-14','de', now 2026)` → `14. Januar 2027`; `formatDay('2026-12-22','de')` → `22. Dezember`; `en` → `December 22`.
  - `review.test.ts`: `newLeftToday` = Limit inkl. Extrakarten minus heute eingeführte, nie negativ.
  - `stats-data.test.tsx`: Zeile erscheint mit Datum; bei allen gesehen „Alle Karten freigeschaltet“.
  - `skeletons.test.tsx`: Stats-Skeleton hat Platzhalter der Prognosezeile.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren; Tag n = `dayKey(dayStart(now) + n·24h + 12h)`. Zeile in `StatsOverview` direkt nach `LevelCounts` in einem `flex flex-col gap-3`-Block (gemeinsames `STATS_COUNTS` in `stats-parts.tsx`), Skeleton: `Skeleton` in Höhe `h-5` (Zeilenhöhe `text-sm`). **Step 4:** PASS, Commit `feat: forecast when all cards are unlocked`.

### Task 7: Bildschirm an

**Files:** Create `src/components/study/use-wake-lock.ts`, `use-wake-lock.test.tsx`; Modify `study-session.tsx`

**Interfaces:** `export function useWakeLock(active: boolean): void`.

- [ ] **Step 1: Failing tests** (nachgebildetes `navigator.wakeLock` mit `request` → Sentinel `{ released, release }`):
  - `fordert beim Start an` (`request('screen')` einmal).
  - `gibt beim Unmount und bei active=false frei`.
  - `fordert nach Rückkehr neu an`: Sentinel `released = true`, `visibilityState` `hidden`→`visible`, `visibilitychange` → zweiter `request`.
  - `fordert nicht an, solange die Seite verborgen ist`.
  - `gibt eine verspätet erteilte Sperre sofort frei`, wenn `active` vor dem Auflösen falsch wird.
  - `bleibt still ohne API` (kein `wakeLock` in `navigator`) und `bleibt still bei Ablehnung` (`request` rejected, `console.error` nicht aufgerufen).
  - `study-session.test.tsx`: Sitzung fordert an, Ende der Sitzung („Geschafft“) gibt frei.
- [ ] **Step 2:** FAIL. **Step 3:** Hook implementieren, in `StudySession` vor den frühen Returns `useWakeLock(current !== undefined && !state.signedOut)`. **Step 4:** PASS, Commit `feat: keep the screen on during a study session`.

### Task 8: Reviews und Browsertest

- [ ] `code-review` (high) gegen `develop`, `security-review`, Befunde beheben, je ein Commit.
- [ ] Browsertest laut Auftrag (375 × 667 und Desktop, hell und dunkel), Screenshots nicht committen, sondern im gemeinsamen Notizordner der Sessions unter `paket-1-screenshots/` ablegen.
