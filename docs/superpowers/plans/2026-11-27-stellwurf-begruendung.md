# Begründung beim Stellwurf: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Weicht der eingegebene Stellwurf vom empfohlenen ab, zeigt die Auflösung beide Würfe mit Rest und Doppel und nennt den Grund.

**Architecture:** `scoring.ts` bekommt einen Vergleich zweier Stellwürfe, der das entscheidende Kriterium mitliefert, und `bestSetup` sortiert damit. `judgeSetup` übersetzt das Kriterium in einen Grund und gibt ihn als Daten im `detail` zurück. Das Wörterbuch macht daraus den Text, `StudyCard` zeigt ihn als Notiz „Warum“ und setzt die Reste in die Beschriftung der beiden Reihen.

**Tech Stack:** TypeScript, Vitest, Testing Library. Kein Next.js-Code, keine Datenbank.

**Spec:** `docs/superpowers/specs/2026-11-27-stellwurf-begruendung-design.md`

## Global Constraints

- Tests zuerst. Vor jedem Commit `npm run test:coverage`, `npm run typecheck` und `npm run lint`.
- Commit-Nachrichten englisch, mit `Refs #87`, ohne Attributionszeilen und ohne `Closes`/`Fixes`.
- Alle Texte nur in `src/i18n/dictionaries/de.ts` und `en.ts`. `de.ts` ist die Quelle des Typs.
- `src/data/cards.generated.json` ändert sich nicht. `bestSetup` liefert für jeden Rest dasselbe wie vorher.
- `judge.ts` baut die Rangfolge nicht nach. Jeder Vergleich läuft über `compareSetups`.
- Keine Tailwind-Klassen mit freien Werten in eckigen Klammern. Keine neuen Icons.
- „Überworfen“, „Lässt eine Bogey-Zahl“ und „Richtiger Stellwurf“ sehen aus wie heute.

## Review Focus

- Gleiche Darts in anderer Reihenfolge, auch auf einer Fehlwurf-Karte mit einem Dart: „Richtiger Stellwurf“. Test in Task 2.
- Eingabe über Doppel, Bull oder 25, die nach der Rangfolge gleich gut oder besser ist: Grund `bigFields`, nie ein Grund, der die Eingabe schlechter nennt. Test in Task 2 (Durchzählung).
- Weniger Darts als erlaubt, etwa ein Dart auf einer Karte über 170: Es gibt einen Grund, nichts wirft. Test in Task 2 (Durchzählung).
- Überworfen und Bogey-Zahl: keine Notiz „Warum“, kein Rest in der Beschriftung. Test in Task 3.
- Englische Oberfläche: Jeder Grund hat einen englischen Text, die Beschriftung nennt den Rest. Test in Task 2 und 3.

---

### Task 1: Vergleich zweier Stellwürfe

**Files:**
- Modify: `src/lib/darts/scoring.ts` (`leaveRank`, `compareLeaves`, `bestSetup`)
- Test: `src/lib/darts/scoring.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SetupCriterion =
    | 'tier' | 'preferred' | 'halvings' | 'bull' | 'leave'
    | 'darts' | 'triples' | 'onTwenty' | 'fields'
  /** 0 bevorzugtes Doppel, 1 anderes Ein-Dart-Finish, 2 mit zwei Darts, 3 sonst. */
  export function leaveTier(leave: number): 0 | 1 | 2 | 3
  /** order negativ = a ist besser. by ist das erste Kriterium mit Unterschied, null bei Gleichstand in allem. */
  export function compareSetups(a: Setup, b: Setup): { order: number; by: SetupCriterion | null }
  ```
- Zuordnung von `by`: Stelle 0 von `leaveRank` ist `tier`. Bei gleicher Stufe 0 ist Stelle 1 `preferred`. Bei Stufe 1 ist Stelle 1 `halvings`, Stelle 2 `bull`, Stelle 3 `leave`. Bei Stufe 2 und 3 ist Stelle 1 `leave`. Danach in der Reihenfolge von `bestSetup`: `darts`, `triples`, `onTwenty`, `fields`.

- [ ] **Step 1: Failing Tests** in `scoring.test.ts`, neuer Block `describe('compareSetups')`. Hilfsfunktion `s(route: string, rest: number): Setup` baut den Stellwurf aus `parseRoute` und rechnet `leaves` aus.

  ```ts
  it.each([
    ['T20 S7', 'S1', 99, 'tier'],            // 32 gegen 98
    ['T20 S7', 'S1 T16', 99, 'tier'],        // 32 gegen 50
    ['T20 S7', 'S2 T19', 99, 'preferred'],   // 32 gegen 40
    ['T20 T19', 'T15 T20', 155, 'bull'],     // 38 gegen 50
    ['T20 T20', 'S1 T16', 159, 'leave'],     // 39 gegen 110
    ['T20 S15', 'T5 T20', 115, 'triples'],   // beide 40
    ['T20 S7', 'S10 T19', 99, 'onTwenty'],   // beide 32
    ['T20 S11', 'S20 T17', 103, 'fields'],   // beide 32
  ])('%s schlägt %s bei Rest %i über %s', (a, b, rest, by) => {
    const result = compareSetups(s(a, rest), s(b, rest))
    expect(result.by).toBe(by)
    expect(result.order).toBeLessThan(0)
    expect(compareSetups(s(b, rest), s(a, rest)).order).toBeGreaterThan(0)
  })
  it('meldet Gleichstand ohne Kriterium', () => {
    expect(compareSetups(s('T20 S7', 99), s('T20 S7', 99))).toEqual({ order: 0, by: null })
  })
  it('ordnet Reste in Stufen', () => {
    expect([32, 50, 98, 99].map(leaveTier)).toEqual([0, 1, 2, 3])
  })
  ```

- [ ] **Step 2:** `npx vitest run src/lib/darts/scoring.test.ts`. Erwartet: FAIL, `compareSetups` gibt es nicht.
- [ ] **Step 3:** `leaveTier` und `compareSetups` in `scoring.ts` schreiben. `bestSetup` sortiert mit `compareSetups(a, b).order`. `compareLeaves` entfällt, wenn nichts es mehr nutzt.
- [ ] **Step 4:** `npx vitest run src/lib/darts`. Erwartet: PASS, auch die vorhandenen `bestSetup`-Tests und `cards.test.ts`, das die erzeugte Kartendatei gegen den Generator prüft.
- [ ] **Step 5:** Die drei Prüfungen, dann Commit `refactor: expose the deciding criterion of the setup ranking` mit `Refs #87`.

---

### Task 2: Grund in der Bewertung und im Wörterbuch

**Files:**
- Modify: `src/lib/darts/judge.ts` (`VerdictDetail`, `judgeSetup`)
- Modify: `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts` (`study.verdict`)
- Modify: `src/components/study/verdict.tsx` (`verdictCopy`)
- Test: `src/lib/darts/judge.test.ts`, `src/components/study/verdict.test.tsx`, `src/components/study/verdict.dom.test.tsx`, `src/components/study/study-card.test.tsx`

**Interfaces:**
- Consumes: `compareSetups`, `leaveTier`, `halvings`, `Setup` aus `scoring.ts`.
- Produces in `judge.ts`:
  ```ts
  export type SetupReason =
    | 'fewerDarts' | 'noTwoDartFinish' | 'preferred' | 'halvings' | 'preferredOrder'
    | 'doubleOverBull' | 'lowerLeave' | 'triples' | 'onTwenty' | 'equal' | 'bigFields'
  // neue Art in VerdictDetail; double und bestDouble sind "D16", "Bull" oder null, wenn der Rest kein Ein-Dart-Finish ist
  | { kind: 'setupOther'; leaves: number; bestLeaves: number; double: string | null; bestDouble: string | null; reason: SetupReason }
  ```
- `judgeSetup` in dieser Reihenfolge: gleiche Darts ohne Rücksicht auf die Reihenfolge ergibt `setupRight`, dann überworfen, dann Bogey-Zahl, sonst `setupOther` mit `detail`. So bleibt die Karten-Empfehlung `setupRight`, auch wenn sie eine Bogey-Zahl ließe (vorhandener Test).
- Zuordnung Kriterium zu Grund, mit `r = compareSetups(eingabe, empfohlen)`:

  | Bedingung | Grund |
  |---|---|
  | `r.order <= 0` oder `r.by === 'fields'`, Eingabe enthält Doppel, Bull oder 25 | `bigFields` |
  | `r.order <= 0` oder `r.by === 'fields'` oder `r.by === 'darts'`, sonst | `equal` |
  | `tier`, Stufe der Eingabe 3 | `noTwoDartFinish` |
  | `tier`, Stufe der Eingabe 2 | `fewerDarts` |
  | `tier`, Stufe der Eingabe 1 | `preferred` |
  | `preferred`, das empfohlene Doppel hat mehr `halvings` | `halvings` |
  | `preferred`, sonst | `preferredOrder` |
  | `halvings` | `halvings` |
  | `bull` | `doubleOverBull` |
  | `leave` | `lowerLeave` |
  | `triples` | `triples` |
  | `onTwenty` | `onTwenty` |

- `study.verdict.detail` bekommt die Art `setupOther` und liefert den Grund als Text. `verdictCopy` gibt für diese Art keinen `note` zurück, der Grund steht ab Task 3 als Notiz. In beiden Wörterbüchern verliert `codes.setupOther` seinen `note`.
- Eine einzelne 25 zählt wie das Bull als Feld, über das nicht gestellt wird.
- Texte, `l` und `b` sind eingegebener und empfohlener Rest, `d` und `bd` die Doppel:

  | Grund | de | en |
  |---|---|---|
  | `fewerDarts` | `${l} braucht noch zwei Darts, ${b} nur einen` | `${l} still needs two darts, ${b} only one` |
  | `noTwoDartFinish` | `${l} ist mit zwei Darts nicht zu checken` | `${l} cannot be checked out with two darts` |
  | `preferred` | `${b} ist ein bevorzugtes Doppel, ${l} nicht` | `${b} is a preferred double, ${l} is not` |
  | `halvings` | `${bd} lässt sich öfter halbieren als ${d}` | `${bd} can be halved more often than ${d}` |
  | `preferredOrder` | `${b} ist das bevorzugte Doppel vor ${l}` | `${b} is preferred over ${l}` |
  | `doubleOverBull` | `Ein Doppel ist besser als das Bull` | `A double is better than the bull` |
  | `lowerLeave` | `Beide brauchen zwei Darts, ${b} ist der niedrigere Rest` | `Both need two darts, ${b} is the lower score` |
  | `triples` | `Gleicher Rest, aber mehr Triples nötig` | `Same score left, but more trebles needed` |
  | `onTwenty` | `Gleicher Rest, aber der empfohlene Wurf bleibt länger auf der 20` | `Same score left, but the recommended shot stays on the 20 longer` |
  | `equal` | `Gleich gut. Die App zeigt den Wurf über die höheren Felder` | `Just as good. The app shows the shot using the higher segments` |
  | `bigFields` | `Gestellt wird über Single und Triple, nicht über Doppel oder Bull` | `Set up with singles and trebles, not doubles or bull` |

  `en.ts` schreibt „Treble“ und „left“, die Texte oben folgen dem.

- [ ] **Step 1: Failing Tests** in `judge.test.ts`. Die zwei vorhandenen Erwartungen `{ code: 'setupOther' }` für `m-125-1` und `t-125` auf `.code` umstellen. Neu:

  ```ts
  const setup = (rest: number, maxDarts: 1 | 2 | 3, ...throws: string[]): Check => ({ kind: 'setup', rest, maxDarts, throws })
  const why = (c: Check, ...d: string[]) => judge(c, darts(...d)).detail

  it('counts the same darts in another order as right', () => {
    expect(judge(setup(99, 2, 'T20', 'S7'), darts('S7', 'T20'))).toEqual({ code: 'setupRight' })
  })
  it('gives both leaves and doubles with the reason', () => {
    expect(judge(setup(99, 2, 'T20', 'S7'), darts('S2', 'T19'))).toEqual({
      code: 'setupOther',
      detail: { kind: 'setupOther', leaves: 40, bestLeaves: 32, double: 'D20', bestDouble: 'D16', reason: 'halvings' },
    })
    expect(why(setup(99, 2, 'T20', 'S7'), 'S1')).toMatchObject({ leaves: 98, double: null })
    expect(why(setup(99, 2, 'T20', 'S7'), 'S1', 'T16')).toMatchObject({ leaves: 50, double: 'Bull' })
  })
  it.each([
    [99, ['T20', 'S7'], ['S1'], 'fewerDarts'],
    [102, ['T20', 'S10'], ['S1', 'S2'], 'noTwoDartFinish'],
    [99, ['T20', 'S7'], ['S1', 'T16'], 'preferred'],
    [114, ['T20', 'S14'], ['T20', 'T10'], 'preferredOrder'],   // 24 statt 40
    [155, ['T20', 'T19'], ['T15', 'T20'], 'doubleOverBull'],
    [159, ['T20', 'T20'], ['S1', 'T16'], 'lowerLeave'],
    [115, ['T20', 'S15'], ['T5', 'T20'], 'triples'],
    [99, ['T20', 'S7'], ['S10', 'T19'], 'onTwenty'],
    [103, ['T20', 'S11'], ['S20', 'T17'], 'equal'],
    [114, ['T20', 'S14'], ['D11', 'T20'], 'bigFields'],        // Eingabe lässt 32, Empfehlung 40
    [99, ['T20', 'S7'], ['S17', 'Bull'], 'bigFields'],         // gleicher Rest, ein Triple weniger
  ] as const)('rest %i: %j entered as %j is %s', (rest, best, entered, reason) => {
    expect(why(setup(rest, 2, ...best), ...entered)).toMatchObject({ reason })
  })
  ```

  Dazu die Durchzählung, ein Test über alle Karten aus `CARDS` mit `checkFor(card).kind === 'setup'`, je Rest und Dartzahl einmal. Eingaben sind alle Mengen aus 1 bis `maxDarts` Feldern aus S1–S20, D1–D20, T1–T20, 25 und Bull, ohne Rücksicht auf die Reihenfolge. Das sind rund 2,6 Millionen Eingaben. Der Test sammelt Verstöße in einer Liste, prüft am Ende einmal `expect(violations).toEqual([])` und bekommt ein eigenes Zeitlimit von 30 Sekunden. Für jede Eingabe mit `code === 'setupOther'` gilt, hier als `expect` geschrieben:

  ```ts
  expect(detail.kind).toBe('setupOther')
  const r = compareSetups(entered, best)
  const usesBig = enteredDarts.some((d) => d.ring === 'D' || d.n === 25)
  if (r.order <= 0) expect(detail.reason).toBe(usesBig ? 'bigFields' : 'equal')
  if (!usesBig) expect(r.order).toBeGreaterThan(0)       // ohne Doppel und Bull schlägt nichts die Empfehlung
  expect(r.by).not.toBe('darts')                          // entscheidet nie, deshalb ohne eigenen Text
  if (r.order > 0 && r.by !== 'fields') expect(['equal', 'bigFields']).not.toContain(detail.reason)
  if (r.by === 'leave') expect(leaveTier(detail.leaves)).toBe(2)
  if (detail.reason === 'halvings') expect(detail.double && detail.bestDouble).toBeTruthy()
  ```

  In `verdict.test.tsx`: Für jeden der elf Gründe liefern `de` und `en` aus `DICTIONARIES` über `study.verdict.detail` einen nicht leeren Text, und alle elf Texte einer Sprache sind verschieden. `verdictCopy` gibt für ein `setupOther` mit `detail` den Titel „Anderer Stellwurf“ und keinen `note`. Für `leavesBogey` bleibt der `note` „Lässt 159, nicht checkbar“.

  Drei vorhandene Tests erwarten den Hinweis „Empfohlener Stellwurf unten“ und werden angepasst: `study-card.test.tsx:128` (der Status lautet nur noch „Anderer Stellwurf“), `verdict.test.tsx:17` und `verdict.dom.test.tsx:28` (`setupOther` ohne Hinweis).

- [ ] **Step 2:** `npx vitest run src/lib/darts/judge.test.ts src/components/study/verdict.test.tsx`. Erwartet: FAIL.
- [ ] **Step 3:** `SetupReason`, die neue `VerdictDetail`-Art und `judgeSetup` nach der Tabelle umsetzen. Das Doppel zu einem Rest kommt aus `formatDart`, bei 50 ist es das Bull.
- [ ] **Step 4:** Texte in `de.ts` und `en.ts` nach der Tabelle, `note` bei `codes.setupOther` entfernen, `verdictCopy` anpassen.
- [ ] **Step 5:** `npm test`. Erwartet: PASS, auch `no-hardcoded-text.test.ts`.
- [ ] **Step 6:** Die drei Prüfungen, dann Commit `feat: explain why another setup shot ranks lower` mit `Refs #87`.

---

### Task 3: Vergleich in der Auflösung

**Files:**
- Modify: `src/components/study/study-card.tsx` (`YourRoute`, `StudyCard`)
- Modify: `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts` (`study.result`)
- Test: `src/components/study/study-card.test.tsx`

**Interfaces:**
- Consumes: `VerdictDetail` der Art `setupOther` und `study.verdict.detail` aus Task 2.
- Produces: `study.result.withLeaves: (label: string, leaves: number, double: string | null) => string`
  - de: `Dein Weg · Rest 40 (D20)`, ohne Doppel `Dein Weg · Rest 98`
  - en: `Your route · 40 left (D20)`, ohne Doppel `Your route · 98 left`
- Verhalten nur bei `result.verdict.detail?.kind === 'setupOther'`:
  - Die sichtbare Beschriftung über „Dein Weg“ nennt `leaves` und `double`, die über „Stellwurf“ nennt `bestLeaves` und `bestDouble`.
  - Statt `answer.notes` steht eine Notiz mit Titel `t.card.why` und dem Text aus `t.verdict.detail(detail)`. Karten mit Stellwurf-Prüfung tragen genau eine Notiz, die den empfohlenen Rest nennt. Der steht jetzt in der Beschriftung. Das als Kommentar an die Stelle schreiben.
- In allen anderen Fällen bleibt die Ausgabe unverändert.

- [ ] **Step 1: Failing Tests** in `study-card.test.tsx`, im Block „mit eingegebener Antwort“, mit der Karte `o-171` (empfohlen T20 T20 S19, Rest 32):
  - Eingabe T20 T19 S14: sichtbar sind „Anderer Stellwurf“, „Dein Weg · Rest 40 (D20)“, „Stellwurf · Rest 32 (D16)“, „Warum“ und „D16 lässt sich öfter halbieren als D20“. „Danach Rest 32“ ist nicht im Dokument.
  - Eingabe S20 S20 S20: „Dein Weg · Rest 111“ ohne Klammer.
  - Eingabe T20 T20 S19: „Richtiger Stellwurf“, Beschriftung „Dein Weg“ ohne Rest, „Danach Rest 32“ sichtbar, kein „Warum“.
  - Eingabe T20 T20 T17 (überworfen) und eine Eingabe mit Bogey-Rest: kein „Warum“, Beschriftung ohne Rest.
  - Mit dem englischen Wörterbuch und Eingabe T20 T19 S14: „Your route · 40 left (D20)“ ist sichtbar. Die genaue Beschriftung aus `en.ts` übernehmen.
- [ ] **Step 2:** `npx vitest run src/components/study/study-card.test.tsx`. Erwartet: FAIL.
- [ ] **Step 3:** `withLeaves` in beide Wörterbücher, `StudyCard` und `YourRoute` anpassen. Die `label`-Eigenschaft von `DartSlots` bleibt die kurze Beschriftung ohne Rest.
- [ ] **Step 4:** `npm test`. Erwartet: PASS.
- [ ] **Step 5:** Im Browser prüfen, Launch-Eintrag und Testkonto laut `CLAUDE.md`: Übung „Wege“ mit der Auswahl „Stellwürfe“, eine abweichende Eingabe machen. Am Smartphone-Format in Deutsch und Englisch passt die Auflösung ohne Scrollen, jede Beschriftung bleibt einzeilig. Bricht sie um, das Doppel in Klammern in `withLeaves` weglassen und die Tests anpassen.
- [ ] **Step 6:** Die drei Prüfungen, dann Commit `feat: show both leaves and the reason for another setup shot` mit `Refs #87`.
