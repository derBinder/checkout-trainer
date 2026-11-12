# Sofortige Seitenwechsel mit Cache Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Wechsel zwischen den angemeldeten Seiten zeigt sofort ein vorgerendertes Gerüst, Nutzerdaten erscheinen als Skeleton und füllen sich beim Nachladen.

**Architecture:** Cache Components und Partial Prefetching werden eingeschaltet. Jede angemeldete Seite wird in ein Gerüst ohne Datenzugriff und in Datenbausteine hinter Suspense-Grenzen zerlegt, deren Rückfall-Inhalt Skeletons sind. Die Sitzungsprüfung wandert aus dem gemeinsamen Layout in die Datenbausteine, davor steht eine reine Cookie-Vorprüfung in `proxy.ts`. Die Verwaltung zieht in eine eigene, blockierende Routengruppe um.

**Tech Stack:** Next.js 16.4.5 (`cacheComponents`, `partialPrefetching`, `proxy.ts`, Route-Segment-Config `instant`), React 19 Suspense, Better Auth 1.7 (`getSessionCookie` aus `better-auth/cookies`), shadcn Skeleton, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-cache-components-design.md`

## Global Constraints

- Maßgeblich für jede Next.js-Frage ist die mitgelieferte Dokumentation unter `node_modules/next/dist/docs/01-app/`, vor allem `02-guides/migrating-to-cache-components.md`, `authentication-with-cache-components.md`, `instant-navigation.md`, `adopting-partial-prefetching.md`, `streaming.md` und `03-api-reference/03-file-conventions/` (`proxy`, `loading`, `not-found`, `02-route-segment-config/instant.md`). Nicht aus dem Gedächtnis arbeiten.
- Kein `use cache`, kein `use cache: private`, kein `use cache: remote` für Nutzerdaten oder Sitzung. Lerndaten und Sitzungsstatus werden bei jeder Anfrage frisch aus der Datenbank gelesen.
- Das Gerüst enthält weder Nutzerdaten noch Lerninhalte (Wege, Begründungen, Alternativen, Stellwürfe, Karten). Alles davon lädt erst in einem Datenbaustein, der zuerst `requireActiveUser()` bzw. `requireAdmin()` aufruft.
- `proxy.ts` prüft nur, ob ein Sitzungs-Cookie vorhanden ist. Keine Datenbankabfrage, keine Sitzungsvalidierung. Sie ersetzt keine Prüfung.
- Nicht-Betreiber erhalten auf `/verwaltung` weiterhin HTTP-Status 404 und kein Gerüst. Lässt sich das nicht halten: anhalten und melden, nicht auf eine gestreamte Fehlerseite mit Status 200 ausweichen.
- Skeletons haben die Maße des Inhalts im Normalfall. Über dem ersten Bildschirm (375 × 812) springt im Normalfall nichts. Hingenommen: Heute im Fertig-Zustand, Einstellungen des Betreibers, Listen am Seitenende, der Betreiber-Eintrag der Navigation.
- Skeletons sind für Screenreader versteckt (`aria-hidden`), der ladende Bereich trägt `aria-busy`. Pulsieren nur ohne `prefers-reduced-motion`.
- Keine Verhaltens-, Text- oder Datenänderung. Server Actions bleiben unverändert und prüfen weiter selbst.
- Keine neue Abhängigkeit (kein Playwright). Der shadcn-Baustein Skeleton ist erlaubt.
- Regeln aus `CLAUDE.md`: Oberfläche deutsch, keine Emojis, Icons nur aus `lucide-react`, keine Tailwind-Klassen mit freien Werten (benannte Tokens verwenden), Tests zuerst, nur lokal committen, keine Attributionszeilen, kein Zugriff auf Vercel oder Neon, Safe-chain nicht umgehen.
- Der lokale Bau darf keine Datenbank öffnen (`resolveDbTarget` liefert in der Build-Phase eine Speicher-Datenbank ohne Tabellen). Beim Vorrendern darf deshalb kein Datenzugriff stattfinden.

## Review Focus

1. **Beliebiges Cookie:** Eine Anfrage mit einem erfundenen Sitzungs-Cookie erhält das Gerüst, aber die Antwort enthält keinen Lerninhalt und keine Nutzerdaten, und sie endet mit einer Umleitung auf `/anmelden`. Prüfung in Task 4.
2. **Sitzung endet zwischen Gerüst und Daten** (abgelaufen, gesperrt, wartend): Der Datenbaustein leitet um, es erscheinen keine Daten. Prüfung in Task 2 (wartendes Konto) und Task 4.
3. **Stand nach einer Lernsitzung:** Heute und Statistik zeigen nach dem Zurückwechseln den neuen Stand, nicht einen im Browser gehaltenen alten. Prüfung in Task 3.
4. **Vorabladen löst keine Datenbankarbeit aus:** Sichtbare Links laden nur das Gerüst. Die Datenbausteine laufen erst bei der Navigation. Prüfung in Task 2 über die Server-Ausgabe eines Produktionsstarts.
5. **Reduzierte Bewegung und Screenreader:** Skeletons pulsieren nicht bei `prefers-reduced-motion` und werden nicht vorgelesen. Prüfung in Task 1 (Baustein) und Task 2.

## File Structure

```
next.config.ts                              cacheComponents, partialPrefetching
src/proxy.ts                                Cookie-Vorprüfung für die angemeldeten Routen
src/lib/auth/protected-routes.ts            reine Entscheidung der Vorprüfung
src/components/ui/skeleton.tsx              shadcn Skeleton, an die Tokens angepasst
src/app/(app)/layout.tsx                    Gerüst ohne blockierende Sitzungsprüfung
src/app/(app)/<seite>/page.tsx              Gerüst der Seite, Suspense um Datenbausteine
src/components/<bereich>/*-data.tsx         Datenbausteine (async, prüfen Sitzung, laden)
src/components/<bereich>/*-skeleton.tsx     Skeletons je Datenbaustein
src/app/(verwaltung)/layout.tsx             blockierende Betreiber-Prüfung
src/app/(verwaltung)/verwaltung/page.tsx    Verwaltung, Adresse bleibt /verwaltung
```

---

### Task 1: Fundament: Schalter, Vorprüfung, Skeleton-Baustein

**Files:**
- Create: `src/lib/auth/protected-routes.ts`, `src/lib/auth/protected-routes.test.ts`, `src/proxy.ts`, `src/components/ui/skeleton.tsx`
- Modify: `next.config.ts`, alle `page.tsx` und `layout.tsx` unter `src/app/(app)/`, `src/app/warten/page.tsx`, bei Bedarf `src/app/layout.tsx`

**Interfaces:**
- Produces:
  ```ts
  // protected-routes.ts (rein, ohne Next-Importe)
  PROTECTED_PREFIXES: readonly string[]      // ['/heute', '/lernen', '/statistik', '/einstellungen', '/verwaltung']
  isProtectedPath(pathname: string): boolean // exakter Treffer oder Präfix mit '/' danach
  needsLoginRedirect(pathname: string, hasSessionCookie: boolean): boolean
  // skeleton.tsx
  Skeleton(props: React.ComponentProps<'div'>)  // aria-hidden, Flächenfarbe, Pulsieren nur ohne reduzierte Bewegung
  ```
- Nach diesem Task verhält sich die App für Nutzer genau wie vorher. Alle Routen sind noch vom sofortigen Wechsel ausgenommen.

- [ ] **Step 1: Tests schreiben**

```ts
// protected-routes.test.ts
for (const p of ['/heute', '/lernen', '/statistik', '/einstellungen', '/verwaltung', '/heute/', '/statistik/x'])
  expect(isProtectedPath(p)).toBe(true)
for (const p of ['/', '/anmelden', '/registrieren', '/warten', '/impressum', '/datenschutz', '/api/auth/sign-in/email', '/heutemorgen', '/lernenx'])
  expect(isProtectedPath(p)).toBe(false)
expect(needsLoginRedirect('/heute', false)).toBe(true)
expect(needsLoginRedirect('/heute', true)).toBe(false)
expect(needsLoginRedirect('/anmelden', false)).toBe(false)
expect(needsLoginRedirect('/', false)).toBe(false)
```

- [ ] **Step 2:** `npx vitest run src/lib/auth/protected-routes.test.ts`. Erwartet: FAIL (Modul fehlt).
- [ ] **Step 3:** `protected-routes.ts` implementieren. `src/proxy.ts` anlegen: liest das Sitzungs-Cookie mit `getSessionCookie(request)` aus `better-auth/cookies`, leitet bei `needsLoginRedirect` auf `/anmelden` um, sonst weiter. `config.matcher` auf die fünf Präfixe beschränken. Dateiname, Exportname und Matcher-Syntax gegen die Doku zu `proxy` prüfen.
- [ ] **Step 4:** In `next.config.ts` `cacheComponents: true` und `partialPrefetching: true` setzen. Alle Segmente unter `src/app/(app)/` sowie `src/app/warten/page.tsx` mit `export const instant = false` ausnehmen. `npm run build` ausführen und jede Meldung nach der Migrationsanleitung beheben (synchrone Ein-/Ausgabe wie `new Date()` im Gerüst, veraltete Segment-Configs, Root-Layout). Erwartet: Build grün, ohne dass eine Datenbank geöffnet wird.
- [ ] **Step 5:** Skeleton-Baustein über die shadcn-CLI hinzufügen (Version ausdrücklich angeben) und anpassen: Rundung und Flächenfarbe über vorhandene Tokens, `aria-hidden`, `motion-reduce:animate-none`. Keine freien Tailwind-Werte (der Wächter-Test `src/styles/no-arbitrary-classes.test.ts` muss bestehen).
- [ ] **Step 6:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Erwartet: alles grün. Mit `next start` prüfen (curl, ohne Cookie): `/heute` → 307 nach `/anmelden`, `/` → 200, `/anmelden` → 200.
- [ ] **Step 7:** Commit `feat: enable cache components with a cookie pre-check and skeleton primitive`.

### Task 2: Layout, Navigation, Heute, Statistik

**Files:**
- Create: Datenbausteine und Skeletons unter `src/components/today/` und `src/components/stats/`, Betreiber-Eintrag der Navigation als eigener Baustein
- Modify: `src/app/(app)/layout.tsx`, `src/components/app-nav.tsx`, `src/app/(app)/heute/page.tsx`, `src/app/(app)/statistik/page.tsx`, `src/components/rest-grid.tsx`, `src/components/rest-sheet.tsx`

**Interfaces:**
- Consumes: `Skeleton`, `requireActiveUser`, `getSessionUser`, `loadQueue`, `loadStatsData`, `summarize`, `progressView`, `StreakChip`.
- Produces: Seiten `/heute` und `/statistik` ohne `instant = false`. Layout ohne blockierenden Sitzungsaufruf.

- [ ] **Step 1:** `(app)/layout.tsx`: Der Aufruf `requireActiveUser()` entfällt. Die Navigation rendert die drei festen Einträge sofort. Der Eintrag „Verwaltung" kommt aus einem asynchronen Baustein hinter einer eigenen Suspense-Grenze ohne sichtbaren Platzhalter. Dieser Baustein liest die Sitzung mit `getSessionUser()` und rendert nichts, wenn kein Betreiber angemeldet ist. Er leitet nicht um.
- [ ] **Step 2:** Heute nach der Tabelle der Spec zerlegen. Gerüst: Titel, Beschriftungen „fällig" und „neu", leere Fortschrittsleiste. Datenbausteine prüfen zuerst `requireActiveUser()` und laden dann. Skeleton im Normalzustand (zwei Zahlen, Fortschrittszeile, Knopf). `new Date()` nur im Datenbaustein.
- [ ] **Step 3:** Statistik zerlegen. Gerüst: Titel, die drei Beschriftungen mit Legende, das Raster 2 bis 170 mit allen Feldern in der Darstellung „neu" und ohne Antipp-Funktion. Datenbaustein: Serien-Schildchen, Zähler, eingefärbtes Raster mit Detailansicht, Liste der schwierigsten Reste. Die Detaildaten (`DETAILS` aus `CARDS`) dürfen nur im Datenbaustein erzeugt und an den Client gegeben werden. Das eingefärbte Raster ersetzt das neutrale an derselben Stelle mit denselben Maßen.
- [ ] **Step 4:** `instant = false` aus Heute und Statistik entfernen. `npm run dev` starten und die Prüfhinweise von Next.js für beide Routen abarbeiten, bis keine blockierende Stelle mehr gemeldet wird.
- [ ] **Step 5:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Erwartet: alles grün, `/heute` und `/statistik` in der Build-Ausgabe als teilweise vorgerendert.
- [ ] **Step 6:** Prüfen mit Produktionsstart (`npm run build && npx next start`) und einem lokal angelegten, aktiven Testkonto:
  - Im Browser bei 375 px, hell und dunkel, mit gedrosselter Verbindung: Tippen auf „Statistik" und „Heute" zeigt das Gerüst sofort, Skeletons füllen sich, über dem ersten Bildschirm springt nichts.
  - Review Focus 4: In der Server-Ausgabe erscheinen beim bloßen Anzeigen der Navigation keine Datenabfragen der Zielseiten (zum Prüfen vorübergehend eine Logzeile im Datenbaustein setzen und wieder entfernen).
  - Review Focus 2: Mit einem wartenden Konto `/heute` aufrufen: Umleitung auf `/warten`, in der Antwort keine Zahlen und keine Lerninhalte.
  - Review Focus 5: mit `prefers-reduced-motion` pulsiert nichts.
- [ ] **Step 7:** Commit `feat: instant shell and skeletons for today and statistics`.

### Task 3: Lernen und Einstellungen

**Files:**
- Create: Datenbausteine und Skeletons unter `src/components/study/` und `src/components/settings/`
- Modify: `src/app/(app)/lernen/page.tsx`, `src/app/(app)/einstellungen/page.tsx`

**Interfaces:**
- Consumes: wie Task 2, dazu `StudySession`, `cardView`, `intervalLabelChain`, die Formulare der Einstellungen.
- Produces: `/lernen` und `/einstellungen` ohne `instant = false`.

- [ ] **Step 1:** Lernen zerlegen. Gerüst: Kopfzeile mit Schließen-Kreuz und leerer Fortschrittslinie. Datenbaustein: lädt die Warteschlange, leitet bei leerer Warteschlange wie bisher auf `/heute` um und rendert sonst `StudySession` mit den Karten der Sitzung. Skeleton: Zähler, Beschriftung, große Zahl, drei Felder, Knopf unten, in den Maßen der Fragenansicht. Die Navigation bleibt auf dieser Seite ausgeblendet wie bisher.
- [ ] **Step 2:** Einstellungen zerlegen. Gerüst: Titel, alle Abschnittsüberschriften, Darstellungs-Umschalter, Passwort-Formular, Abmelden. Datenbausteine: das Formular „Neue Karten pro Tag" mit dem gespeicherten Wert (Skeleton in Feldhöhe) und der Abschnitt „Konto löschen", der für das Betreiberkonto entfällt.
- [ ] **Step 3:** `instant = false` aus beiden Routen entfernen, Prüfhinweise von Next.js abarbeiten.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Erwartet: alles grün, beide Routen teilweise vorgerendert.
- [ ] **Step 5:** Prüfen mit Produktionsstart und Testkonto bei 375 px, hell und dunkel:
  - Tippen auf „Lernen" und auf „Einstellungen" zeigt das Gerüst sofort.
  - Eine Sitzung mit zwei Karten lernen, danach Heute und Statistik öffnen: beide zeigen den neuen Stand (Review Focus 3).
  - In den Einstellungen den Wert ändern, Seite wechseln und zurück: der neue Wert steht da.
  - Sitzung mit leerer Warteschlange: `/lernen` leitet auf `/heute` um.
- [ ] **Step 6:** Commit `feat: instant shell and skeletons for study and settings`.

### Task 4: Verwaltung, Zugriffsprüfung, Abschluss

**Files:**
- Create: `src/app/(verwaltung)/layout.tsx`, Skeleton für die Nutzerliste
- Move: `src/app/(app)/verwaltung/` nach `src/app/(verwaltung)/verwaltung/` (Seite, Actions, Tests; Importpfade anpassen)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `requireAdmin`, `AppNav`, `listUsers`, `Skeleton`.
- Produces: `/verwaltung` unter derselben Adresse, blockierend, mit echter 404-Antwort für Nicht-Betreiber.

- [ ] **Step 1:** Die Verwaltung in die Routengruppe `(verwaltung)` verschieben. Das neue Layout ruft `requireAdmin()` vor dem Rendern auf, trägt `export const instant = false`, enthält oberhalb der Prüfung keine Suspense-Grenze und rendert danach die Navigation mit dem Betreiber-Eintrag und den Seitenrahmen. Die Nutzerliste lädt in einem Datenbaustein hinter Suspense mit Skeleton.
- [ ] **Step 2:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Erwartet: alles grün. `/warten` und `/verwaltung` sind die einzigen Routen mit `instant = false` (mit `grep` belegen).
- [ ] **Step 3:** Zugriffsprüfung gegen einen Produktionsstart mit `curl`. Dafür lokal drei Testkonten anlegen (aktiv, wartend, Betreiber) und je ein Sitzungs-Cookie über `POST /api/auth/sign-in/email` holen. Erwartet:

| Anfrage | Erwartung |
|---|---|
| `/heute` ohne Cookie | 307 nach `/anmelden` |
| `/heute` mit erfundenem Cookie | Antwort enthält weder `Bleibt bei` noch `Der übliche Weg` noch eine Nutzer-Zahl und führt zur Umleitung auf `/anmelden` |
| `/statistik` mit erfundenem Cookie | wie oben, zusätzlich kein `Nicht checkbar` |
| `/heute` mit wartendem Konto | Umleitung auf `/warten`, keine Daten |
| `/verwaltung` ohne Cookie | 307 nach `/anmelden` |
| `/verwaltung` mit aktivem Nicht-Betreiber | HTTP 404, kein Navigations- oder Seitengerüst im Body |
| `/verwaltung` mit Betreiber | HTTP 200, Nutzerliste |

  Weicht der Status bei Nicht-Betreibern von 404 ab: anhalten und melden.
- [ ] **Step 4:** Im Browser bei 375 px mit dem Betreiberkonto: Verwaltung öffnen, Nutzerliste erscheint nach dem Skeleton, Freischalten und Sperren funktionieren wie bisher. Mit dem aktiven Konto alle vier Seiten einmal durchwechseln.
- [ ] **Step 5:** `CLAUDE.md` ergänzen: Cache Components und Partial Prefetching sind eingeschaltet, Nutzerdaten werden nie gecacht, jeder Datenbaustein prüft die Sitzung selbst, das Gerüst enthält keine Nutzerdaten und keine Lerninhalte, `proxy.ts` ist nur eine Cookie-Vorprüfung.
- [ ] **Step 6:** Testkonten und ihre Daten aus der lokalen Datenbank entfernen. Commit `feat: blocking admin area and access checks for the instant shell`.
