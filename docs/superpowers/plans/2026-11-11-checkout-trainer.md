# Checkout-Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine deutschsprachige Next.js-Web-App, mit der angemeldete Nutzer Darts-Checkout-Wege (Rest 2 bis 170, Fehlwurf-Fälle, Bogey-Zahlen) per Karteikarten mit FSRS-Wiederholung lernen.

**Architecture:** Die Kartendaten entstehen aus einer Referenztabelle plus Regelwerk in reinem TypeScript und werden als generierte JSON-Datei ausgeliefert. In der Datenbank liegen nur Konten, Lernzustand und Bewertungsprotokoll. Server Components laden Daten, Server Actions schreiben, die Lernsitzung läuft als Client-Reducer mit Speichern im Hintergrund.

**Tech Stack:** Next.js (App Router, aktuelle stabile Version, TypeScript), shadcn/ui, lucide-react, Better Auth (E-Mail/Passwort, Admin-Plugin), Drizzle ORM, Postgres (lokal und in Tests PGlite, produktiv Neon über `pg`), ts-fsrs, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-11-checkout-trainer-design.md`

## Global Constraints

- Oberfläche vollständig auf Deutsch. Routen: `/`, `/registrieren`, `/anmelden`, `/warten`, `/heute`, `/lernen`, `/statistik`, `/einstellungen`, `/verwaltung`, `/impressum`, `/datenschutz`.
- Keine Emojis, nirgends. Icons nur aus `lucide-react` und nur für Navigation oder wo Text allein nicht reicht.
- Jede Seite hat eine Aufgabe. Kein zusätzlicher Inhalt, der nicht in der Spec steht.
- Kein E-Mail-Versand, kein Dienst mit Zahlungsart, keine weiteren externen Dienste.
- **Kein Zugriff auf Vercel, Neon oder andere fremde Dienste ohne vorherige Absprache mit dem Auftraggeber.** Alles bis einschließlich Task 14 läuft rein lokal. Task 15 endet mit einem Vorschlag und wartet.
- Git: nur lokal committen, nie pushen. Keine Attributionszeilen in Commit-Nachrichten.
- Bibliotheks-APIs (Next.js, Better Auth, Drizzle, ts-fsrs, shadcn) vor der Nutzung gegen die aktuelle Dokumentation prüfen. Die in diesem Plan genannten Aufrufe sind Absicht, nicht garantiert exakte Signaturen.
- Bei UI-Arbeit gelten die Skills `frontend-design`, `shadcn` und `vercel-react-best-practices`.
- Bogey-Zahlen: 159, 162, 163, 165, 166, 168, 169.
- Tagesgrenze überall: Zeitzone `Europe/Berlin`.
- Betreiber-Testadresse: `betreiber@checkout-trainer.test`.

## Review Focus

1. **Doppeltes Tippen auf eine Bewertung** (oder doppelt gesendete Anfrage): Es zählt genau eine Bewertung. Test in Task 9.
2. **Speichern schlägt fehl** (Funkloch am Board): Die Bewertung geht nicht still verloren, sie bleibt als ungesichert markiert und wird erneut versucht. Test in Task 8.
3. **Kartendaten ändern sich nach einem Update** (eine gespeicherte Karten-Kennung existiert nicht mehr): Warteschlange und Statistik ignorieren sie, nichts stürzt ab. Tests in Task 8 und Task 12.
4. **Konto wird während einer Sitzung gesperrt oder die Anmeldung läuft ab:** Die Action lehnt ab, der Client leitet zur Anmeldung. Test in Task 9.
5. **Tageswechsel und Zeitumstellung:** Bewertungen um 23:59 und 00:01 Berliner Zeit zählen an verschiedenen Tagen, auch am Tag der Zeitumstellung. Test in Task 8.

## File Structure

```
src/lib/darts/model.ts        Dart-Typen, Wert, Format, Parser
src/lib/darts/checkouts.ts    Aufzählung aller Wege, minDarts, Bogey-Liste
src/lib/darts/scoring.ts      Bewertung, bestFinish, bestSetup
src/lib/darts/reference.ts    Referenztabelle mit Quelle
src/lib/darts/cards.ts        Kartentypen, buildCards, Begründungen
src/data/cards.generated.json Generierte Karten (committet)
src/lib/cards.ts              Zugriff auf generierte Karten (CARDS, CARD_ORDER, cardById)
scripts/generate-cards.ts     Schreibt die JSON-Datei
src/lib/db/schema.ts          Drizzle-Schema (Auth-Tabellen + card_state + review_log)
src/lib/db/index.ts           db-Instanz (PGlite oder pg)
src/lib/db/test-db.ts         Frische PGlite-Datenbank für Tests
src/lib/auth/index.ts         Better-Auth-Konfiguration
src/lib/auth/client.ts        Auth-Client für Formulare
src/lib/auth/guard.ts         requireActiveUser, requireAdmin
scripts/seed-admin.ts         Legt das Betreiberkonto an
src/lib/time.ts               dayKey, dayStart (Europe/Berlin)
src/lib/srs/fsrs.ts           rate, previewIntervals
src/lib/srs/queue.ts          buildQueue
src/lib/srs/session.ts        sessionReducer
src/lib/review/queries.ts     loadQueue, loadStatsData
src/lib/review/actions.ts     submitReview
src/lib/stats.ts              summarize
src/app/...                   Seiten, je Route ein Ordner
src/components/...            dart-slots, study-card, rest-grid, app-nav, Formulare
```

---

### Task 1: Projektgerüst

**Files:**
- Create: Next.js-Projekt im Repository-Stamm, `vitest.config.ts`, `src/lib/smoke.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Skripte `npm run dev`, `npm run build`, `npm run lint`, `npm test` (Vitest, einmaliger Lauf), `npm run typecheck`. Pfadalias `@/*` auf `src/*`.

- [ ] **Step 1:** Next.js mit `create-next-app@latest` anlegen (TypeScript, App Router, `src/`-Verzeichnis, Tailwind, ESLint, Alias `@/*`). Da der Ordner schon `docs/` und `.git` enthält: in einen temporären Unterordner erzeugen und den Inhalt in den Stamm verschieben. `.gitignore` zusammenführen, `.superpowers/` und `.data/` bleiben bzw. kommen hinein.
- [ ] **Step 2:** `npx shadcn@latest init` ausführen (Skill `shadcn` beachten). `lucide-react` als Icon-Bibliothek.
- [ ] **Step 3:** Vitest einrichten (`environment: 'node'`, Alias `@`), Skripte `test` und `typecheck` ergänzen. `src/lib/smoke.test.ts` mit einem trivialen Test.
- [ ] **Step 4:** `src/app/layout.tsx`: `<html lang="de">`, Titel „Checkout-Trainer". Die Beispielseite von create-next-app durch eine leere Startseite mit der Überschrift „Checkout-Trainer" ersetzen.
- [ ] **Step 5:** Prüfen: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Erwartet: alle ohne Fehler.
- [ ] **Step 6:** Commit `chore: scaffold next app with shadcn and vitest`.

### Task 2: Dart-Modell und Aufzählung der Wege

**Files:**
- Create: `src/lib/darts/model.ts`, `src/lib/darts/checkouts.ts`
- Test: `src/lib/darts/model.test.ts`, `src/lib/darts/checkouts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Ring = 'S' | 'D' | 'T'
  type Dart = { ring: Ring; n: number }           // n 1..20, 25 nur mit 'S' oder 'D'
  type Route = Dart[]
  dartValue(d: Dart): number
  formatDart(d: Dart): string                     // 'T20', 'D16', 'S20', '25', 'Bull'
  parseDart(s: string): Dart                      // Umkehrung, wirft bei Unsinn
  parseRoute(s: string): Route                    // 'T20 T11 D14'
  formatRoute(r: Route): string                   // 'T20 · T11 · D14'
  routeTotal(r: Route): number
  ALL_DARTS: Dart[]                               // 62 Felder
  BOGEYS: readonly number[]                       // [159,162,163,165,166,168,169]
  isBogey(rest: number): boolean
  allCheckouts(rest: number, maxDarts: 1|2|3): Route[]   // letzter Dart ist Doppel oder Bull
  minDarts(rest: number): 1|2|3|null
  ```

- [ ] **Step 1: Tests schreiben**

```ts
// model.test.ts
expect(dartValue({ ring: 'T', n: 20 })).toBe(60)
expect(dartValue({ ring: 'D', n: 25 })).toBe(50)
expect(formatDart({ ring: 'D', n: 25 })).toBe('Bull')
expect(formatDart({ ring: 'S', n: 25 })).toBe('25')
expect(formatDart({ ring: 'S', n: 20 })).toBe('S20')
expect(formatRoute(parseRoute('T20 T11 D14'))).toBe('T20 · T11 · D14')
expect(routeTotal(parseRoute('T20 T11 D14'))).toBe(121)
expect(() => parseDart('T25')).toThrow()
expect(() => parseDart('S21')).toThrow()
expect(ALL_DARTS).toHaveLength(62)

// checkouts.test.ts
expect(allCheckouts(170, 3).map(formatRoute)).toEqual(['T20 · T20 · Bull'])
expect(allCheckouts(2, 1).map(formatRoute)).toEqual(['D1'])
expect(allCheckouts(1, 3)).toEqual([])
for (const b of BOGEYS) expect(allCheckouts(b, 3)).toEqual([])
for (let r = 2; r <= 170; r++) expect(allCheckouts(r, 3).length > 0).toBe(!isBogey(r))
for (const r of allCheckouts(101, 3)) {
  expect(routeTotal(r)).toBe(101)
  expect(r.at(-1)!.ring).toBe('D')
}
expect(minDarts(50)).toBe(1)
expect(minDarts(100)).toBe(2)
expect(minDarts(101)).toBe(2)
expect(minDarts(99)).toBe(3)
expect(minDarts(169)).toBeNull()
```

- [ ] **Step 2:** `npm test -- src/lib/darts` ausführen. Erwartet: FAIL (Module fehlen).
- [ ] **Step 3:** Beide Module implementieren. `allCheckouts` zählt geordnete Folgen auf (Reihenfolge der Würfe zählt, keine Deduplizierung).
- [ ] **Step 4:** `npm test -- src/lib/darts`. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: dart model and checkout enumeration`.

### Task 3: Bewertung, bestes Finish, Stellwurf

**Files:**
- Create: `src/lib/darts/scoring.ts`
- Test: `src/lib/darts/scoring.test.ts`

**Interfaces:**
- Consumes: alles aus Task 2.
- Produces:
  ```ts
  halvings(d: Dart): number                       // D16→4, D8→3, D4→2, D12→2, D20→2, D2/D6/D10/D14/D18→1, sonst 0, Bull→0
  compareRoutes(a: Route, b: Route): number       // negativ = a ist besser
  rankCheckouts(rest: number, maxDarts: 1|2|3): Route[]  // bester zuerst
  type Setup = { throws: Route; leaves: number }
  type Follow = { kind: 'finish'; route: Route } | { kind: 'setup'; setup: Setup }
  bestSetup(rest: number, darts: 1|2|3): Setup
  followUp(rest: number, darts: 1|2, preferred?: (rest: number) => Route | undefined): Follow
  ```

Regeln für `compareRoutes`, in dieser Reihenfolge (aus der Spec):
1. weniger Darts,
2. mehr `halvings` des letzten Doppels, bei Gleichstand das höhere Doppel,
3. mehr „gerettete" Triples: Triples im Weg, bei denen nach Single desselben Felds mit den verbleibenden Darts noch ein Finish möglich ist. Ein dabei mögliches Finish über Bull zählt wie jedes andere,
4. weniger Triples,
5. höhere Felder zuerst (stabile, deterministische Reihenfolge).

Regeln für `bestSetup`:
- Erlaubte Würfe: S1 bis S20, T20, T19, T18, T17. Bis zu `darts` Würfe.
- Der gelassene Rest ist mindestens 2 und keine Bogey-Zahl.
- Bevorzugte Reste in dieser Reihenfolge: `[32, 40, 36, 24, 16, 20]`. Ist einer erreichbar, gewinnt der früheste. Gleichstand: weniger Triples, dann mehr Würfe auf die 20, dann höhere Felder.
- Ist keiner erreichbar: weniger Triples, dann der niedrigste Rest.

`followUp`: Gibt es ein Finish mit höchstens `darts` Darts, dann `finish`. Liefert `preferred(rest)` einen Weg mit höchstens `darts` Darts, wird dieser genommen, sonst `rankCheckouts(rest, darts)[0]`. Sonst `setup` mit `bestSetup(rest, darts)`.

- [ ] **Step 1: Tests schreiben**

```ts
expect(halvings(parseDart('D16'))).toBe(4)
expect(halvings(parseDart('D20'))).toBe(2)
expect(halvings(parseDart('Bull'))).toBe(0)
// weniger Darts schlägt besseres Doppel
expect(formatRoute(rankCheckouts(100, 3)[0])).toBe('T20 · D20')
expect(compareRoutes(parseRoute('T20 D20'), parseRoute('T20 S8 D16'))).toBeLessThan(0)
// bei gleicher Dartzahl gewinnt das besser teilbare Doppel
expect(compareRoutes(parseRoute('S8 D16'), parseRoute('S20 D10'))).toBeLessThan(0)
expect(formatRoute(rankCheckouts(32, 3)[0])).toBe('D16')
// Folgewege
expect(followUp(101, 2)).toEqual({ kind: 'finish', route: parseRoute('T17 Bull') })
expect(followUp(50, 1)).toEqual({ kind: 'finish', route: parseRoute('Bull') })
expect(followUp(61, 1)).toEqual({ kind: 'setup', setup: { throws: parseRoute('S20'), leaves: 41 } })
// Stellwürfe
expect(bestSetup(169, 3).leaves).toBe(32)
expect(bestSetup(159, 3)).toEqual({ throws: parseRoute('T20 T20 S7'), leaves: 32 })
for (const b of BOGEYS) {
  const s = bestSetup(b, 3)
  expect(b - routeTotal(s.throws)).toBe(s.leaves)
  expect(isBogey(s.leaves)).toBe(false)
  expect(s.leaves).toBeGreaterThanOrEqual(2)
}
```

- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** `scoring.ts` nach den Regeln oben implementieren.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: route scoring, follow-ups and setup shots`.

### Task 4: Referenztabelle

**Files:**
- Create: `src/lib/darts/reference.ts`
- Test: `src/lib/darts/reference.test.ts`

**Interfaces:**
- Produces: `REFERENCE: Record<number, string>` (Rest → Weg in Parser-Schreibweise, z. B. `121: 'T20 T11 D14'`), `referenceRoute(rest: number): Route | undefined`.

- [ ] **Step 1: Test schreiben**

```ts
for (let rest = 2; rest <= 170; rest++) {
  if (isBogey(rest)) { expect(REFERENCE[rest]).toBeUndefined(); continue }
  const route = referenceRoute(rest)!
  expect(routeTotal(route)).toBe(rest)
  expect(route.at(-1)!.ring).toBe('D')
  expect(route.length).toBe(minDarts(rest))        // weniger Darts gewinnt
}
expect(REFERENCE[170]).toBe('T20 T20 Bull')
expect(REFERENCE[100]).toBe('T20 D20')
expect(REFERENCE[32]).toBe('D16')
```

- [ ] **Step 2:** Test laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Eine verbreitete, öffentlich einsehbare Checkout-Tabelle wählen und alle 163 Wege eintragen. Quelle (Name und URL) als Kommentar in den Dateikopf. Nennt die Tabelle für einen Rest einen Weg mit mehr Darts als nötig, stattdessen `rankCheckouts(rest, 3)[0]` eintragen und den Rest im Kommentar als Abweichung aufführen.
- [ ] **Step 4:** Test laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: reference checkout table`.

### Task 5: Karten erzeugen

**Files:**
- Create: `src/lib/darts/cards.ts`, `scripts/generate-cards.ts`, `src/data/cards.generated.json`, `src/lib/cards.ts`
- Modify: `package.json` (Skript `generate:cards`)
- Test: `src/lib/darts/cards.test.ts`

**Interfaces:**
- Consumes: Task 2 bis 4.
- Produces:
  ```ts
  type SingleCase = { dartIndex: 0 | 1; aimed: string; hit: string; newRest: number; dartsLeft: 1 | 2; follow: FollowText }
  type FollowText = { kind: 'finish'; route: string[] } | { kind: 'setup'; throws: string[]; leaves: number }
  type RestCard  = { id: string; kind: 'rest';  rest: number; best: string[]; reason: string; alternatives: string[][]; singleCases: SingleCase[] }
  type MissCard  = { id: string; kind: 'miss';  rest: number; thrown: string[]; aimed: string; hit: string; newRest: number; dartsLeft: 1 | 2; follow: FollowText }
  type BogeyCard = { id: string; kind: 'bogey'; rest: number; setup: { throws: string[]; leaves: number } }
  type Card = RestCard | MissCard | BogeyCard
  buildCards(): Card[]                 // in Lernreihenfolge
  // src/lib/cards.ts
  CARDS: Card[]; CARD_ORDER: string[]; cardById(id: string): Card | undefined
  ```
  Darts in Karten sind bereits formatierte Zeichenketten (`'T20'`, `'Bull'`).
- Kennungen: `r-121`, `b-169`, `m-121-0` (Rest, Index des verfehlten Darts).
- Lernreihenfolge: aufsteigend nach Rest. Je Rest erst die Rest- oder Bogey-Karte, dann die Fehlwurf-Karten nach `dartIndex`.
- `best` ist `referenceRoute(rest)`. `alternatives` sind die bis zu zwei besten Wege aus `rankCheckouts(rest, 3)`, die nicht `best` sind und höchstens einen Dart mehr brauchen als `best`.
- `singleCases`: für jedes Triple in `best` an Index 0 oder 1. `thrown` der Fehlwurf-Karte sind die Würfe davor plus das getroffene Single. Folgeweg über `followUp(newRest, dartsLeft, referenceRoute)`.
- `reason`: ein deutscher Satz, gewählt in dieser Reihenfolge: Folgeweg des ersten Single-Falls endet auf Bull → „Bleibt bei Single 20 auf Bull-Finish."; ist ein Finish → „Bleibt bei Single 20 auf einem Finish."; ein Dart → „Direkt auf das Doppel."; sonst nach `halvings` des letzten Doppels → „Endet auf D16, das sich viermal halbieren lässt." (Zahlwort passend, bei 0 „Kürzester Weg."). Feldnummer und Doppel jeweils aus dem Weg.

- [ ] **Step 1: Tests schreiben**

```ts
const cards = buildCards()
const byId = new Map(cards.map(c => [c.id, c]))
expect(new Set(cards.map(c => c.id)).size).toBe(cards.length)
expect(cards.filter(c => c.kind === 'rest')).toHaveLength(162)
expect(cards.filter(c => c.kind === 'bogey').map(c => c.rest)).toEqual([159,162,163,165,166,168,169])
expect(cards[0].id).toBe('r-2')
// Reihenfolge: aufsteigend, Rest-Karte vor ihren Fehlwurf-Karten
const rests = cards.map(c => c.rest)
expect(rests).toEqual([...rests].sort((a, b) => a - b))
expect(cards.findIndex(c => c.id === 'r-121')).toBeLessThan(cards.findIndex(c => c.id === 'm-121-0'))
// Beispiel aus der Spec (setzt REFERENCE[121] === 'T20 T11 D14' voraus; sonst Erwartung an den Referenzweg anpassen)
expect(byId.get('m-121-0')).toMatchObject({ thrown: ['S20'], aimed: 'T20', hit: 'S20', newRest: 101, dartsLeft: 2, follow: { kind: 'finish', route: ['T17', 'Bull'] } })
expect(byId.get('m-121-1')).toMatchObject({ thrown: ['T20', 'S11'], newRest: 50, dartsLeft: 1, follow: { kind: 'finish', route: ['Bull'] } })
// jede Fehlwurf-Karte rechnet richtig
for (const c of cards) if (c.kind === 'miss') {
  expect(c.rest - c.thrown.map(parseDart).reduce((s, d) => s + dartValue(d), 0)).toBe(c.newRest)
  expect(c.newRest).toBeGreaterThanOrEqual(2)
}
// keine Fehlwurf-Karten zu Bogey-Zahlen, keine Emojis, Begründung vorhanden
expect(cards.some(c => c.kind === 'miss' && isBogey(c.rest))).toBe(false)
for (const c of cards) if (c.kind === 'rest') expect(c.reason.length).toBeGreaterThan(5)
// generierte Datei ist aktuell
expect(CARDS).toEqual(cards)
```

Hinweis: 162 Rest-Karten = 169 Reste (2 bis 170) minus 7 Bogey-Zahlen.

- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** `cards.ts` implementieren. `scripts/generate-cards.ts` schreibt `buildCards()` als JSON. Skript `generate:cards` ausführen, Datei committen. `src/lib/cards.ts` liest die JSON-Datei.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: generate rest, miss and bogey cards`.

### Task 6: Datenbank

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/db/test-db.ts`, `drizzle.config.ts`, `drizzle/` (Migrationen), `.env.example`
- Test: `src/lib/db/schema.test.ts`

**Interfaces:**
- Produces:
  ```ts
  db                                   // Drizzle-Instanz; DATABASE_URL gesetzt → pg, sonst PGlite unter .data/pglite
  type Db = typeof db
  createTestDb(): Promise<Db>          // frische PGlite im Speicher, Migrationen eingespielt
  // Tabellen
  user                                 // Better-Auth-Felder + status: 'pending'|'active'|'blocked' (Default 'pending'), newPerDay: integer (Default 10), role
  session, account, verification, rateLimit
  cardState  { userId, cardId, due, stability, difficulty, elapsedDays, scheduledDays, learningSteps, reps, lapses, state, lastReview, introducedAt }   // PK (userId, cardId), Index (userId, due)
  reviewLog  { id, userId, cardId, rating, reviewedAt }                                                                                              // Index (userId, reviewedAt)
  ```
  `cardState.userId` und `reviewLog.userId` verweisen auf `user.id` mit `onDelete: 'cascade'`.
- Skripte: `db:generate` (drizzle-kit generate), `db:migrate`.

- [ ] **Step 1:** Test schreiben: `createTestDb()`, einen Nutzer, eine `cardState`-Zeile und eine `reviewLog`-Zeile einfügen. Nutzer löschen, danach sind beide abhängigen Tabellen leer. Zweites Einfügen derselben `(userId, cardId)` schlägt fehl.
- [ ] **Step 2:** Test laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Schema schreiben. Die Better-Auth-Tabellen mit dem Better-Auth-CLI (`generate`) für Drizzle/Postgres erzeugen und in `schema.ts` übernehmen, nachdem die Auth-Konfiguration aus Task 7 als Minimalversion existiert (Reihenfolge: minimale `auth/index.ts` anlegen, generieren, dann hier fertigstellen). Migration erzeugen. `index.ts` und `test-db.ts` implementieren. `.env.example` mit `DATABASE_URL=`, `BETTER_AUTH_SECRET=`, `BETTER_AUTH_URL=http://localhost:3000`, `ADMIN_EMAIL=betreiber@checkout-trainer.test`, `ADMIN_INITIAL_PASSWORD=`.
- [ ] **Step 4:** Test laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: database schema and local pglite setup`.

### Task 7: Konten

**Files:**
- Create: `src/lib/auth/index.ts`, `src/lib/auth/client.ts`, `src/lib/auth/guard.ts`, `src/app/api/auth/[...all]/route.ts`, `scripts/seed-admin.ts`
- Test: `src/lib/auth/auth.test.ts`

**Interfaces:**
- Consumes: `db`, `createTestDb` (Task 6).
- Produces:
  ```ts
  createAuth(db: Db): Auth             // Fabrik, damit Tests eine eigene Datenbank nutzen
  auth                                 // createAuth(db)
  authClient                           // für Client-Formulare
  type SessionUser = { id: string; email: string; name: string; status: 'pending'|'active'|'blocked'; role: string; newPerDay: number }
  getSessionUser(): Promise<SessionUser | null>
  requireActiveUser(): Promise<SessionUser>   // nicht angemeldet → redirect('/anmelden'); pending/blocked → redirect('/warten')
  requireAdmin(): Promise<SessionUser>        // zusätzlich role !== 'admin' → notFound()
  seedAdmin(auth: Auth, email: string, password: string): Promise<void>   // idempotent; status 'active', role 'admin'
  ```
- Konfiguration: E-Mail/Passwort ohne E-Mail-Bestätigung, Mindestlänge Passwort 10. Zusatzfelder `status` und `newPerDay` am Nutzer, vom Client nicht setzbar. Admin-Plugin für `role` und das Setzen fremder Passwörter. `deleteUser` aktiviert. Rate-Limit aktiv mit Speicher in der Datenbank: Registrierung höchstens 5 pro Stunde je IP, Anmeldung höchstens 10 pro Minute je IP. Registrierung mit der Adresse aus `ADMIN_EMAIL` (Groß-/Kleinschreibung egal) wird abgelehnt. Nutzer mit `status: 'blocked'` können sich nicht anmelden.

- [ ] **Step 1: Tests schreiben** (gegen `createAuth(await createTestDb())`, Aufrufe über `auth.api`)
  - Registrierung legt einen Nutzer mit `status === 'pending'`, `role !== 'admin'`, `newPerDay === 10` an.
  - Registrierung mit `status: 'active'` oder `role: 'admin'` im Anfragekörper ändert daran nichts.
  - Registrierung mit `ADMIN_EMAIL` und mit `Betreiber@Checkout-Trainer.Test` wird abgelehnt.
  - `seedAdmin` legt genau einen Nutzer mit `status 'active'`, `role 'admin'` an, zweiter Aufruf ändert nichts, Anmeldung mit dem Startpasswort gelingt.
  - Passwort mit 9 Zeichen wird abgelehnt.
  - Nutzer auf `blocked` gesetzt: Anmeldung schlägt fehl.
- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Implementieren. `scripts/seed-admin.ts` liest `ADMIN_EMAIL` und `ADMIN_INITIAL_PASSWORD` und ruft `seedAdmin`. Skript `db:seed-admin` ergänzen.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: accounts with manual approval and seeded operator`.

### Task 8: Wiederholungslogik

**Files:**
- Create: `src/lib/time.ts`, `src/lib/srs/fsrs.ts`, `src/lib/srs/queue.ts`, `src/lib/srs/session.ts`
- Test: je eine `.test.ts` daneben

**Interfaces:**
- Produces:
  ```ts
  // time.ts
  dayKey(d: Date): string                          // 'YYYY-MM-DD' in Europe/Berlin
  dayStart(d: Date): Date; dayEnd(d: Date): Date   // Grenzen des Berliner Tages als UTC-Zeitpunkte
  // fsrs.ts
  type Rating = 1 | 2 | 3 | 4                      // Nochmal, Schwer, Gut, Leicht
  type SrsState = { due: Date; stability: number; difficulty: number; elapsedDays: number; scheduledDays: number; learningSteps: number; reps: number; lapses: number; state: number; lastReview: Date | null }
  rate(prev: SrsState | null, rating: Rating, now: Date): SrsState
  previewIntervals(prev: SrsState | null, now: Date): Record<Rating, string>   // '< 1 Min', '10 Min', '1 Tag', '3 Tage'
  // queue.ts
  buildQueue(input: { order: string[]; states: { cardId: string; due: Date }[]; now: Date; newPerDay: number; introducedToday: number }): { due: string[]; fresh: string[] }
  // session.ts
  type SessionState = { queue: string[]; revealed: boolean; done: number; total: number; unsynced: { cardId: string; rating: Rating; reps: number }[] }
  type SessionAction = { type: 'reveal' } | { type: 'rate'; rating: Rating; reps: number } | { type: 'saved'; cardId: string } | { type: 'saveFailed'; cardId: string }
  initSession(cardIds: string[]): SessionState
  sessionReducer(s: SessionState, a: SessionAction): SessionState
  ```
- `rate` nutzt `ts-fsrs` ohne Fuzz (deterministisch).
- `buildQueue`: `due` sind Zustände mit `due <= dayEnd(now)`, sortiert nach `due`, deren `cardId` in `order` vorkommt. `fresh` sind die ersten `max(0, newPerDay - introducedToday)` Kennungen aus `order` ohne Zustand.
- `sessionReducer`: `rate` wirkt nur, wenn `revealed` wahr ist. Die vorderste Karte verlässt die Schlange. Bei `rating === 1` wird sie drei Plätze weiter hinten wieder eingefügt (oder am Ende, wenn die Schlange kürzer ist) und `total` steigt um 1. Jede Bewertung kommt in `unsynced`. `saved` entfernt den Eintrag, `saveFailed` lässt ihn stehen.

- [ ] **Step 1: Tests schreiben**

```ts
// time.test.ts (Zeitumstellung 2026: 29. März)
expect(dayKey(new Date('2026-03-28T22:59:00Z'))).toBe('2026-03-28')
expect(dayKey(new Date('2026-03-28T23:01:00Z'))).toBe('2026-03-29')
expect(dayKey(new Date('2026-03-29T21:59:00Z'))).toBe('2026-03-29')
expect(dayKey(new Date('2026-03-29T22:01:00Z'))).toBe('2026-03-30')

// fsrs.test.ts
const now = new Date('2026-11-11T10:00:00Z')
const good = rate(null, 3, now), again = rate(null, 1, now), easy = rate(null, 4, now)
expect(again.due.getTime()).toBeLessThan(good.due.getTime())
expect(good.due.getTime()).toBeLessThan(easy.due.getTime())
expect(good.reps).toBe(1)
expect(rate(null, 3, now)).toEqual(good)                     // deterministisch
expect(Object.keys(previewIntervals(null, now))).toEqual(['1', '2', '3', '4'])

// queue.test.ts
const order = ['r-2', 'r-3', 'r-4', 'r-5']
const q = buildQueue({ order, states: [
  { cardId: 'r-3', due: new Date('2026-11-10T08:00:00Z') },
  { cardId: 'r-2', due: new Date('2026-11-11T20:00:00Z') },   // heute fällig
  { cardId: 'r-9999', due: new Date('2026-11-01T00:00:00Z') }, // unbekannte Karte wird ignoriert
], now, newPerDay: 2, introducedToday: 1 })
expect(q).toEqual({ due: ['r-3', 'r-2'], fresh: ['r-4'] })
expect(buildQueue({ order, states: [], now, newPerDay: 2, introducedToday: 5 }).fresh).toEqual([])

// session.test.ts
let s = initSession(['a', 'b', 'c', 'd', 'e'])
expect(sessionReducer(s, { type: 'rate', rating: 3, reps: 0 })).toEqual(s)   // nicht aufgedeckt → nichts passiert
s = sessionReducer(sessionReducer(s, { type: 'reveal' }), { type: 'rate', rating: 1, reps: 0 })
expect(s.queue).toEqual(['b', 'c', 'd', 'a', 'e'])
expect(s.revealed).toBe(false)
expect(s.total).toBe(6)
expect(s.unsynced).toEqual([{ cardId: 'a', rating: 1, reps: 0 }])
expect(sessionReducer(s, { type: 'saveFailed', cardId: 'a' }).unsynced).toHaveLength(1)
expect(sessionReducer(s, { type: 'saved', cardId: 'a' }).unsynced).toHaveLength(0)
```

- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Module implementieren.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: spaced repetition scheduling, queue and session reducer`.

### Task 9: Bewertungen speichern und Warteschlange laden

**Files:**
- Create: `src/lib/review/queries.ts`, `src/lib/review/actions.ts`
- Test: `src/lib/review/review.test.ts`

**Interfaces:**
- Consumes: `db`, `createTestDb`, `rate`, `buildQueue`, `CARD_ORDER`, `cardById`, `getSessionUser`.
- Produces:
  ```ts
  // reine Kernfunktionen mit injizierter Datenbank (testbar)
  loadQueue(db: Db, user: { id: string; newPerDay: number }, now: Date): Promise<{ cardIds: string[]; dueCount: number; freshCount: number; reps: Record<string, number> }>
  applyReview(db: Db, user: { id: string; newPerDay: number }, input: { cardId: string; rating: Rating; reps: number }, now: Date): Promise<{ ok: true } | { ok: false; reason: 'unknown-card' | 'stale' | 'limit' | 'invalid' }>
  // Server Action ('use server')
  submitReview(input: { cardId: string; rating: number; reps: number }): Promise<{ ok: true } | { ok: false; reason: 'auth' | 'unknown-card' | 'stale' | 'limit' | 'invalid' }>
  ```
- `applyReview`: `reps` ist die Zahl bisheriger Bewertungen, die der Client für diese Karte kennt (0 bei neuer Karte). Stimmt sie nicht mit dem gespeicherten Stand überein, Ergebnis `stale` ohne Schreiben. Neue Karte, obwohl heute schon `newPerDay` Karten eingeführt wurden: `limit`. Zustand und Protokollzeile werden in einer Transaktion geschrieben.
- `submitReview`: lehnt mit `auth` ab, wenn kein Nutzer angemeldet oder `status !== 'active'` ist. Sonst `applyReview`.
- `cardIds` in `loadQueue`: fällige zuerst, dann neue.

- [ ] **Step 1: Tests schreiben** (gegen `createTestDb()`, Nutzer direkt einfügen)
  - Frischer Nutzer mit `newPerDay: 10`: `loadQueue` liefert `dueCount 0`, `freshCount 10`, `cardIds` sind die ersten zehn aus `CARD_ORDER`.
  - `applyReview` mit `{ cardId: 'r-2', rating: 3, reps: 0 }` gibt `ok`, danach existieren eine Zustandszeile mit `reps 1` und eine Protokollzeile.
  - Derselbe Aufruf noch einmal (doppeltes Tippen) gibt `stale`, es bleibt bei einer Protokollzeile.
  - `rating: 5` oder `rating: 0` gibt `invalid`, `cardId: 'r-9999'` gibt `unknown-card`.
  - Mit `newPerDay: 1`: nach einer eingeführten Karte gibt eine zweite neue Karte `limit`.
  - Nach „Gut" auf `r-2` ist die Karte am selben Tag nicht mehr in `loadQueue`, sofern ihr `due` nach dem Tagesende liegt. Nach „Nochmal" ist sie weiter enthalten.
  - `submitReview` mit einem Nutzer `status 'blocked'` und ohne Anmeldung gibt `{ ok: false, reason: 'auth' }` (`getSessionUser` im Test ersetzen).
- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: review persistence and queue loading`.

### Task 10: Gestaltung, öffentliche Seiten, Anmeldung, App-Rahmen

**Files:**
- Create: `src/app/page.tsx`, `src/app/registrieren/page.tsx`, `src/app/anmelden/page.tsx`, `src/app/warten/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/app-nav.tsx`, `src/components/auth/register-form.tsx`, `src/components/auth/login-form.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: `authClient`, `requireActiveUser`, `getSessionUser`.
- Produces: Layout-Gruppe `(app)`, die `requireActiveUser()` aufruft und die Navigation rendert. `AppNav` mit genau drei Einträgen: Heute, Statistik, Einstellungen (plus Verwaltung nur für `role === 'admin'`). Am Smartphone unten fixiert, auf breiten Bildschirmen oben. Farb- und Schrift-Tokens in `globals.css`.

- [ ] **Step 1:** Skill `frontend-design` laden und die Gestaltung festlegen: ruhig, typografisch, viel Weißraum, heller und dunkler Modus nach Systemeinstellung, Farbe nur mit Bedeutung. Drei Bedeutungsfarben als Tokens: `--route-best`, `--route-miss`, und eine vierstufige Skala `--level-new/learning/known/weak` für die Statistik. Tokens und Schrift in `globals.css` und `layout.tsx` eintragen.
- [ ] **Step 2:** Startseite (statisch): Überschrift, zwei Sätze zum Zweck, Knöpfe „Registrieren" und „Anmelden", Fußzeile mit Links auf Impressum und Datenschutz. Sonst nichts.
- [ ] **Step 3:** Registrieren und Anmelden mit shadcn-Formularbausteinen: Felder Name, E-Mail, Passwort (Anmelden ohne Name). Fehler als Text unter dem Formular. Nach der Registrierung Weiterleitung auf `/warten`, nach der Anmeldung auf `/heute`. Auf der Anmeldeseite der Hinweis: „Passwort vergessen? Wende dich an den Betreiber, er setzt dir ein neues."
- [ ] **Step 4:** `/warten`: „Dein Konto wartet auf Freischaltung durch den Betreiber." (bei `blocked`: „Dein Konto ist gesperrt."), dazu ein Knopf „Abmelden". Aktive Nutzer werden auf `/heute` umgeleitet.
- [ ] **Step 5:** `(app)/layout.tsx` und `AppNav` bauen.
- [ ] **Step 6:** Prüfen im Browser bei 375 px und 1280 px Breite, hell und dunkel: registrieren → Warteseite. Mit `npm run db:seed-admin` den Betreiber anlegen, anmelden → `/heute` (noch leer) mit Navigation. Kein horizontales Scrollen, keine Emojis. `npm run build` ohne Fehler.
- [ ] **Step 7:** Commit `feat: design tokens, public pages, auth forms and app shell`.

### Task 11: Heute und Lernen

**Files:**
- Create: `src/app/(app)/heute/page.tsx`, `src/app/(app)/lernen/page.tsx`, `src/components/study/study-session.tsx`, `src/components/study/study-card.tsx`, `src/components/dart-slots.tsx`
- Test: `src/components/study/card-view.test.ts`

**Interfaces:**
- Consumes: `loadQueue`, `submitReview`, `cardById`, `sessionReducer`, `initSession`, `previewIntervals`, `Card`.
- Produces:
  ```ts
  // reine Abbildung Karte → Anzeige, getrennt von React, damit testbar
  type CardView = {
    question: { label: string; big: string; slots: (string | null)[]; hint?: string }
    answer:   { label: string; big: string; slots: (string | null)[]; slotTone: 'best' | 'none'; missSlots: number[]; notes: { title: string; text: string }[] }
  }
  cardView(card: Card): CardView
  DartSlots(props: { slots: (string | null)[]; tone?: 'best' | 'none'; missSlots?: number[] })   // immer drei Felder, null = leeres Feld mit '?'
  ```

- [ ] **Step 1: Tests für `cardView` schreiben**

```ts
const rest = cardView(cardById('r-121')!)
expect(rest.question).toEqual({ label: 'Rest', big: '121', slots: [null, null, null] })
expect(rest.answer.slots).toEqual(['T20', 'T11', 'D14'])
expect(rest.answer.notes.map(n => n.title)).toEqual(expect.arrayContaining(['Warum', 'Alternative', 'Nur Single 20 getroffen']))

const miss = cardView(cardById('m-121-0')!)
expect(miss.question).toMatchObject({ label: 'Rest war 121', big: '?', slots: ['S20', null, null], hint: 'Ziel war T20, getroffen: Single 20' })
expect(miss.answer).toMatchObject({ label: 'Neuer Rest', big: '101', slots: ['S20', 'T17', 'Bull'], missSlots: [0] })

// Bogey-Frage ist von einer Rest-Frage nicht zu unterscheiden
const bogey = cardView(cardById('b-169')!)
expect(bogey.question).toEqual({ label: 'Rest', big: '169', slots: [null, null, null] })
expect(bogey.answer.big).toBe('Nicht checkbar')
expect(bogey.answer.notes[0]).toMatchObject({ title: 'Stellwurf' })
expect(bogey.answer.notes[0].text).toContain('Rest 32')
```

- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** `cardView` implementieren. Bei Wegen mit weniger als drei Darts bleiben die übrigen Felder `null` und werden in der Auflösung leer ohne Fragezeichen gezeigt. Bei einem Stellwurf als Folgeweg lautet die Notiz „Kein Finish mehr: {Würfe}, Rest {n}".
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** `/heute` (Server Component): zwei Zahlen („fällig", „neu") und ein Knopf „Lernen". Ist nichts zu tun: „Für heute bist du fertig." ohne Knopf.
- [ ] **Step 6:** `/lernen`: Die Server Component lädt die Warteschlange und übergibt nur die Karten dieser Sitzung an `StudySession` (Client Component). Aufbau wie im bestätigten Mockup (`.superpowers/brainstorm/56196-1794386005/content/lernablauf.html`): schmale Fortschrittsleiste und „7 / 20" oben, Rest als größtes Element, drei Dart-Felder, unten „Weg zeigen", nach dem Aufdecken die vier Knöpfe Nochmal, Schwer, Gut, Leicht mit dem nächsten Abstand darunter. Die Navigation ist auf dieser Seite ausgeblendet, oben links ein Schließen-Icon zurück zu `/heute`. Bewertung: Reducer sofort weiterschalten, `submitReview` im Hintergrund. Ergebnis `auth` → Weiterleitung auf `/anmelden`. Netzwerkfehler → `saveFailed`, ein einzeiliger Hinweis „Nicht gespeichert, wird erneut versucht", erneuter Versuch bei der nächsten Bewertung und beim Sitzungsende. Sitzungsende: „Geschafft" mit Anzahl der Karten und Knopf „Zur Übersicht".
- [ ] **Step 7:** Prüfen im Browser bei 375 px: eine komplette Sitzung mit je einer Rest- und Fehlwurf-Karte durchspielen, „Nochmal" bringt die Karte wieder, Seite neu laden setzt die Sitzung mit dem gespeicherten Stand fort, Bedienung mit einer Hand am unteren Rand möglich. `npm run build` ohne Fehler.
- [ ] **Step 8:** Commit `feat: today overview and study session`.

### Task 12: Statistik

**Files:**
- Create: `src/lib/stats.ts`, `src/app/(app)/statistik/page.tsx`, `src/components/rest-grid.tsx`
- Modify: `src/lib/review/queries.ts` (`loadStatsData`)
- Test: `src/lib/stats.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Level = 'new' | 'learning' | 'known'
  type Stats = { counts: Record<Level, number>; levels: Record<number, Level>; streak: number; hardest: { rest: number; again: number }[] }
  summarize(input: { states: { cardId: string; state: number; scheduledDays: number }[]; logs: { cardId: string; rating: number; reviewedAt: Date }[]; now: Date }): Stats
  loadStatsData(db: Db, userId: string): Promise<{ states: ...; logs: ... }>
  ```
- `levels` hat einen Eintrag für jeden Rest von 2 bis 170 (169 Einträge), bestimmt allein aus der Rest- oder Bogey-Karte dieses Rests. `known`: FSRS-Zustand „Review" und `scheduledDays >= 21`. `learning`: Zustand vorhanden, aber nicht `known`. Sonst `new`.
- `streak`: Zahl aufeinanderfolgender Berliner Tage mit mindestens einer Bewertung, endend heute oder gestern.
- `hardest`: bis zu fünf Reste mit den meisten Bewertungen „Nochmal" (alle Kartenarten des Rests zusammengezählt), absteigend, nur Reste mit mindestens einer.

- [ ] **Step 1: Tests schreiben**
  - Ohne Daten: `counts` ist `{ new: 169, learning: 0, known: 0 }`, `streak 0`, `hardest []`.
  - Zustand `r-40` in Review mit `scheduledDays 30` → `levels[40] === 'known'`. `r-41` mit `scheduledDays 3` → `'learning'`. Ein Zustand nur für `m-121-0` lässt `levels[121]` auf `'new'`. `b-169` wird wie eine Rest-Karte gewertet.
  - Zustand und Protokoll für `r-9999` werden ignoriert.
  - Bewertungen an drei aufeinanderfolgenden Berliner Tagen bis gestern → `streak 3`. Letzte Bewertung vorgestern → `streak 0`.
  - Dreimal „Nochmal" auf `r-121`, einmal auf `m-121-0`, zweimal auf `r-99` → `hardest` ist `[{ rest: 121, again: 4 }, { rest: 99, again: 2 }]`.
- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** `summarize` und `loadStatsData` implementieren.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Seite bauen: drei Zahlen (sicher, im Lernen, neu), Lernserie, Raster aller Reste von 2 bis 170 eingefärbt nach `Level` mit einer Legende als Text, darunter die Liste der schwierigsten Reste. Tippen auf einen Rest öffnet ein shadcn-Sheet (am Smartphone von unten) mit Weg, Begründung und Alternativen, bei Bogey-Zahlen „Nicht checkbar" und Stellwurf. Die Farbe ist nie das einzige Unterscheidungsmerkmal im Sheet.
- [ ] **Step 6:** Prüfen im Browser bei 375 px und 1280 px: Raster ohne horizontales Scrollen, Sheet öffnet und schließt. `npm run build` ohne Fehler.
- [ ] **Step 7:** Commit `feat: learning statistics`.

### Task 13: Einstellungen

**Files:**
- Create: `src/app/(app)/einstellungen/page.tsx`, `src/app/(app)/einstellungen/actions.ts`, `src/components/settings/*.tsx`
- Test: `src/app/(app)/einstellungen/actions.test.ts`

**Interfaces:**
- Produces: `setNewPerDay(db: Db, userId: string, value: unknown): Promise<{ ok: true } | { ok: false }>` (Kern) und die Server Action `updateNewPerDay(value: number)`.
- `newPerDay` ist eine ganze Zahl von 0 bis 50.

- [ ] **Step 1:** Tests schreiben: `setNewPerDay` speichert 0, 10 und 50. Es lehnt -1, 51, 2.5, `'10'` und `NaN` ab und lässt den Wert unverändert.
- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Kern und Action implementieren.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Seite bauen mit vier Abschnitten in dieser Reihenfolge: neue Karten pro Tag (Zahlenfeld, Speichern), Passwort ändern (aktuelles und neues Passwort, über Better Auth), Abmelden, Konto löschen (shadcn-AlertDialog mit Bestätigung, löscht über Better Auth, danach Startseite).
- [ ] **Step 6:** Prüfen im Browser: Wert ändern wirkt auf `/heute`, Passwort ändern und neu anmelden, ein Testkonto löschen und prüfen, dass seine Zustands- und Protokollzeilen weg sind.
- [ ] **Step 7:** Commit `feat: settings`.

### Task 14: Verwaltung und Pflichtseiten

**Files:**
- Create: `src/app/(app)/verwaltung/page.tsx`, `src/app/(app)/verwaltung/actions.ts`, `src/app/impressum/page.tsx`, `src/app/datenschutz/page.tsx`, `README.md`
- Test: `src/app/(app)/verwaltung/actions.test.ts`

**Interfaces:**
- Produces (Kernfunktionen mit injizierter Datenbank und Auth, dazu je eine Server Action, die zuerst `requireAdmin()` aufruft):
  ```ts
  setUserStatus(db: Db, auth: Auth, actor: SessionUser, userId: string, status: 'active' | 'blocked'): Promise<{ ok: boolean }>
  setUserPassword(auth: Auth, actor: SessionUser, userId: string, password: string): Promise<{ ok: boolean }>
  listUsers(db: Db): Promise<{ id: string; name: string; email: string; status: string; createdAt: Date }[]>   // wartende zuerst, dann nach Datum absteigend
  ```

- [ ] **Step 1: Tests schreiben**
  - `setUserStatus` mit einem Akteur ohne `role 'admin'` gibt `ok: false` und ändert nichts.
  - Als Admin: `pending` → `active`. `active` → `blocked` beendet alle Sitzungen des Nutzers.
  - Der Admin kann sich nicht selbst sperren.
  - `setUserPassword` als Admin: Anmeldung mit dem neuen Passwort gelingt, mit dem alten nicht. Passwort mit 9 Zeichen wird abgelehnt.
  - `listUsers` liefert wartende Nutzer vor aktiven.
- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Seite bauen: eine Liste der Nutzer (Name, E-Mail, Status als Text, Registrierungsdatum). Je Nutzer die passenden Aktionen: Freischalten, Sperren, Entsperren, Passwort setzen (Dialog mit Eingabefeld). Nicht-Admins erhalten 404.
- [ ] **Step 6:** `/impressum` und `/datenschutz` als statische Seiten mit Überschrift und dem Platzhaltertext „Dieser Text wird vom Betreiber ergänzt.". `README.md`: lokale Einrichtung (Umgebungsvariablen, Migration, Betreiber anlegen, Start), Tests, Karten neu erzeugen.
- [ ] **Step 7:** Prüfen im Browser: als zweiter Nutzer registrieren, als Betreiber freischalten, als Nutzer anmelden und lernen, sperren, Nutzer landet auf `/warten`. `/verwaltung` als normaler Nutzer gibt 404.
- [ ] **Step 8:** Commit `feat: operator administration and legal placeholder pages`.

### Task 15: Abschlussprüfung und Bereitstellungsvorschlag

**Files:**
- Create: `docs/bereitstellung.md`

- [ ] **Step 1:** Gesamtlauf: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Erwartet: alle ohne Fehler.
- [ ] **Step 2:** Durchsicht gegen die Anti-Ziele der Spec auf jeder Seite bei 375 px: keine Emojis (Suche im Quelltext nach Emoji-Zeichen), Icons nur in Navigation und Schließen-Knopf, eine Aufgabe pro Seite. Die Build-Ausgabe prüfen: öffentliche Seiten statisch, die Lernseite lädt nur die Karten der Sitzung und nicht die ganze JSON-Datei in den Client. Skill `vercel-react-best-practices` als Prüfliste verwenden und Auffälligkeiten beheben.
- [ ] **Step 3:** `docs/bereitstellung.md` schreiben: die konkreten Schritte für Vercel und Neon in der geplanten Reihenfolge (Projekt im Team `team_L16ekIiXaBpa4vlg7m0xQUbg` anlegen, Neon im kostenlosen Tarif über den Marketplace verbinden, Umgebungsvariablen `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` setzen, Migration einspielen, Betreiber anlegen, direkt bereitstellen ohne Git-Anbindung, Prüfung auf `*.vercel.app`), je Schritt was dabei angelegt wird und dass nichts davon Kosten auslöst.
- [ ] **Step 4:** Commit `docs: deployment proposal`.
- [ ] **Step 5:** **Anhalten.** Dem Auftraggeber den Vorschlag vorlegen und auf seine Zustimmung warten. Kein Schritt an Vercel oder Neon vor dieser Zustimmung.
