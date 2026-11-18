# Serie mit einem Tag Pause – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein einzelner ausgelassener Tag (höchstens einmal pro 7 Tage) beendet die tägliche Serie nicht. Am Tag nach der Lücke zeigt die App die Serie als pausiert an.

**Architecture:** Die Serie wird weiter nur aus den Bewertungen berechnet (`streakOf` in `src/lib/stats.ts`). `summarize` liefert sie künftig als `{ days, paused }`. Das Schildchen zeigt die Pause gedämpft an, `TodayOverview` zeigt in der Pause einen Hinweis. Es gibt keine Migration.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-18-serien-pause-design.md](../specs/2026-11-18-serien-pause-design.md)

## Global Constraints

- Arbeit im Worktree `.claude/worktrees/serien-pause` auf Branch `feat/serien-pause`, angelegt aus `develop`. Den Entwurf (`docs/superpowers/specs/2026-11-18-serien-pause-design.md`, liegt bisher nur ungetrackt im Hauptverzeichnis) und diesen Plan als erstes in den Worktree kopieren und mit committen.
- Alle Texte in `src/i18n/dictionaries/de.ts` und `en.ts`, keine Emojis, keine Tailwind-Klassen mit eckigen Klammern.
- Tage sind Berliner Tage (`dayKey`, `dayStart` aus `src/lib/time.ts`).
- Mindestabstand zwischen zwei überbrückten Tagen: 7 Tage (Tag 3 und Tag 10 erlaubt, Tag 3 und Tag 9 nicht).
- Texte, wörtlich:
  - de Schildchen pausiert: `5 Tage Serie · pausiert` (Einzahl `1 Tag Serie · pausiert`)
  - en Schildchen pausiert: `5-day streak · paused`
  - de Hinweis: `Deine Serie ist pausiert. Lerne heute, damit sie weiterläuft. Einen ausgelassenen Tag pro Woche fängt die Serie ab.`
  - en Hinweis: `Your streak is paused. Study today to keep it going. The streak absorbs one missed day per week.`
- Vor jedem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`.

## Review Focus

1. Lernen nur jeden zweiten Tag: Die Serie darf nicht über mehr als eine Lücke pro 7 Tage halten. Test „alternating days“ in Task 1.
2. Bewertung heute nach einer Lücke gestern: Die Serie ist nicht mehr pausiert und zählt heute mit (5 + 1 = 6). Test in Task 1.
3. Lücke über die Zeitumstellung (Tag mit 23 oder 25 Stunden): Die Berliner Tageszählung muss stimmen. Test „bridges a gap across the DST change“ in Task 1.
4. Pausiert mit Serie 1 (nur vorgestern gelernt): Schildchen zeigt „1 Tag Serie · pausiert“. Test in Task 2.
5. Zwei Fehltage hintereinander: kein Schildchen, kein Hinweis. Tests in Task 1 und Task 2.

---

### Task 1: Zählregel mit Pause

**Files:**
- Modify: `src/lib/stats.ts` (Typ `Stats.streak`, `streakOf`)
- Modify: `src/components/today/today-data.tsx`, `src/components/stats/stats-data.tsx` (nur `streak` → `streak.days` an `StreakChip`, damit Typecheck grün bleibt)
- Test: `src/lib/stats.test.ts`

**Interfaces:**
- Produces: `export type Streak = { days: number; paused: boolean }`; `Stats.streak: Streak`. `paused` ist nur `true`, wenn heute und gestern keine Bewertung haben und gestern überbrückt wird; sonst `false`. Bei `days === 0` ist `paused` immer `false`.

- [ ] **Step 1: Bestehende Serien-Tests umstellen und neue schreiben** (in `src/lib/stats.test.ts`, Helfer `daysAgo`, `now = 2026-11-11T10:00:00Z` vorhanden; Hilfsfunktion `logsOn(...ns: number[])` anlegen, die je `n` eine Bewertung `r-2`/3 bei `daysAgo(n)` erzeugt)

Bestehende Erwartungen `streak` → `streak.days` bzw. `toEqual({ days, paused })`. Zwei bestehende Tests ändern ihre Bedeutung:
- „counts today and stops at a gap“ (Bewertungen an Tag 0, 0, 1, 3): Die Lücke an Tag 2 wird jetzt überbrückt. Die Bewertungen auf Tag 0, 0, 1, 4 ändern (zwei Fehltage), dann bleibt 2.
- „has no streak when the last rating was the day before yesterday“: Wird durch „pauses the streak …“ ersetzt.

Neue Fälle:

```ts
it("pauses the streak the day after a missed day", () => {
  expect(summarize({ states: [], logs: logsOn(2, 3, 4), now }).streak).toEqual({ days: 3, paused: true });
});
it("resumes the streak with a rating today, without counting the missed day", () => {
  expect(summarize({ states: [], logs: logsOn(0, 2, 3, 4, 5, 6), now }).streak).toEqual({ days: 6, paused: false });
});
it("ends the streak after two missed days in a row", () => {
  expect(summarize({ states: [], logs: logsOn(3, 4), now }).streak).toEqual({ days: 0, paused: false });
});
it("bridges two gaps exactly seven days apart", () => {
  // Lücken an Tag 2 und Tag 9.
  const logs = logsOn(0, 1, 3, 4, 5, 6, 7, 8, 10, 11);
  expect(summarize({ states: [], logs, now }).streak).toEqual({ days: 10, paused: false });
});
it("bridges only the newer of two gaps six days apart", () => {
  // Lücken an Tag 2 und Tag 8: Die Serie endet an Tag 8.
  const logs = logsOn(0, 1, 3, 4, 5, 6, 7, 9, 10);
  expect(summarize({ states: [], logs, now }).streak).toEqual({ days: 7, paused: false });
});
it("does not keep a streak when studying only every other day", () => {
  expect(summarize({ states: [], logs: logsOn(0, 2, 4, 6), now }).streak).toEqual({ days: 2, paused: false });
});
it("bridges a gap across the DST change", () => {
  // Berlin stellt am 25.10.2026 um. Gelernt 23. und 24.10. sowie 26.10., Lücke am 25.10.
  const at = (iso: string) => ({ cardId: "r-2", rating: 3, reviewedAt: new Date(iso) });
  const logs = [at("2026-10-23T10:00:00Z"), at("2026-10-24T10:00:00Z"), at("2026-10-26T10:00:00Z")];
  const s = summarize({ states: [], logs, now: new Date("2026-10-26T12:00:00Z") });
  expect(s.streak).toEqual({ days: 3, paused: false });
});
```

- [ ] **Step 2: Tests laufen lassen, sie schlagen fehl**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: FAIL (u. a. `streak` ist eine Zahl, Lücken werden nicht überbrückt)

- [ ] **Step 3: `streakOf(logs, now): Streak` umsetzen**

Rückwärts von heute. Ohne Bewertung heute beginnt die Zählung gestern (wie bisher). Ein fehlender Tag wird überbrückt, wenn der Tag davor eine Bewertung hat und die zuletzt überbrückte Lücke (später im Kalender) mindestens 7 Tage entfernt ist oder es noch keine gibt. Abstand in Tagen über Schritte zählen, nicht über Millisekunden (Zeitumstellung):

```ts
let day = days.has(dayKey(now)) ? now : previousDay(now);
let count = 0, sinceBridge = Infinity, paused = false, first = true;
while (true) {
  if (days.has(dayKey(day))) count++;
  else if (sinceBridge >= 7 && days.has(dayKey(previousDay(day)))) { sinceBridge = 0; paused = first; }
  else break;
  sinceBridge++; first = false;
  day = previousDay(day);
}
return { days: count, paused: paused && count > 0 };
```

Hinweis: `paused = first` stimmt nur, wenn heute keine Bewertung hat. Ist heute belegt, steht `day` beim ersten Schritt auf heute, und der Tag gilt als vorhanden, nicht als überbrückt. Doc-Kommentar an `Stats.streak` anpassen.

- [ ] **Step 4: Aufrufer anpassen**

`today-data.tsx` und `stats-data.tsx`: `<StreakChip streak={streak.days} />`. Das Pausenverhalten folgt in Task 2.

- [ ] **Step 5: Prüfen**

Run: `npm run test:coverage && npm run typecheck && npm run lint`
Expected: alles grün, Abdeckung ≥ 80 %

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers src/lib/stats.ts src/lib/stats.test.ts src/components/today/today-data.tsx src/components/stats/stats-data.tsx
git commit -m "feat: streak survives one missed day per week"
```

### Task 2: Pause anzeigen

**Files:**
- Modify: `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts`, `src/i18n/dictionaries/dictionaries.test.ts`
- Modify: `src/components/streak-chip.tsx`, `src/components/streak-chip.test.tsx`
- Modify: `src/components/today/today-data.tsx`, `src/components/today/today-data.test.tsx`
- Modify: `src/components/stats/stats-data.tsx`, `src/components/stats/stats-data.test.tsx`

**Interfaces:**
- Consumes: `Streak` und `Stats.streak` aus Task 1.
- Produces: Wörterbuch `streak.pausedLabel: (n: number) => string` und `today.streakPaused: string`; `StreakChip({ streak }: { streak: Streak })`.

- [ ] **Step 1: Failing Tests schreiben**

`dictionaries.test.ts`:
```ts
expect([de.streak.pausedLabel(1), de.streak.pausedLabel(5)]).toEqual(["1 Tag Serie · pausiert", "5 Tage Serie · pausiert"]);
expect(en.streak.pausedLabel(5)).toBe("5-day streak · paused");
```

`streak-chip.test.tsx`: Bestehende Tests auf `streak={{ days: n, paused: false }}` umstellen, neu:
- „zeigt die pausierte Serie“: `{ days: 1, paused: true }` → Text `1 Tag Serie · pausiert`; Englisch `{ days: 5, paused: true }` → `5-day streak · paused`.

`today-data.test.tsx` (feste Zeit wie im bestehenden `TodayStreak`-Test, `2026-11-12T11:00:00Z`, Bewertungen vor 2 und 3 Tagen):
- `TodayStreak` zeigt `2 Tage Serie · pausiert`.
- `TodayOverview` zeigt den deutschen Hinweis (wörtlich aus den Global Constraints).
- Mit Bewertungen heute und gestern zeigt `TodayOverview` den Hinweis nicht (`queryByText(...)` ist `null`).
- Mit Bewertungen nur vor 3 und 4 Tagen: kein Hinweis, `TodayStreak` leer.

`stats-data.test.tsx`: `StatsStreak` zeigt in derselben Lage `2 Tage Serie · pausiert`.

- [ ] **Step 2: Tests laufen lassen, sie schlagen fehl**

Run: `npx vitest run src/i18n src/components/streak-chip.test.tsx src/components/today src/components/stats`
Expected: FAIL

- [ ] **Step 3: Umsetzen**

- Wörterbücher: `streak.pausedLabel` baut auf `label` auf (`${label(n)} · pausiert` bzw. `· paused`), `today.streakPaused` mit dem Hinweistext.
- `StreakChip`: Nimmt `Streak`. `days < 1` → `null`. Bei `paused` gelten `bg-muted text-muted-foreground` und `pausedLabel`, sonst wie bisher.
- `today-data.tsx`: `TodayStreak` und `StatsStreak` geben `streak` ganz weiter. `loadToday` liefert `streak` bereits. `TodayOverview` liest `streak` mit und rendert bei `streak.paused` als erstes Kind von `TODAY_BODY` `<p className="text-sm text-muted-foreground">{t.today.streakPaused}</p>`. Kein eigener Suspense-Baustein, das Gerüst bleibt unverändert.

- [ ] **Step 4: Prüfen**

Run: `npm run test:coverage && npm run typecheck && npm run lint`
Expected: alles grün, `no-hardcoded-text.test.ts` grün

- [ ] **Step 5: Im Browser ansehen**

Dev-Server im Worktree starten (siehe CLAUDE.md, Testkonto), „Heute“ in normaler Lage öffnen und prüfen, dass kein Hinweis erscheint. Die Pausenlage ist über die Komponententests abgedeckt.

- [ ] **Step 6: Commit**

```bash
git add src/i18n src/components
git commit -m "feat: show paused streak and hint on today"
```

### Abschluss

Danach den Ablauf bis Produktion aus CLAUDE.md: `feat/serien-pause` mit `--no-ff` nach `develop` mergen, `develop` nach `main`, Prod-Deploy, Produktionsadresse prüfen. Es gibt keine Migration.
