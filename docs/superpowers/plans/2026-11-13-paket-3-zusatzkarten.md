# Paket 3: Zusatzkarten mit Schaltern – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drei Schalter je Konto („Single statt Doppel“, „Nachbarfelder“, „Reste über 170“) mit 19 + 202 + 60 Zusatzkarten, anfangs aus, dazu die Prüfstufe „Lässt Bogey-Zahl“ für alle Stellwürfe.

**Architecture:** Der Generator (`src/lib/darts/cards.ts`) erzeugt alle 683 Karten in Lernreihenfolge. Eine reine Zuordnung `extraKindOf(card)` (`src/lib/extra-cards.ts`) sagt, zu welchem Schalter eine Karte gehört; `cardsFor(extras)` / `cardOrderFor(extras)` in `src/lib/cards.ts` sind die eine Stelle, an der nach Schaltern gefiltert wird. Lernplan, „Heute“, Prognose, Lernsitzung, Extrakarten und „Üben“ holen die Schalter aus der Datenbank (drei boolesche Spalten am Nutzer, nicht über Better Auth setzbar) und filtern über diese Funktionen; `applyReview` lehnt Bewertungen ausgeschalteter Karten ab.

**Tech Stack:** Next.js 16 (Cache Components), React 19, Drizzle (PGlite/Neon), Base UI (`@base-ui/react/switch`), Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-13-paket-3-zusatzkarten-design.md](../specs/2026-11-13-paket-3-zusatzkarten-design.md)

## Global Constraints

- Alle Regeln aus `CLAUDE.md`: Texte in `de.ts` und `en.ts`, keine Emojis, keine freien Tailwind-Werte (auch in `src/components/ui/`), Tests zuerst, Abdeckung ≥ 80 % getrennt für Backend und Frontend.
- `src/lib/db/schema.ts` von Hand, Migration nur mit `npm run db:generate` (wird `drizzle/0002_…`). Nur hinzufügen: drei Spalten `boolean DEFAULT false NOT NULL`, nichts löschen oder umschreiben; läuft auf Neon und PGlite.
- Karten nur mit `npm run generate:cards`; `cards.generated.json` nie von Hand.
- Schalter anfangs aus, für neue und bestehende Konten. Ausschalten löscht keinen Lernstand.
- Server Actions: Nutzer-ID nur aus der Sitzung, nur aktive Nutzer, Eingabe ungetraut (nur bekannte Schalter, nur `true`/`false`). Umleitungen nur über `localeRedirectPath()`.
- Cache Components: Gerüst ohne Nutzerdaten und Lerninhalte; Datenbausteine rufen zuerst `requireActiveUser()`. Kein `use cache`.
- Statistik-Raster bleibt 2–170. `bestSetup` bleibt unverändert.
- Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint` (ohne Fehler und Warnungen). Commit-Nachrichten englisch `feat: …`/`fix: …`, ohne Attributionszeilen. Nichts pushen.

## Entscheidungen des Umsetzers

1. **Speicherung:** drei Spalten am Nutzer: `extra_single_double`, `extra_neighbours`, `extra_over_170` (Drizzle `extraSingleDouble`, `extraNeighbours`, `extraOver170`), `boolean DEFAULT false NOT NULL`. Nicht in `additionalFields` von Better Auth, damit `/update-user` sie nicht setzen kann (wie `extraNew*`). Eine Spalte je Schalter ist in Postgres ab 11 ein reines Metadaten-`ADD COLUMN` (kein Umschreiben der Tabelle).
2. **Schalter-Namen:** `ExtraKind = "singleDouble" | "neighbours" | "over170"` (Reihenfolge wie in den Einstellungen).
3. **Kartenarten:** Nachbarfeld- und „Single statt Doppel“-Karten sind Fehlwurf-Karten (`kind: "miss"`) mit `variant: "neighbour" | "singleDouble"`; Anzeige, Prüfung und Gruppen der Übung gelten damit unverändert. Stellwurf-Karten über 170 sind eine neue Art `OverCard = { id, kind: "over", rest, setup: { throws, leaves } }`.
4. **Kennungen:** `n-<rest>-<dartIndex>-<treffer>` (etwa `n-170-0-S1`), `d-<feld>` (etwa `d-16`), `o-<rest>` (etwa `o-199`). Keine dieser Präfixe gab es je im Kartensatz.
5. **Reihenfolge der Nachbarn:** T20 → S1, dann S5; T19 → S7, dann S3.
6. **Auflösung der Karte über 170:** Beschriftung `Rest` / `Score`, große Zahl der Rest, die drei Würfe ohne Farbe (wie Stellwürfe), Notiz `Stellwurf` · `Danach Rest 40` (`t.card.afterwards`). Frage: `Rest` und die Zahl, drei offene Felder.
7. **Prüfstufe:** neuer `VerdictCode` `"setupBogey"`, Ton `bad` (hellrot), Titel `Lässt Bogey-Zahl` / `Leaves a bogey`, Hinweis aus `VerdictDetail { kind: "leavesBogey"; leaves }`: `Lässt 159, nicht checkbar` / `Leaves 159, no checkout`. `Check.setup.maxDarts` wird `1 | 2 | 3`.
8. **Bewertung einer ausgeschalteten Karte:** `applyReview` liest die Schalter unter der Zeilensperre und antwortet `{ ok: false, reason: "off" }`. Die Lernsitzung läuft weiter und zählt sie als „nicht gezählt“ (wie `limit`). So ist keine ausgeschaltete Karte über die Server Action erreichbar; eine vorher geladene Sitzung läuft trotzdem bis zum Ende.
9. **Einstellungen:** Abschnitt `Zusatzkarten` / `Extra cards` direkt unter „Lernmenge“. Drei Zeilen je mit Titel, einem Satz samt Kartenzahl und einem Schalter rechts (`@base-ui/react/switch`, eigener Baustein `src/components/ui/switch.tsx`). Speichern beim Umlegen; während des Speicherns ist der Schalter gesperrt; Rückmeldung `Gespeichert.` / `Saved.` als `role="status"` unter den Zeilen, Fehler (`t.auth.fallback`, ohne Verbindung `t.auth.noConnection`) als `role="alert"`, der Schalter springt dann zurück. Die Zeilen mit Titeln und Sätzen stehen im Skeleton schon da (keine Nutzerdaten), nur die Schalter laden nach.
10. **Texte:**
    - `Single statt Doppel` · `19 Karten: Doppel verfehlt, Single getroffen.` / `Single instead of double` · `19 cards: double missed, single hit.`
    - `Nachbarfelder` · `202 Karten: Statt T20 oder T19 fällt S1, S5, S7 oder S3.` / `Neighbouring fields` · `202 cards: S1, S5, S7 or S3 instead of T20 or T19.`
    - `Reste über 170` · `60 Karten: Stellwurf mit drei Darts von 171 bis 230.` / `Scores above 170` · `60 cards: setup shot with three darts from 171 to 230.`
    - Die Zahlen stehen in `EXTRA_CARD_COUNTS` (`src/lib/extra-cards.ts`), ein Test hält sie am Kartensatz fest; der Client importiert keine Kartendaten.
11. **Üben:** neuer Bereich `{ id: "171-230", from: 171, to: 230 }` am Ende von `RANGES`. Der Server gibt dem Client nur Karten eingeschalteter Arten und die verfügbaren Bereiche (`availableRanges(extras)`); die Ansicht filtert die gemerkte Auswahl auf diese Bereiche (ein gemerktes `171-230` ohne Schalter fällt still weg und wird beim nächsten Speichern nicht mehr geschrieben). `practiceGroups` für `over` → `["setups"]`.
12. **Statistik:** `hardest` nur für Reste bis 170. „Nochmal“ auf Zusatzkarten zählt über `card.rest` (Nachbarfeld: ursprünglicher Rest; Single statt Doppel: Rest des Doppels).
13. **Umschalten wirkt:** Die Server Action ruft `revalidatePath("/[lang]/(app)", "layout")`, damit Heute, Statistik und Üben beim nächsten Besuch neu laden.

## Review Focus

1. Eine vor dem Ausschalten geladene Lernsitzung bewertet eine jetzt ausgeschaltete Karte → kein Fehler, Sitzung läuft weiter, Hinweis „nicht gezählt“ – Tests in Task 4 (`applyReview` → `off`) und Task 4 (Sitzung behandelt `off` wie `limit`).
2. Aus- und wieder Einschalten → `card_state` bleibt, fällige Karten sind sofort wieder fällig, bereits eingeführte zählen nicht als neu – Test in Task 4.
3. Server Action mit fremden Werten (`"admin"`, `"over170 "`, `"true"`, `1`, `null`, fehlend, ausgesperrter Nutzer) → abgelehnt, Datenbank unverändert – Tests in Task 5.
4. Gemerkte Übungsauswahl nur mit `171-230`, Schalter aus → Seite lädt, „Wähle mindestens einen Bereich.“, kein Absturz – Test in Task 7.
5. Stellwurf über 170 mit drei Darts, die überwerfen (171: T20 · T20 · T20), oder mit weniger Darts → „Anderer Stellwurf“; derselbe Wurf, der eine Bogey-Zahl lässt, aber in anderer Reihenfolge als die Karte → „Lässt Bogey-Zahl“ – Tests in Task 1.

---

### Task 1: Prüfstufe „Lässt Bogey-Zahl“ und Stellwürfe mit drei Darts

**Files:** Modify `src/lib/darts/judge.ts`, `src/components/study/verdict.tsx`, `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts`; Tests `src/lib/darts/judge.test.ts`, `src/components/study/verdict.test.tsx`

**Interfaces:**
- Produces: `Check` Variante `{ kind: "setup"; rest: number; maxDarts: 1 | 2 | 3; throws: string[] }`; `VerdictCode` um `"setupBogey"`; `VerdictDetail` um `{ kind: "leavesBogey"; leaves: number }`.

- [ ] **Step 1: Failing tests** in `judge.test.ts`:
  - `it.each(BOGEYS)`: Karte `{ kind: "setup", rest: b + 60, maxDarts: 2, throws: ["T20","S1"] }`, Eingabe `["T20"]` → `{ code: "setupBogey", detail: { kind: "leavesBogey", leaves: b } }`.
  - Eingabe gleich `throws` → `setupRight`, auch wenn der Rest danach eine Bogey-Zahl wäre (Stufe 1 vor 2).
  - Rest 171, `maxDarts: 3`, `throws: ["T20","T20","S19"]`: `["T20","T20","S19"]` → `setupRight`; `["S19","T20","T20"]` → `setupOther`; `["T20","T20","T20"]` (überworfen) → `setupOther`; `["T20","T20"]` (lässt 51) → `setupOther`.
  - `maxDarts({ kind: "setup", rest: 199, maxDarts: 3, throws: [...] })` → 3.
  - `verdict.test.tsx`: `verdictCopy({ code: "setupBogey", detail: { kind: "leavesBogey", leaves: 159 } }, de.study)` → `{ tone: "bad", title: "Lässt Bogey-Zahl", note: "Lässt 159, nicht checkbar" }`; englisch `Leaves a bogey` / `Leaves 159, no checkout`.
- [ ] **Step 2:** `npx vitest run src/lib/darts/judge.test.ts src/components/study/verdict.test.tsx` → FAIL.
- [ ] **Step 3:** In `judge` Zweig `setup`: gleich → `setupRight`; sonst `leaves = rest − Summe`; `isBogey(leaves)` → `setupBogey`; sonst `setupOther`. Typ `maxDarts` erweitern, `TONES.setupBogey = "bad"`, Texte in beiden Wörterbüchern (`codes.setupBogey`, `detail` Fall `leavesBogey`).
- [ ] **Step 4:** Tests grün; `npm run test:coverage`, `npm run typecheck`, `npm run lint`.
- [ ] **Step 5:** Commit `feat: judge setup shots that leave a bogey number`.

### Task 2: Zusatzkarten im Generator

**Files:** Modify `src/lib/darts/cards.ts`, `src/lib/darts/judge.ts` (`checkFor` Fall `over`), `src/lib/cards.ts`, `src/lib/practice/filter.ts` (`practiceGroups` Fall `over`), `src/lib/practice/math.ts` (nur falls der Typ es verlangt), `src/components/study/card-view.ts` (Fall `over`), `src/lib/stats.ts` (`hardest` ≤ 170), regeneriert `src/data/cards.generated.json`; Create `src/lib/extra-cards.ts`; Tests `src/lib/darts/cards.test.ts`, `src/lib/darts/judge.test.ts`, `src/lib/extra-cards.test.ts`, `src/lib/cards.test.ts` (neu oder vorhandene Tests erweitern), `src/components/study/card-view.test.ts`, `src/lib/practice/filter.test.ts`, `src/lib/stats.test.ts`

**Interfaces:**
- Produces in `cards.ts`: `MissCard.variant?: "neighbour" | "singleDouble"`; `OverCard = { id: string; kind: "over"; rest: number; setup: { throws: string[]; leaves: number } }`; `Card = RestCard | MissCard | BogeyCard | TwoDartCard | OverCard`.
- Produces in `src/lib/extra-cards.ts` (frei von Server-Abhängigkeiten): `EXTRA_KINDS = ["singleDouble","neighbours","over170"] as const`, `type ExtraKind`, `type ExtraCards = Record<ExtraKind, boolean>`, `NO_EXTRA_CARDS`, `ALL_EXTRA_CARDS`, `EXTRA_CARD_COUNTS = { singleDouble: 19, neighbours: 202, over170: 60 }`, `extraKindOf(card: Card): ExtraKind | null`, `isCardOn(card: Card, extras: ExtraCards): boolean`, `isExtraKind(v: unknown): v is ExtraKind`.
- Produces in `src/lib/cards.ts`: `cardsFor(extras: ExtraCards): Card[]`, `cardOrderFor(extras: ExtraCards): string[]` (je Kombination einmal berechnet); `CARDS`, `CARD_ORDER`, `cardById` bleiben (alle Karten).

- [ ] **Step 1: Failing tests** in `cards.test.ts`:
  - Gesamt 683; `variant: "neighbour"` 202, davon `aimed === "T20"` 134 und `"T19"` 68, Treffer nur `S1`/`S5` bei T20 und `S7`/`S3` bei T19; je Nachbarfeld-Karte `newRest === rest − Summe(thrown)`, `newRest ≥ 2`, `thrown.at(-1) === hit`, `dartsLeft === 3 − thrown.length`, und je Fehlwurf-Karte auf T20/T19 gibt es genau zwei Nachbarfeld-Karten mit denselben Darts davor.
  - Beispiel `n-170-0-S1`: `thrown ["S1"]`, `aimed "T20"`, `newRest 169`, `dartsLeft 2`, `follow.kind "setup"`.
  - `variant: "singleDouble"` 19 Karten `d-2` … `d-20`; `d-16`: `rest 32`, `thrown ["S16"]`, `aimed "D16"`, `newRest 16`, `dartsLeft 2`, `follow { kind: "finish", route: ["D8"] }`; `d-15`: `follow.route ["S7","D4"]`.
  - `kind: "over"` 60 Karten `o-171` … `o-230`; `o-171` `{ throws ["T20","T20","S19"], leaves 32 }`, `o-199` `T20 · T20 · T13` lässt 40, `o-221` `T20 · T20 · T17` lässt 50, `o-230` `T20 · T20 · T20` lässt 50.
  - Reihenfolge: je Rest Rest/Bogey, Fehlwurf, Nachbarfeld, Zwei-Dart, dann `d-<n>` beim Rest `2n`; nach `r-170`/`t-170`… folgen `o-171` … `o-230` aufsteigend. Kennungen eindeutig.
  - Vorhandener Test, dass `cards.generated.json` zum Generator passt, bleibt (schlägt bis Step 4 fehl).
  - `extra-cards.test.ts`: `extraKindOf` für je eine Karte jeder Art; `EXTRA_CARD_COUNTS` gleich der Anzahl je Art in `CARDS`; `isExtraKind("over170")` wahr, `("admin")`, `(1)`, `(null)` falsch.
  - `cards.test.ts` (lib): `cardOrderFor(NO_EXTRA_CARDS)` hat 402 Einträge und ist gleich der bisherigen Reihenfolge ohne Zusatzkarten; `cardOrderFor(ALL_EXTRA_CARDS)` gleich `CARD_ORDER`; nur `over170` an → 462.
  - `judge.test.ts`: `checkFor(o-199)` → `{ kind: "setup", rest: 199, maxDarts: 3, throws: ["T20","T20","T13"] }`; `offersNotCheckable` falsch.
  - `card-view.test.ts`: `o-199` Frage `label "Rest"`, `big "199"`, drei leere Felder, kein `sub`/`spent`; Auflösung `big "199"`, Felder `T20,T20,T13`, `slotTone "none"`, Notiz `Stellwurf` · `Danach Rest 40`. `d-16` Frage `Rest war 32`, Hinweis `Ziel war D16, getroffen: Single 16`, `missSlots [0]`. `n-170-0-S5` Hinweis `Ziel war T20, getroffen: Single 5`.
  - `filter.test.ts`: `practiceGroups(o-199)` → `["setups"]`; Nachbarfeld-Karte mit Stellwurf → `["misses","setups"]`.
  - `stats.test.ts`: „Nochmal“ auf `o-199` erscheint nicht in `hardest`; „Nochmal“ auf `n-170-0-S1` zählt zu 170, auf `d-16` zu 32; Raster bleibt 169 Einträge.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Generator: `neighbourCards(rest, best, cases)` aus `cases` mit `aimed` T20/T19, `newRest = case.newRest + n(aimed) − n(neighbour)`, `follow = followAfterSingle(newRest, case.dartsLeft)`, Fall entfällt bei `newRest < 2`; `singleDoubleCard(n)` für `n` 2–20; `overCard(rest)` aus `bestSetup(rest, 3)`. `buildCards` in der Reihenfolge oben. `extraKindOf`, `cardsFor`/`cardOrderFor`, `checkFor`/`cardView`/`practiceGroups` für `over`, `hardest` filtert `rest ≤ 170`.
- [ ] **Step 4:** `npm run generate:cards` (meldet 683 Karten), Tests grün, Checks.
- [ ] **Step 5:** Commit `feat: generate neighbour, single-instead-of-double and over-170 cards`.

### Task 3: Schalter in der Datenbank

**Files:** Modify `src/lib/db/schema.ts`; Generate `drizzle/0002_*.sql`, `drizzle/meta/0002_snapshot.json`, `drizzle/meta/_journal.json`; Create `src/lib/extra-cards-db.ts`, Test `src/lib/extra-cards-db.test.ts`; Modify `src/lib/db/schema.test.ts`, `src/lib/auth/auth.test.ts`

**Interfaces:**
- Produces: Spalten `user.extraSingleDouble`, `user.extraNeighbours`, `user.extraOver170`; `extraCardsOf(row: { extraSingleDouble: boolean; extraNeighbours: boolean; extraOver170: boolean }): ExtraCards`; `EXTRA_COLUMNS` (ExtraKind → Spalte, für `select`/`set`); `loadExtraCards(db: Db, userId: string): Promise<ExtraCards>` (unbekannter Nutzer → `NO_EXTRA_CARDS`).

- [ ] **Step 1: Failing tests:**
  - `schema.test.ts`: neuer Nutzer ohne Angaben hat alle drei Spalten `false`.
  - `schema.test.ts` „Migration bei bestehenden Daten“: Test-Datenbank nur mit `0000` und `0001` migrieren (temporärer Ordner mit gekürztem `_journal.json` und den beiden SQL-Dateien), Nutzer und `card_state`-Zeile anlegen, dann mit `./drizzle` vollständig migrieren → Nutzer hat alle Schalter `false`, `card_state` unverändert.
  - `extra-cards-db.test.ts`: `loadExtraCards` liefert die gespeicherten Werte; fremder Nutzer → `NO_EXTRA_CARDS`.
  - `auth.test.ts`: `auth.api.updateUser` mit `extraOver170: true` im Körper ändert die Spalte nicht.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Spalten von Hand ins Schema (Kommentar wie bei `extraNew*`), `npm run db:generate`; SQL lesen: genau drei `ALTER TABLE "user" ADD COLUMN "…" boolean DEFAULT false NOT NULL;`. `extra-cards-db.ts` umsetzen.
- [ ] **Step 4:** Tests grün, Checks.
- [ ] **Step 5:** Commit `feat: store the extra card switches per account`.

### Task 4: Lernplan, Heute, Prognose und Bewertung filtern

**Files:** Modify `src/lib/review/queries.ts`, `src/app/[lang]/(app)/today/grant-extra-cards.ts`, `src/components/study/study-session.tsx` (nur Kommentar/Behandlung `off`, falls nötig); Tests `src/lib/review/review.test.ts`, `src/app/[lang]/(app)/today/grant-extra-cards.test.ts`, `src/components/study/study-session.test.tsx`

**Interfaces:**
- Consumes: `cardOrderFor`, `isCardOn`, `extraCardsOf`, `EXTRA_COLUMNS`.
- Produces: `queueFromRows(rows, allowance, now, extras: ExtraCards)`; `loadQueue` liest die Schalter mit `extraNewDay`/`extraNewCount` aus der Nutzerzeile (Rückgabe unverändert plus `extras`); `ReviewResult.reason` um `"off"`.

- [ ] **Step 1: Failing tests** (`review.test.ts`):
  - Alle aus: `loadQueue` mit Tageslimit 50 bringt keine `n-`/`d-`/`o-`-Karten; `unseenCount` 402.
  - `over170` an, alle 402 Grundkarten gesehen: `fresh` beginnt mit `o-171`.
  - Nachbarfelder an, Nutzer hat `r-2` … `r-170` und alle übrigen Grundkarten gesehen: die ersten neuen Karten sind `n-…` in Reihenfolge der Reste (zuerst schon durchlaufene Reste).
  - Fällige `n-170-0-S1` (due gestern) erscheint nur, solange Nachbarfelder an sind; nach Aus- und Einschalten ist die Zeile unverändert und wieder fällig.
  - `applyReview` für `o-171` bei ausgeschaltetem Schalter → `{ ok: false, reason: "off" }`, keine Zeile in `card_state`/`review_log`; eingeschaltet → `ok`.
  - `grantExtraNewCards`: mit allen Grundkarten gesehen und Schaltern aus → `all-introduced`; mit `over170` an → `ok`.
  - `study-session.test.tsx`: Ergebnis `{ ok: false, reason: "off" }` zählt als „nicht gezählt“, Sitzung läuft weiter.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen; in `applyReview` die Schalter in der gesperrten Abfrage mitlesen und vor dem Lesen des Lernstands prüfen.
- [ ] **Step 4:** Tests grün, Checks.
- [ ] **Step 5:** Commit `feat: queue, forecast and reviews only use switched-on extra cards`.

### Task 5: Server Action zum Umlegen

**Files:** Create `src/app/[lang]/(app)/settings/set-extra-cards.ts`; Modify `src/app/[lang]/(app)/settings/actions.ts`; Tests `src/app/[lang]/(app)/settings/actions.test.ts`, neu `src/app/[lang]/(app)/settings/server-actions.test.ts` (Muster wie `admin/server-actions.test.ts`)

**Interfaces:**
- Produces: `setExtraCards(db: Db, userId: string, kind: unknown, on: unknown): Promise<{ ok: true } | { ok: false }>`; Server Action `updateExtraCards(kind: ExtraKind, on: boolean): Promise<{ ok: true } | { ok: false }>`.

- [ ] **Step 1: Failing tests:**
  - Kern: `it.each(EXTRA_KINDS)` an/aus speichert genau diese Spalte; `it.each([["admin", true], ["over170 ", true], ["over170", "true"], ["over170", 1], [null, true], [undefined, undefined], [{}, false]])` → `{ ok: false }`, Spalten unverändert; nur der eigene Nutzer ändert sich.
  - Server Action über echte Sitzung: aktiver Nutzer → `ok`, Spalte gesetzt, `revalidatePath` gerufen; ohne Sitzung, wartend, gesperrt → `{ ok: false }`, nichts gespeichert.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen; Nutzer-ID nur aus `getSessionUser()`, Status `active`.
- [ ] **Step 4:** Tests grün, Checks.
- [ ] **Step 5:** Commit `feat: server action to switch extra cards`.

### Task 6: Abschnitt „Zusatzkarten“ in den Einstellungen

**Files:** Create `src/components/ui/switch.tsx`, `src/components/settings/extra-cards-form.tsx`, Test `src/components/settings/extra-cards-form.test.tsx`; Modify `src/components/settings/settings-data.tsx`, `src/components/settings/settings-skeleton.tsx`, `src/components/settings/settings-parts.tsx`, `src/app/[lang]/(app)/settings/page.tsx`, beide Wörterbücher; Tests `src/components/settings/settings-data.test.tsx`, `src/components/skeletons.test.tsx`, `src/app/[lang]/(app)/app-pages.test.tsx`

**Interfaces:**
- Consumes: `updateExtraCards`, `loadExtraCards`, `EXTRA_KINDS`, `EXTRA_CARD_COUNTS`.
- Produces: `ExtraCardsSwitches({ initial }: { initial: ExtraCards })` (Client), `ExtraCardsField()` (Datenbaustein), `ExtraCardsSkeleton()`; Wörterbuch `settings.extraCards = { title, saved, kinds: Record<ExtraKind, { label, hint: (n: number) => string }> }`.

- [ ] **Step 1: Failing tests** (`extra-cards-form.test.tsx`, Action gemockt):
  - Drei Schalter mit Rolle `switch` und den Namen `Single statt Doppel`, `Nachbarfelder`, `Reste über 170`, Beschreibungen mit `19 Karten`, `202 Karten`, `60 Karten`; Zustand aus `initial`.
  - Klick auf „Nachbarfelder“ ruft `updateExtraCards("neighbours", true)`, Schalter ist an, Status `Gespeichert.`.
  - Während des Speicherns gesperrt; zweiter Klick ruft die Action nicht erneut.
  - `{ ok: false }` → Schalter zurück, Meldung `Das hat nicht geklappt. Versuche es erneut.` als `alert`; Ablehnung der Promise → `Keine Verbindung. Versuche es erneut.`.
  - `settings-data.test.tsx`: `ExtraCardsField` ruft zuerst `requireActiveUser`, liefert die gespeicherten Werte.
  - Skeleton: drei Zeilen mit Titeln, keine Schalterzustände.
  - Englisch: `Extra cards`, `Neighbouring fields`.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen (Texte siehe Entscheidung 10, Layout Entscheidung 9).
- [ ] **Step 4:** Tests grün, Checks.
- [ ] **Step 5:** Commit `feat: extra cards section in settings`.

### Task 7: Seite „Üben“ nur mit eingeschalteten Karten

**Files:** Modify `src/lib/practice/filter.ts`, `src/components/practice/practice-data.tsx`, `src/components/practice/practice-host.tsx`, `src/components/practice/practice-select.tsx`; Tests `src/lib/practice/filter.test.ts`, `src/components/practice/practice-data.test.tsx`, `src/components/practice/practice-host.test.tsx`, `src/components/practice/practice-select.test.tsx`

**Interfaces:**
- Consumes: `cardsFor`, `loadExtraCards`.
- Produces: `RANGES` mit `"171-230"`; `availableRanges(extras: ExtraCards): RangeId[]`; `PracticeHost` und `PracticeSelect` bekommen `ranges: readonly RangeId[]`.

- [ ] **Step 1: Failing tests:**
  - `availableRanges(NO_EXTRA_CARDS)` ohne `171-230`, mit `over170` mit.
  - `PracticeData`: ruft zuerst `requireActiveUser`; Schalter aus → 402 Karten, kein Chip `171–230`; Nachbarfelder an → 604 Karten.
  - `PracticeSelect`: Chip `171–230` nur, wenn in `ranges`; Bereich 171–230 + `Stellwürfe` zählt 60 Karten.
  - `PracticeHost`: gemerkte Auswahl `{ exercise: "routes", ranges: ["171-230"], kind: "all" }` ohne den Bereich → `Wähle mindestens einen Bereich.`; nach Antippen von `2–40` wird `["2-40"]` gespeichert (ohne `171-230`).
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen.
- [ ] **Step 4:** Tests grün, Checks.
- [ ] **Step 5:** Commit `feat: practice only offers switched-on extra cards`.

### Task 8: Abschluss

- [ ] `CLAUDE.md`/Plan: Entscheidungen aus Umsetzung und Review hier nachtragen.
- [ ] Code-Review (Skill `code-review`, Stufe high, Diff gegen `develop`), Security-Review von Hand (Schalter je Konto, ausgeschaltete Karten über Actions/Abfragen, Eingabeprüfung, Gerüst ohne Nutzerdaten, Migration). Befunde beheben, Commit je Befundgruppe.
- [ ] Browsertest 375 px de/en (und Desktop, hell/dunkel) mit kopierter `.data`, `db:migrate` auf bestehendem Lernstand, alle drei Schalter, neue Kartenarten, „Lässt Bogey-Zahl“, Prognose, Chip 171–230, ausgeschaltete Karten nicht in der Warteschlange. Dev-Server am Ende stoppen.
