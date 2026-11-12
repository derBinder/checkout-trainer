# Weg selbst eingeben: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beim Lernen den Checkout-Weg per Tastenfeld eingeben, prüfen lassen und in der Auflösung eine Ergebniszeile („Bester Weg“, „Alternative“, …) sehen. Die Selbstbewertung bleibt unverändert.

**Architecture:** Der Server legt jeder Lernkarte neben `view` ein serialisierbares Prüfobjekt `check` bei (aus den Wegen, die die Karte schon trägt). Im Browser verwaltet ein reiner Reducer die Eingabe (Ring, Darts). Eine reine Funktion `judge` bewertet die Antwort. Das Aufdecken nimmt die Antwort mit in den Sitzungszustand, die Auflösung zeigt Ergebniszeile, „Dein Weg“ und „Bester Weg“.

**Tech Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind v4 (`@theme` in `src/app/globals.css`), lucide-react, Vitest (ohne DOM; Komponenten nur über `renderToStaticMarkup`).

**Spec:** [docs/superpowers/specs/2026-11-12-weg-eingeben-design.md](../specs/2026-11-12-weg-eingeben-design.md)

## Global Constraints

- Oberfläche vollständig auf Deutsch, keine Emojis, Icons nur aus `lucide-react` (hier nur Löschen: `Delete`).
- Keine Tailwind-Klassen mit freien Werten in eckigen Klammern. Fehlende Größen und Farben als benannte Token in `@theme` (`src/app/globals.css`), mit Werten für hell und dunkel.
- Eingabe und Auflösung passen ohne Scrollen auf 375 × 667. Auf kleineren Geräten scrollt nur `STUDY_CONTENT`, Kopf und Fußzeile bleiben stehen. Keine Erklärung wird weggelassen oder eingeklappt.
- Die Bewertung (Nochmal bis Leicht) wird nie aus dem Ergebnis abgeleitet.
- Eingaben und Ergebnisse werden nicht gespeichert, keine Server Action, keine Schemaänderung.
- Das Gerüst (`StudySkeleton`) enthält keine Lerninhalte.
- Tests zuerst. Vor jedem Commit: `npm test`, `npm run typecheck`, `npm run lint`. Nur lokal committen, keine Attributionszeilen.
- Schreibweise der Felder wie in `src/lib/darts/model.ts`: `S1`…`S20`, `D1`…`D20`, `T1`…`T20`, `25` (Single Bull), `Bull` (Doppel).

## Review Focus

1. **Geteilter Weg als bester Weg** (z. B. Rest mit `16/8 · D16/D20`): Beide ausgeschriebenen Wege zählen als „Bester Weg“. Test in Task 1.
2. **Fehlwurf-Karte mit Stellwurf statt Finish:** Nie „Geht nicht auf“, nur „Richtiger/Anderer Stellwurf“. Test in Task 1.
3. **„Nochmal“ bringt dieselbe Karte zurück:** Eingabe und Ergebnis der vorigen Runde dürfen nicht stehen bleiben. Test in Task 3 (Zustand), Schlüssel in Task 5.
4. **Doppeltipp:** „Prüfen“ liegt an derselben Stelle wie die Bewertungsleiste. Ein schneller zweiter Tipp darf nicht gleich bewerten. Der bestehende Schutz greift nur, wenn auch „Prüfen“ und „Nicht checkbar“ `at` mitsenden. Test in Task 3.
5. **Bogey-Karte verrät sich nicht:** Fragebildschirm, Tastenfeld und Fußzeile von Bogey- und Rest-Karte sind gleich. Test in Task 5 (gleiches Markup für `r-` und `b-` bis auf die Zahl).

---

## Dateien

| Datei | Aufgabe |
|---|---|
| `src/lib/darts/judge.ts` (neu) | `Check`, `Answer`, `Verdict`, `checkFor`, `judge`, `isDoubleOut`. Reine Logik. |
| `src/components/study/route-input.ts` (neu) | Reducer der Eingabe (Ring, Darts, Grenzen, automatischer Wechsel auf D). |
| `src/components/study/route-pad.tsx` (neu) | Umschalter S/D/T und Tastenfeld, rein darstellend. |
| `src/components/study/verdict.tsx` (neu) | Ergebniszeile: Texte und Farben je Stufe. |
| `src/components/study/study-state.ts` | `reveal` trägt die Antwort, `rate` verwirft sie. |
| `src/components/study/card-view.ts` | Kurzform der Erklärungen. |
| `src/components/study/study-card.tsx` | Kleinere Zahl in Frage und Auflösung, „Dein Weg“ / „Bester Weg“. |
| `src/components/study/study-session.tsx` | Eingabe einbinden, neue Fußzeile. |
| `src/components/study/study-data.tsx` | `check: checkFor(card)` in jedes `StudyItem`. |
| `src/components/study/study-skeleton.tsx` | Gerüst im neuen Maß (Tastenfeld, zwei Knöpfe). |
| `src/app/globals.css` | Token für Zahlengrößen und Ergebnisfarben. |

---

### Task 1: Prüflogik

**Files:**
- Create: `src/lib/darts/judge.ts`
- Test: `src/lib/darts/judge.test.ts`

**Interfaces:**
- Consumes: `Card` aus `@/lib/darts/cards`; `parseDart`, `parseSteps`, `expandSteps`, `formatDart`, `dartValue` aus `@/lib/darts/model`; `cardById` aus `@/lib/cards` (nur Tests). Geteilte Wege kommen in `best`, `alternatives`, `twoDarts` und `follow.route` vor (z. B. `r-61`: Folgeweg `6/10 · D20/D18`); alle über `expandSteps(parseSteps(route.join(' ')))` auflösen.
- Produces:
  ```ts
  export type Check =
    | { kind: 'rest'; rest: number; best: string[][]; good: string[][] }
    | { kind: 'bogey'; rest: number }
    | { kind: 'follow'; rest: number; maxDarts: 1 | 2; best: string[][] }
    | { kind: 'setup'; rest: number; maxDarts: 1 | 2; throws: string[] }
  export type Answer = { kind: 'darts'; darts: string[] } | { kind: 'notCheckable' }
  export type VerdictCode =
    | 'best' | 'alternative' | 'notRecommended' | 'noCheckout'
    | 'checkable' | 'bogeyRight' | 'setupRight' | 'setupOther'
  export type Verdict = { code: VerdictCode; detail?: string }
  export function checkFor(card: Card): Check
  export function maxDarts(check: Check): 1 | 2 | 3
  export function offersNotCheckable(check: Check): boolean
  export function isDoubleOut(remaining: number): boolean
  export function judge(check: Check, answer: Answer): Verdict
  ```
  `best`/`good`/`throws` sind ausgeschriebene Wege in Feldschreibweise (geteilte Wege schon über `expandSteps` in zwei Wege aufgelöst). `rest` ist bei `follow`/`setup` der neue Rest (`card.newRest`).

- [ ] **Step 1: Write the failing tests** in `judge.test.ts`:

```ts
const check = (id: string) => checkFor(cardById(id)!)
const darts = (...d: string[]): Answer => ({ kind: 'darts', darts: d })
const notCheckable: Answer = { kind: 'notCheckable' }

it('builds a rest check from best, alternatives and twoDarts', () => {
  expect(check('r-121')).toEqual({ kind: 'rest', rest: 121, best: [['T20', 'T11', 'D14']], good: [['T17', 'T20', 'D5']] })
})
it('expands a split best route into both routes', () => {
  // r-42: best "10/6 · D16/D18"
  expect(check('r-42')).toEqual({ kind: 'rest', rest: 42, best: [['S10', 'D16'], ['S6', 'D18']], good: [] })
  expect(judge(check('r-42'), darts('S10', 'D16')).code).toBe('best')
  expect(judge(check('r-42'), darts('S6', 'D18')).code).toBe('best')
})
it('judges the best route as best', () => expect(judge(check('r-121'), darts('T20', 'T11', 'D14'))).toEqual({ code: 'best' }))
it('judges an alternative as alternative', () => expect(judge(check('r-121'), darts('T17', 'T20', 'D5')).code).toBe('alternative'))
it('counts the two-dart column as alternative', () => {
  // r-61: best T15 · D8, Alternative T7 · D20, mit 2 Darts T11 · D14
  expect(check('r-61')).toMatchObject({ good: [['T7', 'D20'], ['T11', 'D14']] })
  expect(judge(check('r-61'), darts('T11', 'D14')).code).toBe('alternative')
})
it('order matters: a reordered best route is not recommended', () =>
  expect(judge(check('r-121'), darts('T11', 'T20', 'D14')).code).toBe('notRecommended'))
it('a wrong total does not check out', () =>
  expect(judge(check('r-121'), darts('T20', 'T20', 'D14'))).toEqual({ code: 'noCheckout', detail: 'Ergibt 148 statt 121' }))
it('a last dart that is no double does not check out', () =>
  expect(judge(check('r-100'), darts('T20', 'S20', 'S20'))).toEqual({ code: 'noCheckout', detail: 'Letzter Dart ist kein Doppel' }))
it('Bull counts as double', () => expect(judge(check('r-100'), darts('S20', 'T10', 'Bull')).code).toBe('notRecommended'))
it('Nicht checkbar on a rest card is wrong', () => expect(judge(check('r-121'), notCheckable).code).toBe('checkable'))
it('Nicht checkbar on a bogey is right', () => expect(judge(check('b-169'), notCheckable).code).toBe('bogeyRight'))
it('any route on a bogey does not check out', () =>
  expect(judge(check('b-169'), darts('T20', 'T19', 'Bull'))).toEqual({ code: 'noCheckout', detail: 'Rest ist nicht checkbar' }))
it('builds a follow check from a miss card with finish', () =>
  expect(check('m-121-0')).toEqual({ kind: 'follow', rest: 101, maxDarts: 2, best: [['T17', 'Bull']] }))
it('judges a miss follow-up', () => {
  expect(judge(check('m-121-0'), darts('T17', 'Bull')).code).toBe('best')
  // m-100-0: neuer Rest 80, 2 Darts, empfohlen T20 · D10
  expect(judge(check('m-100-0'), darts('T16', 'D16')).code).toBe('notRecommended')
  expect(judge(check('m-100-0'), darts('T20', 'S10')).code).toBe('noCheckout')
})
it('judges a miss setup without ever saying noCheckout', () => {
  // m-125-1: neuer Rest 52, 1 Dart, Stellwurf S20 → Rest 32
  expect(check('m-125-1')).toEqual({ kind: 'setup', rest: 52, maxDarts: 1, throws: ['S20'] })
  expect(judge(check('m-125-1'), darts('S20'))).toEqual({ code: 'setupRight' })
  expect(judge(check('m-125-1'), darts('S12'))).toEqual({ code: 'setupOther' })
  expect(judge(check('m-125-1'), darts('T20'))).toEqual({ code: 'setupOther' })
})
it('isDoubleOut', () => {
  expect([2, 32, 40, 50].map(isDoubleOut)).toEqual([true, true, true, true])
  expect([1, 33, 42, 0, 25].map(isDoubleOut)).toEqual([false, false, false, false, false])
})
it('offersNotCheckable only on rest and bogey', () => {
  expect(offersNotCheckable(check('r-121'))).toBe(true)
  expect(offersNotCheckable(check('b-169'))).toBe(true)
  expect(offersNotCheckable(check('m-121-0'))).toBe(false)
})
```

Alle Kennungen stammen aus `src/data/cards.generated.json` (Stand 2026-11-12).

- [ ] **Step 2: Run** `npx vitest run src/lib/darts/judge.test.ts` → FAIL (Modul fehlt).

- [ ] **Step 3: Implement** `judge.ts`. Reihenfolge in `judge` für `rest`/`follow`: `notCheckable` → `checkable` (bei `follow` nicht erreichbar, wirf einen Fehler) · Gleichheit mit `best` → `best` · Gleichheit mit `good` → `alternative` · Summe ≠ `rest` → `noCheckout` „Ergibt {summe} statt {rest}“ · letzter Dart kein Doppel/Bull → `noCheckout` „Letzter Dart ist kein Doppel“ · sonst `notRecommended`. `bogey`: `notCheckable` → `bogeyRight`, sonst `noCheckout` „Rest ist nicht checkbar“. `setup`: Gleichheit mit `throws` → `setupRight`, sonst `setupOther`. Vergleich über normalisierte Strings (`formatDart(parseDart(x))`). `good` = `alternatives` plus `twoDarts`, jeweils ausgeschrieben, ohne Wege, die schon in `best` stehen. `isDoubleOut(n)`: `n === 50 || (n % 2 === 0 && n >= 2 && n <= 40)`.

- [ ] **Step 4: Run** `npx vitest run src/lib/darts/judge.test.ts` → PASS.

- [ ] **Step 5: Commit** `feat: judge a typed checkout route against the card`.

---

### Task 2: Eingabe-Reducer

**Files:**
- Create: `src/components/study/route-input.ts`
- Test: `src/components/study/route-input.test.ts`

**Interfaces:**
- Consumes: `Check`, `maxDarts`, `isDoubleOut` (Task 1); `Ring`, `parseDart`, `dartValue` aus `@/lib/darts/model`.
- Produces:
  ```ts
  export type InputState = { ring: Ring; darts: string[]; rest: number; max: 1 | 2 | 3 }
  export type InputAction =
    | { type: 'ring'; ring: Ring }
    | { type: 'number'; n: number }   // 1..20, mit aktuellem Ring
    | { type: 'outer' }               // „25“
    | { type: 'bull' }                // „Bull“
    | { type: 'undo' }
  export function initInput(check: Check): InputState
  export function inputReducer(s: InputState, a: InputAction): InputState
  export function remaining(s: InputState): number
  export function isFull(s: InputState): boolean
  ```

- [ ] **Step 1: Write the failing tests:**
  - `initInput` für Rest 121 → `{ ring: 'T', darts: [], rest: 121, max: 3 }`; für Rest 57 → Ring `'S'`; für Rest 32 → Ring `'D'`; für `m-121-0` → `rest: 101, max: 2`, Ring `'T'`.
  - Ring bleibt stehen: 121, `number 20`, `number 11` → `darts ['T20','T11']`.
  - Automatisch D: nach `T20`, `T11` bleibt 28 → Ring `'D'`. Nach `T20` bei Rest 100 (bleibt 40) → `'D'`.
  - Nur Wechsel **zu** D: Rest 121, Nutzer schaltet auf `'S'`, `number 1` → bleibt 120, Ring bleibt `'S'`.
  - `outer`/`bull` ignorieren den Ring: Ring `'T'`, `bull` → `'Bull'`, `outer` → `'25'`.
  - Grenze: nach `max` Darts ändern `number`/`outer`/`bull` nichts (gleiches Objekt), `undo` entfernt den letzten.
  - `undo` bei leerer Eingabe ändert nichts. Nach `undo` wird der Ring nach derselben Regel neu bewertet (nur Wechsel zu D).

- [ ] **Step 2: Run** `npx vitest run src/components/study/route-input.test.ts` → FAIL.

- [ ] **Step 3: Implement.** Startring (Entscheidung dieses Plans, im Entwurf nicht festgelegt): `isDoubleOut(rest)` → `'D'`, sonst `rest > 60` → `'T'`, sonst `'S'`. Nach jedem Hinzufügen und nach `undo`: `isDoubleOut(remaining)` → Ring `'D'`, sonst Ring unverändert. *(Später geändert: Der Ring startet immer auf `'S'`, springt nicht bei 50 auf D, und `undo` stellt den vorigen Ring wieder her; maßgeblich ist der Entwurf.)*

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit** `feat: keypad input state for typing a route`.

---

### Task 3: Antwort im Sitzungszustand

**Files:**
- Modify: `src/components/study/study-state.ts` (`StudyState`, `StudyAction`, `studyReducer`)
- Test: `src/components/study/study-state.test.ts`

**Interfaces:**
- Consumes: `Answer` (Task 1).
- Produces: `StudyState.answer: Answer | null`; Aktion `{ type: 'reveal'; at?: number; answer?: Answer }`.

- [ ] **Step 1: Write the failing tests:**
  - `reveal` mit `answer` speichert sie, `reveal` ohne `answer` setzt `null`.
  - `rate` setzt `answer` auf `null`, auch bei „Nochmal“ (Rating 1), damit die zurückkehrende Karte leer beginnt.
  - Ein ignoriertes `reveal` (zu schnell nach `rate`, `at` innerhalb `TAP_GUARD_MS`) ändert `answer` nicht.
- [ ] **Step 2: Run** `npx vitest run src/components/study/study-state.test.ts` → FAIL.
- [ ] **Step 3: Implement.** `initStudy` setzt `answer: null`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: carry the typed answer into the reveal`.

---

### Task 4: Kurzform der Erklärungen

**Files:**
- Modify: `src/components/study/card-view.ts` (`singleCaseNote`, `setupText`)
- Test: `src/components/study/card-view.test.ts` (Zeilen 13, 51, 55, 66–75, 85–86 anpassen)

**Interfaces:** keine neuen. `restDetailView` (genutzt von `rest-sheet.tsx`) bleibt unverändert.

- [ ] **Step 1: Tests umstellen auf die Kurzform:**
  - Titel `"Nur S20"` statt `"Nur Single 20 getroffen"`, Text `"101: T17 · Bull"` statt `"Rest 101, 2 Darts: T17 · Bull"`.
  - Stellwurf als Folge eines Single-Falls: Text `"Stellen: S20, Rest 32"` (Muster `/^Stellen: .+, Rest \d+$/`).
  - Fehlwurf-Karte mit Stellwurf: `[{ title: "Stellwurf", text: "S20, Rest 32" }]`.
  - Die Frage-Hinweiszeile der Fehlwurf-Karte („Ziel war T20, getroffen: Single 20“) bleibt unverändert.
- [ ] **Step 2: Run** `npx vitest run src/components/study/card-view.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Die Zahl der Darts in der Hand entfällt im Text (sie folgt aus dem Fall).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: shorter explanations on the study card`.

---

### Task 5: Fragebildschirm mit Tastenfeld

**Files:**
- Modify: `src/app/globals.css` (Token)
- Create: `src/components/study/route-pad.tsx`
- Modify: `src/components/study/study-card.tsx`, `study-session.tsx`, `study-data.tsx`, `study-skeleton.tsx`
- Test: `src/components/study/route-pad.test.ts`, bestehender `src/components/skeletons.test.ts` bleibt grün

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `StudyItem.check: Check` (in `study-session.tsx`, befüllt in `study-data.tsx` mit `checkFor(card)`).
  - `RoutePad({ state, onAction }: { state: InputState; onAction: (a: InputAction) => void })`.
  - Token: `--text-numeral-input: clamp(3.5rem, 19vw, 4.5rem)` und `--text-numeral-result: clamp(3rem, 15vw, 3.5rem)`, je mit `--line-height: 0.95`.

- [ ] **Step 1: Write the failing test** (`renderToStaticMarkup`):
  - `RoutePad` rendert genau 23 Tasten: 1–20, `25`, `Bull`, Löschen (`aria-label="Letzten Dart löschen"`), dazu eine Radiogruppe `aria-label="Ring"` mit `S`, `D`, `T`, der aktive Ring `aria-checked="true"`.
  - Ist `isFull(state)`, sind 1–20, `25`, `Bull` `disabled`, Löschen nicht.
  - Gleiches Markup für die Fragen von `r-121` und `b-169` bis auf die Zahl (Fragebereich plus Fußzeile; dafür Fragebereich und Fußzeile als exportierte Teilkomponenten `StudyQuestion` und `QuestionFooter` aus `study-session.tsx` oder einer neuen Datei `study-question.tsx` testbar machen).
- [ ] **Step 2: Run** `npx vitest run src/components/study/route-pad.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
  - Fragebildschirm (Reihenfolge laut Spec): Beschriftung, Zahl in `text-numeral-input`, `DartSlots` (feste Darts der Fehlwurf-Karte plus Eingabe; das nächste offene Feld mit durchgezogenem Rand statt gestrichelt, als neue Prop `next?: number` an `DartSlots`), Hinweiszeile der Fehlwurf-Karte, dann `RoutePad`. Raster 5 Spalten, letzte Reihe: `25` (2 Spalten), `Bull` (2 Spalten), Löschen. Tastenhöhe aus der Skala (`h-11`), Abstand `gap-1.5`.
  - Fußzeile: Rest/Bogey: `Nicht checkbar` (`variant="secondary"`) und `Prüfen` (Hauptknopf, `disabled` ohne Darts) nebeneinander, beide `size="xl"`; Fehlwurf: nur `Prüfen` in voller Breite. Darunter `Ohne Eingabe aufdecken` als kleiner Link-Knopf (`variant="link"`, `size="sm"`). Alle drei schicken `reveal` mit `at: performance.now()` und der passenden `answer` (ohne Eingabe: keine).
  - Eingabezustand mit `useReducer(inputReducer, check, initInput)` in einer Kindkomponente mit `key={`${currentId}:${session.total}:${session.done}`}`, damit jede Runde einer Karte leer beginnt.
  - Gerüst: gleiche Maße wie der neue Fragebildschirm (Zahl in `text-numeral-input`, drei Felder, Skeleton-Blöcke für Ringleiste und Tastenfeld, zwei Knopf-Skeletons). Keine Zahlen oder Wege im Gerüst.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: type a route on the study card`.

---

### Task 6: Auflösung mit Ergebniszeile

**Files:**
- Modify: `src/app/globals.css` (Farbtoken)
- Create: `src/components/study/verdict.tsx`
- Modify: `src/components/study/study-card.tsx`, `study-session.tsx`
- Test: `src/components/study/verdict.test.ts`

**Interfaces:**
- Consumes: `judge`, `Verdict`, `VerdictCode` (Task 1); `StudyState.answer` (Task 3).
- Produces: `verdictCopy(v: Verdict): { tone: 'strong' | 'soft' | 'bad'; title: string; note: string }`, `VerdictLine({ verdict }: { verdict: Verdict })`.

- [ ] **Step 1: Write the failing test** — `verdictCopy` liefert genau diese Texte (`note` = `detail`, wenn vorhanden, sonst der feste Text):

| code | tone | title | note |
|---|---|---|---|
| best | strong | Bester Weg | genau richtig |
| alternative | soft | Alternative | auch richtig |
| notRecommended | soft | Geht, aber nicht empfohlen | Finish stimmt, Weg ist schlechter |
| noCheckout | bad | Geht nicht auf | (detail) |
| checkable | bad | Ist checkbar | Es gibt einen Weg |
| bogeyRight | strong | Richtig: nicht checkbar | Stellwurf siehe unten |
| setupRight | strong | Richtiger Stellwurf | genau richtig |
| setupOther | soft | Anderer Stellwurf | empfohlen siehe unten |

  Dazu: `VerdictLine` rendert `role="status"`.
- [ ] **Step 2: Run** `npx vitest run src/components/study/verdict.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
  - Farbtoken (hell / dunkel): `--verdict-soft: #fff6c2` / `#332b00`, `--verdict-soft-foreground: #0b0b0c` / `#ffd400`, `--verdict-bad: #fde3e0` / `#3a1411`, `--verdict-bad-foreground: #9a2318` / `#ff6b5e`; in `@theme inline` als `--color-verdict-*` verdrahten. `strong` nutzt `bg-primary text-primary-foreground`. Kontrast mindestens 4,5 : 1 prüfen und als Kommentar vermerken wie bei den bestehenden Token.
  - Auflösung, wenn `state.answer` gesetzt ist: Zahl in `text-numeral-result`, `VerdictLine`, Zeile „Dein Weg“ (`DartSlots` mit den eingegebenen Darts in neutraler Farbe, bei Fehlwurf-Karten die festen Darts davor mit Fehlwurf-Markierung; bei `notCheckable` statt Pillen der Text „Nicht checkbar“ in einer neutralen Pille über die volle Breite), Zeile „Bester Weg“ (bisherige `answer.slots`, Beschriftung „Bester Weg“, bei Bogey „Stellwurf“), dann `NoteList`. Ohne Antwort bleibt die Auflösung wie heute.
  - Das Ergebnis berechnet `judge(current.check, state.answer)` beim Rendern.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: show the verdict and the typed route when revealing`.

---

### Task 7: Prüfung im Browser

**Files:** keine Codeänderung, außer was die Prüfung aufdeckt.

- [ ] **Step 1:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` → alles grün.
- [ ] **Step 2:** Dev-Server über den Launch-Eintrag `checkout-trainer` (bei belegtem Port `checkout-trainer-3001`) starten, mit dem Testkonto aus `.data/test-user.json` anmelden, Fenster auf 375 × 667, `/lernen` öffnen.
- [ ] **Step 3:** Für je eine Rest-, Bogey- und Fehlwurf-Karte durchspielen: Eingabe, „Prüfen“, „Nicht checkbar“, „Ohne Eingabe aufdecken“. Erwartet: kein Scrollen in Frage und Auflösung (`STUDY_CONTENT.scrollHeight <= clientHeight`), auch bei einer Rest-Karte mit vier Erklärungen; Ergebniszeile wie in Task 6; „Nochmal“ bringt die Karte leer zurück.
- [ ] **Step 4:** Hell und dunkel per Screenshot prüfen.
- [ ] **Step 5:** Falls Korrekturen nötig waren: Commit `fix: …` mit den Prüfbefehlen vorher.
