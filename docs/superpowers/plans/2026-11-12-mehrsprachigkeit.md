# Mehrsprachigkeit (Deutsch und Englisch): Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die App gibt es unter `/de/…` und `/en/…` vollständig auf Deutsch und Englisch, mit Sprachschalter in den Einstellungen und in der Fußzeile der öffentlichen Seiten.

**Architecture:** Alle Seiten wandern unter `src/app/[lang]/` mit englischen Ordnernamen, das Root-Layout rendert je Sprache vor (`generateStaticParams`). `proxy.ts` leitet Adressen ohne Sprache weiter (Cookie, dann `Accept-Language`, sonst Englisch), prüft wie bisher das Sitzungs-Cookie und reicht die Sprache als Request-Header `x-locale` an Server Actions und Zugriffsprüfung weiter. Texte stehen in zwei typgleichen Wörterbüchern (`src/i18n/dictionaries/`). Server-Komponenten holen sie über `next/root-params`, Client-Komponenten über einen Provider. Die Kartenbegründungen speichert der Generator als strukturierte Fälle, den Satz bildet das Wörterbuch.

**Tech Stack:** Next.js 16 (App Router, Cache Components, `next/root-params`), React 19, TypeScript, Vitest (Umgebung `node`, Komponenten über `renderToStaticMarkup`), Better Auth, zod/mini. Keine neuen Pakete.

**Spec:** [docs/superpowers/specs/2026-11-12-mehrsprachigkeit-design.md](../specs/2026-11-12-mehrsprachigkeit-design.md)

## Global Constraints

- Beginn erst, wenn `feat/weg-eingeben` fertig und in `develop` gemergt ist. Grundlage ist `develop` nach diesem Merge.
- Sprachen genau `de` und `en`. Vorgabe ist `en`, nur Browser, die Deutsch vor Englisch nennen, bekommen `de`.
- Seitennamen in beiden Sprachen gleich: `/sign-in`, `/sign-up`, `/pending`, `/today`, `/study`, `/stats`, `/settings`, `/admin`, `/imprint`, `/privacy`. Startseite `/de`, `/en`. `/api/auth/…` ohne Sprache.
- Das Sprach-Cookie setzt nur der Umschalter. Interne Links und Weiterleitungen behalten die Sprache der aktuellen Seite.
- `proxy.ts` ohne Datenbank. Echte Status-Codes nur aus `proxy.ts` (307).
- Kein Bildschirm mischt Deutsch und Englisch, außer den Sprachnamen „Deutsch“ und „English“ (bzw. „DE“, „EN“), die nie übersetzt werden.
- Britisches Englisch, Fachbegriffe wie unter „Glossar“. Feldnamen (`T19`, `D12`, `S20`, `25`, `Bull`) in beiden Sprachen gleich.
- Inhalt von Impressum und Datenschutz bleibt Platzhalter, nur Überschrift, Titel und Links werden übersetzt.
- Fehlertexte, die nur in Logs landen (`throw new Error(…)` in `src/lib/darts/`), bleiben deutsch.
- Datenbank, Schema, Lernlogik und Karten-IDs ändern sich nicht.
- Cache-Components-Regeln aus `CLAUDE.md` gelten weiter: kein Cachen von Nutzerdaten, jeder Datenbaustein prüft die Sitzung zuerst, das Gerüst enthält keine Nutzerdaten und keine Lerninhalte.
- Keine Tailwind-Klassen mit freien Werten in eckigen Klammern, keine Emojis, Icons nur aus `lucide-react`.
- Tests zuerst. Vor jedem Commit: `npm test`, `npm run typecheck`, `npm run lint`. Nur lokal committen, keine Attributionszeilen.

## Glossar (Englisch)

Die englischen Texte schreibt der Umsetzer. Diese Begriffe sind gesetzt:

| Deutsch | Englisch |
|---|---|
| Rest (Zahl, die noch fehlt) | score; im Satz „62 left“ |
| Weg, bester Weg | route, best route |
| Alternative | alternative |
| Stellwurf, stellen auf | setup shot, set up |
| Kein Finish möglich | no checkout |
| Bogey-Zahlen | bogey numbers |
| Doppel, Triple, Single | double, treble, single |
| Bull (Doppel), 25 (Single Bull) | bull, 25 |
| mit 2 Darts | with 2 darts |
| Nochmal / Schwer / Gut / Leicht | Again / Hard / Good / Easy |
| Heute / Lernen / Statistik / Einstellungen / Verwaltung | Today / Study / Stats / Settings / Admin |
| Betreiber | operator |
| Freischaltung (Konto) | approval |
| Karteikarte, Karte | card |
| Darstellung: System / Hell / Dunkel | Appearance: System / Light / Dark |
| Sprache | Language |

## Review Focus

1. **Abgelaufene Sitzung in der „falschen“ Sprache:** Jemand mit deutschem Browser ohne Sprach-Cookie nutzt `/en/…` über einen geteilten Link, die Sitzung läuft ab. Die Umleitung zur Anmeldung muss nach `/en/sign-in` gehen, nicht nach `/de/sign-in`. Test in Task 4 (`guard` liest `x-locale`).
2. **Server Action leitet um** (`learnMoreCards` öffnet die Lernseite): Die Umleitung behält die Sprache. Test in Task 4.
3. **`Accept-Language` mit Regionen und Gewichten** (`de-AT;q=0.8, en-US`, `fr, de;q=0.5`, leer, Unsinn): Erwartung wie in der Spec, Englisch bei Unklarheit. Test in Task 1.
4. **Wechsel der Sprache auf einer Unterseite** (`/de/settings` → `/en/settings`, `/de` → `/en`): Dieselbe Seite in der anderen Sprache, nie die Startseite. Test in Task 1 (`switchLocalePath`).
5. **Vergessene deutsche Texte im Englischen** (unsichtbare `aria-label`, Seitentitel, Skeleton-Beschriftungen, Fehlerseiten): Der Wächtertest aus Task 2 findet harte Texte, die Paritätsprüfung fehlende Einträge. Die Liste `PENDING` muss am Ende leer sein (Task 10).

---

## Dateien

| Datei | Aufgabe |
|---|---|
| `src/i18n/locales.ts` (neu) | `LOCALES`, `Locale`, `isLocale`, `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `LOCALE_HEADER`, `INTL_LOCALE`, `pickLocale`. Rein, auch im Client nutzbar. |
| `src/i18n/paths.ts` (neu) | `ROUTES`, `localePath`, `splitLocale`, `switchLocalePath`. Rein. |
| `src/i18n/dictionaries/de.ts`, `en.ts` (neu) | Wörterbücher, `en` vom Typ `Dictionary`. |
| `src/i18n/dictionaries/index.ts` (neu) | `Dictionary`, `DICTIONARIES`, `dictionaryFor`. |
| `src/i18n/server.ts` (neu) | `getLocale`, `getDictionary` (root params), `requestLocale` (Header). Nur Server. |
| `src/i18n/client.tsx` (neu) | `I18nProvider`, `useLocale`, `useDictionary`, `useLocalePath`. |
| `src/i18n/no-hardcoded-text.test.ts` (neu) | Wächter gegen harte Texte, mit Liste `PENDING`. |
| `src/lib/auth/protected-routes.ts` | Geschützte Bereiche ohne Sprache, `proxyDecision`. |
| `src/proxy.ts` | Sprachweiterleitung, Anmeldeweiterleitung, Header `x-locale`. |
| `src/app/[lang]/…` | alle Seiten, umbenannt; Root-Layout mit `generateStaticParams`. |
| `src/lib/darts/cards.ts` | `Reason` statt Satz; `src/data/cards.generated.json` neu erzeugt. |
| `src/components/language/language-switch.tsx` (neu) | Schalter in zwei Formen. |
| `src/components/public-footer.tsx` (neu) | Fußzeile der öffentlichen Seiten. |

---

### Task 0: Ausgangslage

- [ ] **Step 1: Prüfen, dass `feat/weg-eingeben` in `develop` gemergt ist**

Run: `git branch --merged develop | grep feat/weg-eingeben`
Expected: eine Zeile. Fehlt sie: anhalten und beim Auftraggeber nachfragen.

- [ ] **Step 2: Arbeitszweig `feat/mehrsprachigkeit` von `develop` anlegen** (Worktree nach `superpowers:using-git-worktrees`) und `npm test` grün sehen.

- [ ] **Step 3: Dateiliste abgleichen**

Run: `git ls-files src | grep -v '\.test\.' | grep -v 'components/ui/'`
Die Dateien unter `src/components/study/` und `src/lib/darts/judge.ts` können vom Stand dieses Plans abweichen. Neue Dateien mit sichtbarem Text kommen in die Liste `PENDING` (Task 2) und werden in Task 7 übersetzt.

---

### Task 1: Sprachen und Pfade

**Files:**
- Create: `src/i18n/locales.ts`, `src/i18n/paths.ts`
- Test: `src/i18n/locales.test.ts`, `src/i18n/paths.test.ts`

**Interfaces:**
- Produces:
  - `LOCALES = ["de", "en"] as const`, `type Locale = (typeof LOCALES)[number]`, `isLocale(value: unknown): value is Locale`
  - `DEFAULT_LOCALE: Locale = "en"`, `LOCALE_COOKIE = "lang"`, `LOCALE_HEADER = "x-locale"`
  - `INTL_LOCALE: Record<Locale, string> = { de: "de-DE", en: "en-GB" }`
  - `pickLocale(input: { cookie?: string | null; acceptLanguage?: string | null }): Locale`
  - `ROUTES = { home: "", signIn: "/sign-in", signUp: "/sign-up", pending: "/pending", today: "/today", study: "/study", stats: "/stats", settings: "/settings", admin: "/admin", imprint: "/imprint", privacy: "/privacy" } as const`, `type Route = (typeof ROUTES)[keyof typeof ROUTES]`
  - `localePath(locale: Locale, route: Route): string`
  - `splitLocale(pathname: string): { locale: Locale | null; rest: string }`
  - `switchLocalePath(pathname: string, to: Locale): string`

- [ ] **Step 1: Failing tests**

```ts
// locales.test.ts
expect(pickLocale({ cookie: "de", acceptLanguage: "en" })).toBe("de");
expect(pickLocale({ cookie: "fr", acceptLanguage: "de-DE,de;q=0.9" })).toBe("de"); // ungültiges Cookie zählt nicht
expect(pickLocale({ acceptLanguage: "de-AT;q=0.8, en-US" })).toBe("en");           // höheres Gewicht gewinnt
expect(pickLocale({ acceptLanguage: "fr, de;q=0.5" })).toBe("de");
expect(pickLocale({ acceptLanguage: "fr, nl" })).toBe("en");
expect(pickLocale({ acceptLanguage: "" })).toBe("en");
expect(pickLocale({ acceptLanguage: ";;q=x,," })).toBe("en");
expect(pickLocale({})).toBe("en");
expect(pickLocale({ acceptLanguage: "DE-ch" })).toBe("de");                          // Groß-/Kleinschreibung egal

// paths.test.ts
expect(localePath("de", ROUTES.home)).toBe("/de");
expect(localePath("en", ROUTES.today)).toBe("/en/today");
expect(splitLocale("/en/settings")).toEqual({ locale: "en", rest: "/settings" });
expect(splitLocale("/de")).toEqual({ locale: "de", rest: "" });
expect(splitLocale("/today")).toEqual({ locale: null, rest: "/today" });
expect(splitLocale("/english")).toEqual({ locale: null, rest: "/english" });
expect(splitLocale("/")).toEqual({ locale: null, rest: "" });
expect(switchLocalePath("/de/settings", "en")).toBe("/en/settings");
expect(switchLocalePath("/de", "en")).toBe("/en");
expect(switchLocalePath("/en/stats", "en")).toBe("/en/stats");
```

- [ ] **Step 2: `npx vitest run src/i18n` – FAIL (Module fehlen)**

- [ ] **Step 3: Implementieren.** `pickLocale`: gültiges Cookie gewinnt. Sonst `Accept-Language` an Kommas trennen, je Eintrag Sprache (vor `-`, klein) und `q` (fehlt: 1, ungültig: 0) lesen, stabil nach `q` absteigend sortieren, die erste Sprache aus `LOCALES` nehmen, sonst `DEFAULT_LOCALE`. `splitLocale` erkennt nur ein ganzes erstes Segment.

- [ ] **Step 4: `npx vitest run src/i18n` – PASS**

- [ ] **Step 5: Commit** `feat: locale detection and locale-aware paths`

---

### Task 2: Wörterbücher, Zugriff und Wächtertest

**Files:**
- Create: `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts`, `src/i18n/dictionaries/index.ts`, `src/i18n/server.ts`, `src/i18n/client.tsx`
- Test: `src/i18n/dictionaries/dictionaries.test.ts`, `src/i18n/no-hardcoded-text.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `de` als Objekt mit Namensräumen. Werte sind Strings oder Funktionen für Texte mit Werten (`(n: number) => string`). Zu Beginn nur `common: { appName: "Checkout-Trainer", titleSuffix: " · Checkout-Trainer", description }` und `language: { label: "Sprache" / "Language", names: { de: "Deutsch", en: "English" }, short: { de: "DE", en: "EN" } }`. Jede spätere Task ergänzt ihren Namensraum in beiden Dateien.
  - `type Dictionary` = `typeof de` mit Literal-Strings zu `string` geweitet (rekursiver Mapped Type). `en.ts`: `export const en: Dictionary = { … }`. Der Typ-Check meldet so fehlende und überzählige Einträge.
  - `DICTIONARIES: Record<Locale, Dictionary>`, `dictionaryFor(locale: Locale): Dictionary`
  - `server.ts` (ohne `server-only`, das Paket ist nicht installiert): `getLocale(): Promise<Locale>` über `lang` aus `next/root-params`, ruft `notFound()` bei ungültigem Wert. `getDictionary(): Promise<Dictionary>`. `requestLocale(): Promise<Locale | null>` liest `LOCALE_HEADER` aus `headers()`; funktioniert auch in Server Actions.
  - `client.tsx` (`"use client"`): `I18nProvider({ locale, children })`, `useLocale(): Locale`, `useDictionary(): Dictionary` (wählt aus `DICTIONARIES`, beide Wörterbücher liegen im Client-Bundle; nötig, weil Funktionswerte nicht vom Server serialisierbar sind), `useLocalePath(): (route: Route) => string`.

- [ ] **Step 1: Failing test für die Parität**

```ts
// dictionaries.test.ts
it("hat in beiden Sprachen dieselben Einträge", () => {
  expect(keyPaths(en)).toEqual(keyPaths(de));       // keyPaths: sortierte Liste aller Blatt-Pfade
});
it("hat keinen leeren Text", () => {
  for (const d of [de, en]) for (const v of leaves(d)) if (typeof v === "string") expect(v.trim()).not.toBe("");
});
it("Funktionen nehmen in beiden Sprachen gleich viele Werte", () => {
  for (const path of keyPaths(de)) if (typeof at(de, path) === "function") expect(at(en, path).length).toBe(at(de, path).length);
});
```

- [ ] **Step 2: Wächtertest schreiben** (`no-hardcoded-text.test.ts`, Aufbau wie `src/styles/no-arbitrary-classes.test.ts`):
  - Durchsucht `src/app`, `src/components` (ohne `src/components/ui`), `src/lib/validation`, `src/lib/auth/constants.ts`, `src/lib/darts/cards.ts`. Ohne `*.test.ts`.
  - Vorher Kommentare entfernen: `/* … */`, `{/* … */}` und `//` bis Zeilenende (nicht nach `:`, damit `https://` bleibt).
  - Fund A: JSX-Text, also `>` gefolgt von Text mit mindestens drei Buchstaben vor dem nächsten `<` oder `{`, außer reinem Leerraum.
  - Fund B: Attribute `aria-label`, `title`, `placeholder`, `alt`, `label` mit String-Literal.
  - Fund C: String-Literale mit `ä ö ü Ä Ö Ü ß`, außer direkt nach `new Error(`.
  - Erlaubt: `"Checkout-Trainer"`, Feldnamen (`/^(S|D|T)\d{1,2}$|^25$|^Bull$/`).
  - `const PENDING: string[]` listet alle Dateien, die beim Anlegen noch Funde haben (relativ zu `src`). Test 1: Dateien außerhalb von `PENDING` haben keine Funde. Test 2: Jede Datei in `PENDING` hat noch Funde (damit die Liste schrumpft und nicht veraltet). Selbsttests für A, B, C und das Entfernen von Kommentaren mit kleinen Beispielstrings.

- [ ] **Step 3: `npx vitest run src/i18n` – FAIL**

- [ ] **Step 4: Implementieren.** `PENDING` füllen, bis Test 1 und 2 grün sind; dabei prüfen, dass jede gelistete Datei wirklich sichtbaren Text enthält. Falschfunde in Code (etwa `a > b && c < d`) über eine kleine Ausnahmeliste je Muster lösen, nicht über `PENDING`.

- [ ] **Step 5: `npm test` – PASS**

- [ ] **Step 6: Commit** `feat: dictionaries and a guard against hardcoded text`

---

### Task 3: Entscheidung im Proxy

**Files:**
- Modify: `src/lib/auth/protected-routes.ts`
- Test: `src/lib/auth/protected-routes.test.ts`

**Interfaces:**
- Consumes: `pickLocale`, `splitLocale`, `localePath`, `ROUTES`, `LOCALE_COOKIE` (Task 1).
- Produces:
  - `PROTECTED_ROUTES = [ROUTES.today, ROUTES.study, ROUTES.stats, ROUTES.settings, ROUTES.admin, ROUTES.pending] as const`
  - `isProtectedPath(rest: string): boolean` (Pfad ohne Sprache, Logik wie bisher)
  - `proxyDecision(req: { method: string; pathname: string; hasSessionCookie: boolean; cookieLocale: string | null; acceptLanguage: string | null }): { type: "redirect"; location: string } | { type: "next"; locale: Locale | null }`
  - `PROXY_MATCHER = "/((?!api|_next|.*\\..*).*)"`
  - `needsLoginRedirect` entfällt.

- [ ] **Step 1: Failing tests** (alte Tests auf die neuen Pfade umschreiben, dazu):

```ts
const base = { method: "GET", hasSessionCookie: false, cookieLocale: null, acceptLanguage: null };
expect(proxyDecision({ ...base, pathname: "/" })).toEqual({ type: "redirect", location: "/en" });
expect(proxyDecision({ ...base, pathname: "/today", acceptLanguage: "de" })).toEqual({ type: "redirect", location: "/de/today" });
expect(proxyDecision({ ...base, pathname: "/today", cookieLocale: "en", acceptLanguage: "de" })).toEqual({ type: "redirect", location: "/en/today" });
expect(proxyDecision({ ...base, pathname: "/en/today" })).toEqual({ type: "redirect", location: "/en/sign-in" });
expect(proxyDecision({ ...base, pathname: "/de/today", hasSessionCookie: true })).toEqual({ type: "next", locale: "de" });
expect(proxyDecision({ ...base, pathname: "/en/sign-in" })).toEqual({ type: "next", locale: "en" });
expect(proxyDecision({ ...base, pathname: "/en/todayx" })).toEqual({ type: "next", locale: "en" });
expect(proxyDecision({ ...base, method: "POST", pathname: "/en/today" })).toEqual({ type: "next", locale: "en" });
expect(proxyDecision({ ...base, method: "POST", pathname: "/today" })).toEqual({ type: "next", locale: null });
expect(proxyDecision({ ...base, method: "HEAD", pathname: "/de/admin" })).toEqual({ type: "redirect", location: "/de/sign-in" });
expect(isProtectedPath("/today")).toBe(true);
expect(isProtectedPath("/today/x")).toBe(true);
expect(isProtectedPath("/sign-in")).toBe(false);
expect(isProtectedPath("/todayx")).toBe(false);
```

Der bisherige Test, der den Matcher mit den Bereichen vergleicht, wird zu: `proxyConfig.matcher` ist `[PROXY_MATCHER]`.

- [ ] **Step 2: `npx vitest run src/lib/auth/protected-routes.test.ts` – FAIL**

- [ ] **Step 3: Implementieren.** Nur GET und HEAD werden umgeleitet, andere Methoden laufen durch (Server Actions antworten selbst). Erst Sprache, dann Anmeldung: Ohne Sprache wird auf `/<pickLocale>` + Pfad umgeleitet (ohne die Anmeldung zu prüfen, das erledigt der nächste Aufruf).

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: proxy decides on language before the login check`

---

### Task 4: Seiten unter `[lang]`, Proxy und alle Links

Diese Task verschiebt Seiten und ändert alle Links in einem Schritt, sonst ist die App dazwischen kaputt. Die Texte bleiben hier noch deutsch.

**Files:**
- Move (mit `git mv`): `src/app/page.tsx` → `src/app/[lang]/page.tsx`; `anmelden` → `[lang]/sign-in`; `registrieren` → `[lang]/sign-up`; `warten` → `[lang]/pending`; `impressum` → `[lang]/imprint`; `datenschutz` → `[lang]/privacy`; `(app)` → `[lang]/(app)` mit `heute` → `today`, `lernen` → `study`, `statistik` → `stats`, `einstellungen` → `settings`, `verwaltung` → `admin`.
- Move: `src/app/layout.tsx` → `src/app/[lang]/layout.tsx`. `src/app/globals.css`, `global-error.tsx`, `favicon.ico`, `api/` bleiben, wo sie sind.
- Modify: `src/proxy.ts`, `src/lib/auth/guard.ts`, alle Dateien aus dem Abschnitt „Links und Umleitungen“ unten, alle Tests mit alten Pfaden (`app-nav.test.ts`, `loaders-guard.test.ts`, Actions-Tests).
- Test: `src/lib/auth/guard.test.ts`, `src/app/[lang]/(app)/today/actions.test.ts`

**Interfaces:**
- Consumes: Task 1 bis 3.
- Produces: `Root-Layout` mit `generateStaticParams() → [{ lang: "de" }, { lang: "en" }]`, `<html lang={await getLocale()}>` und `<I18nProvider locale=…>` um `children`. `localeRedirectPath(route: Route): Promise<string>` in `src/i18n/server.ts` für Umleitungen in Zugriffsprüfung und Server Actions: Mit `requestLocale()` gesetzt `localePath(locale, route)`, sonst nur `route` (bzw. `/` für die Startseite), die Sprache ergänzt dann `proxy.ts`.

- [ ] **Step 1: Failing tests**
  - `guard.test.ts`: Mit Header `x-locale: en` und ohne Sitzung wirft `requireActiveUser()` eine Umleitung nach `/en/sign-in`; wartendes Konto nach `/en/pending`; aktiver Nicht-Betreiber bei `requireAdmin()` nach `/en/today`. Ohne Header nach `/sign-in`. (`next/headers` wie in den vorhandenen Tests mocken.)
  - `today/actions.test.ts`: `learnMoreCards()` mit `x-locale: de` leitet nach `/de/study` um.
  - `app-nav.test.ts`: aktiver Eintrag für `/de/stats` ist `href="/de/stats"`; die Navigation fehlt auf `/en/study`.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Verschieben und verdrahten**
  - `src/proxy.ts`: `proxyDecision` aufrufen. Bei `redirect` 307 auf `location`. Bei `next` mit Sprache `NextResponse.next({ request: { headers } })` mit gesetztem `x-locale`. `config.matcher = [PROXY_MATCHER]` (konstantes Literal, wie bisher beim Build statisch gelesen).
  - **Links und Umleitungen**, je über `localePath`/`useLocalePath`/`localeRedirectPath`: `app-nav.tsx` (Einträge und Vergleich mit `usePathname()` ohne Sprache über `splitLocale`, auch die Lernseiten-Ausnahme), `[lang]/page.tsx`, `sign-in`, `sign-up`, `imprint`, `privacy`, `pending` (Umleitungen), `(app)/error.tsx`, `login-form.tsx`, `register-form.tsx`, `sign-out-button.tsx` (nach `/<lang>`), `delete-account.tsx`, `study-data.tsx`, `study-parts.tsx`, `study-session-host.tsx`, `study-session.tsx`, `today-data.tsx`, `guard.ts`, `today/actions.ts`.
  - `global-error.tsx` liegt außerhalb von `[lang]`: Link `href="/today"` ohne Sprache lassen, den Rest erledigt der Proxy.
  - `revalidatePath("/heute")` → `revalidatePath("/[lang]/(app)/today", "page")`, ebenso für `admin`.
  - `src/lib/auth/client.ts` und `api/auth` nicht ändern; Better Auth arbeitet ohne Seitenpfade.

- [ ] **Step 4: `npm test` und `npm run typecheck` – PASS**

- [ ] **Step 5: `npm run build` – erfolgreich, beide Sprachen in der Routenliste vorgerendert (Gerüst mit ◐ bzw. ○ wie bisher)**

- [ ] **Step 6: Nicht-gefunden prüfen.** `npm run start`, dann `curl -sI localhost:3000/en/xyz` und `curl -sI localhost:3000/fr`. Erwartet: 404 bzw. 307 auf `/en/fr` und dort 404. Liefert Next statt 404 einen Fehler, weil das Root-Layout ein dynamisches Segment hat: `experimental.globalNotFound` in `next.config.ts` einschalten und `src/app/global-not-found.tsx` mit `globals.css`, Archivo und einem zweisprachigen Satz anlegen (Doku: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`).

- [ ] **Step 7: Kurzer Klicktest im Browser** (Launch-Eintrag aus `.claude/launch.json`, Testkonto aus `.data/test-user.json`): `/` → `/de` (Browser deutsch), Anmelden, alle Tabs, Lernen, Abmelden.

- [ ] **Step 8: Commit** `feat: pages under /de and /en with English page names`

---

### Task 5: Anmeldung, Registrierung und Prüfmeldungen

**Files:**
- Modify: `src/lib/auth/constants.ts`, `src/lib/auth/index.ts`, `src/components/auth/auth-error.ts`, `src/lib/validation/schemas.ts`, `src/lib/validation/password-strength.ts`, `src/components/form/*`, `src/components/auth/*`, `src/app/[lang]/sign-in/page.tsx`, `sign-up/page.tsx`, `pending/page.tsx`, Wörterbücher
- Test: `auth-error.test.ts`, `schemas.test.ts`, `input-rules.test.ts`, `auth.test.ts`, `password-strength.test.ts`

**Interfaces:**
- Produces:
  - `AUTH_ERRORS` ersetzt `AUTH_MESSAGES`: gleiche Schlüssel, Wert ist jeweils der Schlüssel selbst (`operatorEmail: "operatorEmail"` …). Die Auth-Hooks werfen `APIError` mit `message: AUTH_ERRORS.x`. Typ `AuthErrorKey`.
  - Schemas tragen statt Text einen Schlüssel aus `type ValidationKey` (`"nameRequired" | "nameTooLong" | "nameInvalid" | "emailRequired" | "emailTooLong" | "emailInvalid" | "passwordRequired" | "currentPasswordRequired" | "passwordTooShort" | "passwordTooLong" | "newPerDayInvalid" | "invalid"`). `validateField` und `parseName` geben `ValidationKey` statt Text zurück.
  - Wörterbuch: `validation: Record<ValidationKey, string>` (Werte mit Grenzen über die Konstanten aus `constants.ts`), `auth: { errors: Record<AuthErrorKey, string>; byCode: {…}; tooManyAttempts; fallback; … }` und die Seitentexte `signIn`, `signUp`, `pending`.
  - `authErrorMessage(error: AuthError, t: Dictionary["auth"]): string`.

- [ ] **Step 1: Failing tests umschreiben:** Schlüssel statt Text (`expect(validateField(emailSchema, "")).toBe("emailRequired")`, `authErrorMessage({ status: 403, message: "blocked" }, en.auth)` ist der englische Text, `status: 429` ergibt `t.tooManyAttempts`, unbekannter Code `t.fallback`).
- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implementieren**, Formulare übersetzen die Schlüssel über `useDictionary()`. Seitentexte und `metadata` (als `generateMetadata` mit `getDictionary()`) der drei Seiten übersetzen. Die Dateien aus `PENDING` streichen.
- [ ] **Step 4: `npm test` – PASS** (Wächtertest eingeschlossen)
- [ ] **Step 5: Commit** `feat: sign-in, sign-up and validation messages in both languages`

---

### Task 6: Begründungen als Fälle

**Files:**
- Modify: `src/lib/darts/cards.ts`, `src/data/cards.generated.json` (nur über `npm run generate:cards`), `src/components/stats/rest-details.ts`, Typ `RestDetail` in `src/components/study/card-view.ts`, Wörterbücher
- Test: `src/lib/darts/cards.test.ts`, `src/i18n/dictionaries/dictionaries.test.ts`

**Interfaces:**
- Produces:

```ts
export type Reason =
  | { kind: 'only' }
  | { kind: 'direct' }
  | { kind: 'split'; a: number; b: number }
  | { kind: 'singleFinish'; field: number; bull: boolean }
  | { kind: 'halving'; double: string; times: 1 | 2 | 3 | 4 }
  | { kind: 'chart' }
```

  `RestCard.reason: Reason`. Wörterbuch: `study.reason(r: Reason): string` (im Namensraum `study`, weil `card-view.ts` in Task 7 nur `Dictionary["study"]` bekommt).

- [ ] **Step 1: Failing tests**
  - `cards.test.ts`: die bisherigen Erwartungen an Sätze auf `Reason` umstellen, `r-2` → `{ kind: 'only' }`, `r-4` → `{ kind: 'direct' }`, `r-48` → `{ kind: 'split', a: 16, b: 8 }`, `r-81` → `{ kind: 'singleFinish', field: 19, bull: false }`, `r-121` → `{ kind: 'singleFinish', field: 20, bull: true }`, `r-33` → `{ kind: 'halving', double: 'D16', times: 4 }`, `r-134` → `{ kind: 'chart' }`. Die IDs aller Karten sind gleich wie vor der Änderung (Liste aus der alten JSON-Datei im Test festhalten oder per `git show` vergleichen).
  - `dictionaries.test.ts`: `de.study.reason(...)` ergibt genau die bisherigen deutschen Sätze aus `reasonFor` (alle Fälle, z. B. „Endet auf D16, das sich viermal halbieren lässt.“). `en.study.reason`:

| Fall | Englisch |
|---|---|
| only | `The only route.` |
| direct | `Straight at the double.` |
| split | `Aim between ${a} and ${b}: either one leaves a double.` |
| singleFinish | `A single ${field} still leaves a finish.` |
| singleFinish, bull | `A single ${field} still leaves the bull.` |
| halving | `Ends on ${double}, which splits down ${once/twice/three times/four times}.` |
| chart | `The usual chart route.` |

- [ ] **Step 2: FAIL**
- [ ] **Step 3: `reasonFor` gibt `Reason` zurück; `npm run generate:cards`**
- [ ] **Step 4: `npm test` – PASS** (auch der Test, der Datei und Generator vergleicht)
- [ ] **Step 5: Commit** `feat: card reasons as structured cases`

---

### Task 7: Lernen

**Files:**
- Modify: `src/components/study/*` (darunter `card-view.ts`, `study-card.tsx`, `study-session.tsx`, `study-session-host.tsx`, `study-parts.tsx`, `study-skeleton.tsx`, `study-data.tsx`, `route-pad.tsx`, `study-question.tsx`, `verdict.tsx`), `src/components/dart-slots.tsx`, `src/app/[lang]/(app)/study/page.tsx`, Wörterbücher
- Test: `card-view.test.ts`, `verdict.test.ts`, vorhandene Study-Tests

**Interfaces:**
- Consumes: `Reason`, `study.reason` (Task 6).
- Produces: Die Abbildungen in `card-view.ts` (`cardView`, `restDetailView` und die Kurzformen aus `feat/weg-eingeben`) bekommen als letzten Parameter `t: Dictionary["study"]` und liefern fertige Texte. Aufrufer ist der Datenbaustein `study-data.tsx` (Server, `getDictionary()`) bzw. in Task 8 die Statistik. Client-Komponenten holen ihre Texte über `useDictionary()`.

- [ ] **Step 1: Failing tests:** `card-view.test.ts` je Fall einmal mit `de.study` (bisherige Erwartungen) und einmal mit `en.study` (z. B. Kurzform „Nur S20“ → „Only S20“, „Stellen: S20, Rest 32“ → „Set up: S20, 32 left“, „Mit 2 Darts“ → „With 2 darts“, „Kein Finish möglich. Stellen auf Rest 62.“ → „No checkout. Set up 62.“). `verdict.test.ts`: jede Stufe hat in beiden Sprachen einen Text.
- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implementieren**, auch `aria-label`s des Tastenfelds, Bewertungsleiste (Again/Hard/Good/Easy), Skeleton-Beschriftungen und `metadata` der Seite. Dateien aus `PENDING` streichen.
- [ ] **Step 4: `npm test` – PASS**
- [ ] **Step 5: Commit** `feat: study screen in both languages`

---

### Task 8: Übrige Seiten

**Files:**
- Modify: `src/components/app-nav.tsx`, `admin-nav-item.tsx`, `streak-chip.tsx`, `rest-grid.tsx`, `rest-sheet.tsx`, `loading-region.tsx`, `level-style.ts`, `today/*`, `stats/*`, `settings/*` (ohne Sprachschalter), `admin/*`, `theme/theme-switch.tsx`, `src/app/[lang]/page.tsx`, `imprint`, `privacy`, `(app)/*/page.tsx`, `(app)/error.tsx`, `src/app/global-error.tsx`, `src/app/[lang]/layout.tsx` (`metadata` als `generateMetadata`), Wörterbücher
- Test: vorhandene Tests der Bereiche, `skeletons.test.ts`

**Interfaces:**
- Consumes: `restDetailView(detail, t)` (Task 7), `INTL_LOCALE` (Task 1).

- [ ] **Step 1: Failing tests:** `admin-data`: Datum mit `INTL_LOCALE[locale]` (ein Test mit festem Datum in beiden Sprachen). `app-nav.test.ts`: Beschriftungen „Today“, „Stats“, „Settings“ mit `locale = "en"` (Provider im Test um die Komponente legen). `global-error.tsx` liegt außerhalb des Providers: Es nimmt die Sprache aus `localeFromLocation(): Locale` (neu in `src/i18n/client.tsx`, liest `window.location.pathname` über `splitLocale`, sonst `DEFAULT_LOCALE`). Test: `localeFromLocation` mit gemocktem `window.location` für `/de/today`, `/en` und `/`.
- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implementieren.** Jede Seite bekommt `generateMetadata` mit `${t.page.title}${t.common.titleSuffix}`. Impressum und Datenschutz: Der Platzhaltersatz „Dieser Text wird vom Betreiber ergänzt.“ wird übersetzt („The operator will add this text.“), weil er sonst als deutscher Rest im Englischen stünde. Dateien aus `PENDING` streichen.
- [ ] **Step 4: `npm test` – PASS**
- [ ] **Step 5: Commit** `feat: remaining pages in both languages`

---

### Task 9: Sprachschalter

**Files:**
- Create: `src/components/language/language-switch.tsx`, `src/components/public-footer.tsx`
- Modify: `src/app/[lang]/(app)/settings/page.tsx`, `src/app/[lang]/page.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx`, `pending/page.tsx`
- Test: `src/components/language/language-switch.test.ts`

**Interfaces:**
- Consumes: `useLocale`, `useDictionary`, `switchLocalePath`, `LOCALE_COOKIE`.
- Produces:
  - `LanguageSwitch({ variant: "settings" | "compact"; labelledBy?: string })`. `settings`: wie `ThemeSwitch` (`role="radiogroup"`, zwei echte Radio-Knöpfe, `grid-cols-2`, gleiche Klassen), Texte „Deutsch“, „English“. `compact`: kleine Pille mit „DE“ und „EN“, aktive Sprache `bg-accent text-accent-foreground`, sonst `text-muted-foreground`, Form `rounded-pill`, Radio-Knöpfe mit `aria-label` „Deutsch“ bzw. „English“.
  - Auswahl folgt `useLocale()` (Adresse), nie dem Cookie. Beim Wechsel: `document.cookie = "lang=<to>; path=/; max-age=31536000; samesite=lax"`, dann `router.push(switchLocalePath(pathname, to))`.
  - `PublicFooter()`: Links „Impressum“/„Imprint“ und „Datenschutz“/„Privacy“ links, `LanguageSwitch variant="compact"` rechts. Auf Startseite, Anmelden, Registrieren und Warteseite gleich (meine Entscheidung: die Rechtsseiten sind so von jeder öffentlichen Seite erreichbar).

- [ ] **Step 1: Failing tests:** Markup mit `locale = "de"`: das Radio „Deutsch“ ist `checked`, „English“ nicht; mit `"en"` umgekehrt; Texte der Sprachnamen gleich in beiden Sprachen; `compact` enthält „DE“ und „EN“. `switchLocalePath` ist in Task 1 getestet.
- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implementieren.** In den Einstellungen Abschnitt `t.language.label` mit `titleId="sprache"` direkt nach „Darstellung“. Die Seite bleibt Gerüst ohne Datenzugriff.
- [ ] **Step 4: `npm test` – PASS**
- [ ] **Step 5: Commit** `feat: language switch in settings and on public pages`

---

### Task 10: Abschluss

**Files:**
- Modify: `src/i18n/no-hardcoded-text.test.ts` (`PENDING` leer, Test 2 entfällt), `CLAUDE.md`

- [ ] **Step 1: `PENDING` ist leer; `npm test`, `npm run typecheck`, `npm run lint` – PASS**
- [ ] **Step 2: `CLAUDE.md` anpassen:** Routen im Abschnitt „Aufbau“ (`src/app/[lang]/`, englische Seitennamen), `src/i18n/` mit Wörterbüchern, Regel „Oberfläche vollständig auf Deutsch“ wird „Oberfläche vollständig auf Deutsch und Englisch, alle Texte in `src/i18n/dictionaries/`“, Cache-Components-Abschnitt: `proxy.ts` leitet zusätzlich auf die Sprache um (307) und setzt `x-locale`; aktiver Nicht-Betreiber geht von `/<lang>/admin` nach `/<lang>/today`.
- [ ] **Step 3: `npm run build` – erfolgreich**
- [ ] **Step 4: Prüfung im Browser** in beiden Sprachen mit dem Testkonto: jede Seite einmal, Lernsitzung mit Eingabe und Aufdecken, Statistik mit Rest-Detail, Verwaltung. Umschalter in den Einstellungen (bleibt auf `/…/settings`) und in der Fußzeile der Startseite. Erstaufruf von `/` ohne Cookie mit deutscher und mit französischer Browsersprache (Header per `curl -H "Accept-Language: …" -sI localhost:3000/`). Auf jeder Seite nach deutschen Resten im Englischen suchen (`get_page_text`).
- [ ] **Step 5: Commit** `docs: CLAUDE.md for the bilingual app`
