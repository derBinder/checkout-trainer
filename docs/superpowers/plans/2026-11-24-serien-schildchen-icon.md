# Serien-Schildchen mit Icon: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Stand nach dem Code-Review:** Das Review hat drei Punkte dieses Plans geändert. Aktuell ist der Entwurf.
> - Screenreader bekommen den ganzen Satz als `aria-label` am Schildchen mit `role="img"`. `streak.label` und `streak.pausedLabel` gibt es nicht mehr, dafür `streak.spokenPrefix` und `streak.spokenPaused`.
> - Die Tests prüfen Rolle, Beschriftung, Text und `data-state`. Klassen wie `sr-only`, `lucide-flame` und `fill-current` prüft kein Test.
> - Pausiert heißt für Screenreader „, pausiert“ statt „· pausiert“.

**Ziel:** Das Serien-Schildchen zeigt ein Icon je Zustand und dahinter nur die Zahl der Tage.

**Aufbau:** Die Änderung liegt in `StreakChip` und `StreakChipSkeleton` und in den beiden Wörterbüchern. Sichtbar ist der neue Text `streak.days(n)`. Screenreader bekommen weiter `streak.label` und `streak.pausedLabel`.

**Technik:** React, Tailwind, `lucide-react` (`Flame`, `Pause`), Vitest mit Testing Library

**Entwurf:** [docs/superpowers/specs/2026-11-24-serien-schildchen-icon-design.md](../specs/2026-11-24-serien-schildchen-icon-design.md)

## Rahmen

- Arbeitsverzeichnis ist der Worktree `.claude/worktrees/68-streak-badge-icon` auf `feature/68-streak-badge-icon`. Vor dem ersten Testlauf dort `npm ci` ausführen.
- Alle Texte der Oberfläche stehen in `src/i18n/dictionaries/`. `de.ts` ist die Quelle des Typs `Dictionary`.
- Nur Standardklassen der Tailwind-Skala, keine Werte in eckigen Klammern.
- Icons nur aus `lucide-react`, keine Emojis.
- Vor jedem Commit `npm run test:coverage`, `npm run typecheck` und `npm run lint`.
- Commit-Nachrichten englisch, mit `Refs #68`, ohne Attributionszeilen.

## Worauf das Review achtet

1. **Dreistellige Serie** (`days: 365`): Das Schildchen bleibt einzeilig neben der Überschrift, auch bei 375 px Breite. Test in Aufgabe 1, Blick im Browser in Aufgabe 2.
2. **Doppeltes Vorlesen:** Der sichtbare Text und das Icon tragen `aria-hidden`. Ein Screenreader liest nur den vollen Text. Test in Aufgabe 1.
3. **Springen beim Laden:** Skeleton und Schildchen sind gleich hoch und etwa gleich breit. Blick im Browser in Aufgabe 2.
4. **Dunkles Design:** Die gefüllte Flamme ist auf `bg-accent` erkennbar, der Umriss auf `bg-streak-open`. Blick im Browser in Aufgabe 2.
5. **Englische Einzahl:** „1 day“, nicht „1 days“. Test in Aufgabe 1.

---

### Task 1: Schildchen, Skeleton und Texte

**Dateien:**
- Ändern: `src/i18n/dictionaries/de.ts`, `src/i18n/dictionaries/en.ts`
- Ändern: `src/components/streak-chip.tsx`
- Tests: `src/i18n/dictionaries/dictionaries.test.ts`, `src/components/streak-chip.test.tsx`, `src/components/skeletons.test.tsx`

**Schnittstellen:**
- Neu: `streak.days: (n: number) => string` in beiden Wörterbüchern
- Unverändert: `streak.label`, `streak.pausedLabel`, die Props von `StreakChip` und `StreakChipSkeleton`, `data-state` am `<p>`

- [ ] **Schritt 1: Tests für die Texte schreiben**

In `dictionaries.test.ts` neben den bestehenden Fällen für `streak.label`:

```ts
expect([de.streak.days(1), de.streak.days(12)]).toEqual(["1 Tag", "12 Tage"]);
expect([en.streak.days(1), en.streak.days(12)]).toEqual(["1 day", "12 days"]);
expect([de.streak.sample, en.streak.sample]).toEqual(["00 Tage", "00 days"]);
```

In `skeletons.test.tsx` Zeile 169 die Erwartung auf `"00 days"` ändern.

- [ ] **Schritt 2: Tests für das Schildchen umschreiben**

`streak-chip.test.tsx` anpassen. Die Fälle bleiben, die Erwartungen ändern sich:

| Fall | Erwartung |
|---|---|
| `days: 0` | nichts gerendert, wie bisher |
| `days: 1`, deutsch | sichtbar `"1 Tag"`, Screenreader `"Serie: 1 Tag"` |
| `days: 12`, deutsch | sichtbar `"12 Tage"`, Screenreader `"Serie: 12 Tage"` |
| `days: 365`, deutsch | sichtbar `"365 Tage"` |
| `days: 1` und `12`, englisch | sichtbar `"1 day"` und `"12 days"`, Screenreader `"1-day streak"` und `"12-day streak"` |
| pausiert, `days: 5` | sichtbar `"5 Tage"`, Screenreader `"Serie: 5 Tage · pausiert"`, englisch `"5-day streak · paused"`. Der Text `"· pausiert"` ist nicht sichtbar. |
| Skeleton | `aria-busy="true"`, `textContent` ist `"00 Tage"` |

Für jeden der drei Zustände mit `days: 5`:

```tsx
const chip = screen.getByText("5 Tage").closest("p")!;
expect(chip.getAttribute("data-state")).toBe(state);          // "extended" | "open" | "paused"
for (const color of colors.split(" ")) expect(chip.classList).toContain(color);
const icon = chip.querySelector("svg")!;
expect(icon.getAttribute("aria-hidden")).toBe("true");
expect(icon.classList.contains(iconClass)).toBe(true);        // "lucide-flame" | "lucide-flame" | "lucide-pause"
expect(icon.classList.contains("fill-current")).toBe(state === "extended");
expect(screen.getByText("5 Tage").getAttribute("aria-hidden")).toBe("true");
expect(screen.getByText(srText).classList).toContain("sr-only");
```

Die Farben je Zustand stehen im bestehenden Test und bleiben gleich. Die Klassennamen `lucide-flame` und `lucide-pause` beim ersten Lauf am gerenderten `svg` prüfen und bei Abweichung im Test anpassen.

- [ ] **Schritt 3: Tests laufen lassen und Fehlschlag prüfen**

Ausführen: `npx vitest run src/components/streak-chip.test.tsx src/components/skeletons.test.tsx src/i18n/dictionaries/dictionaries.test.ts`
Erwartet: Fehlschläge wegen `streak.days is not a function` und wegen der alten Texte.

- [ ] **Schritt 4: Wörterbücher ergänzen**

- `de.ts`: `days: (n: number) => (n === 1 ? "1 Tag" : \`${n} Tage\`)`, `sample: "00 Tage"`
- `en.ts`: `days: (n: number) => (n === 1 ? "1 day" : \`${n} days\`)`, `sample: "00 days"`

`streakLabel` und `pausedLabel` bleiben unverändert.

- [ ] **Schritt 5: `StreakChip` und `StreakChipSkeleton` umbauen**

In `src/components/streak-chip.tsx`:

- `CHIP_BOX` bekommt `inline-flex items-center gap-1`.
- Neue Konstante `ICON_BOX = "size-3.5 shrink-0"`.
- Das `<p>` enthält in dieser Reihenfolge:
  - das Icon mit `aria-hidden` und `ICON_BOX`: `Pause` bei `paused`, sonst `Flame`, bei `extended` zusätzlich `fill-current`
  - `<span aria-hidden>{t.days(streak.days)}</span>`
  - `<span className="sr-only">` mit `t.pausedLabel(streak.days)` oder `t.label(streak.days)`
- Das Skeleton enthält ein leeres `<span className={ICON_BOX} />` und dahinter `t.sample`.
- Die Kommentare an `CHIP_COLORS` und am Skeleton an den neuen Stand anpassen („00 Tage“).

- [ ] **Schritt 6: Tests laufen lassen**

Ausführen: derselbe Befehl wie in Schritt 3
Erwartet: alle grün

- [ ] **Schritt 7: Prüfungen und Commit**

```bash
npm run test:coverage && npm run typecheck && npm run lint
git add docs/superpowers src/components src/i18n
git commit -m "feat: show the streak badge as an icon plus day count" -m "Refs #68"
```

Entwurf und Plan kommen mit in diesen Commit.

### Task 2: Prüfung im Browser und PR

**Dateien:** keine bleibenden Änderungen

- [ ] **Schritt 1: Dev-Server aus dem Worktree starten**

- Einen laufenden Dev-Server des Hauptverzeichnisses anhalten. PGlite erlaubt nur einen Prozess.
- `.data` aus dem Hauptverzeichnis in den Worktree kopieren. Der Ordner ist gitignored und enthält die Datenbank und `test-user.json`.
- Im Worktree `.claude/launch.json` nicht ändern. Den Server über einen Launch-Eintrag starten, der in den Worktree wechselt. Diese Änderung an `launch.json` im Hauptverzeichnis nach der Prüfung zurücknehmen.
- Mit dem Testkonto aus `.data/test-user.json` anmelden.

- [ ] **Schritt 2: Die drei Zustände ansehen**

Das Testkonto zeigt nur den Zustand, den seine Daten ergeben. Für die Sichtprüfung in `TodayStreak` in `src/components/today/today-data.tsx` vorübergehend einen festen Wert übergeben, nacheinander:

- `{ days: 12, paused: false, today: true }`
- `{ days: 12, paused: false, today: false }`
- `{ days: 365, paused: true, today: false }`

Je Wert bei 375 px Breite prüfen, hell und dunkel:

- Icon und Text stehen auf einer Linie, das Schildchen ist einzeilig.
- Gefüllte Flamme, Umriss und Pause-Icon sind klar zu unterscheiden.
- Beim Neuladen springt das Schildchen gegenüber dem Skeleton nicht in der Höhe.

Von jedem Zustand einen Screenshot machen. Danach `git checkout src/components/today/today-data.tsx` und mit `git status` prüfen, dass der Worktree sauber ist.

- [ ] **Schritt 3: „Statistik“ mit echten Daten ansehen**

`/de/stats` und `/en/stats` öffnen. Das Schildchen zeigt den echten Zustand des Testkontos im neuen Aufbau, englisch mit „days“.

- [ ] **Schritt 4: Push und PR nach `develop`**

```bash
git push -u origin feature/68-streak-badge-icon
```

PR mit dem Titel der Commit-Nachricht. Der Text nennt die Änderung, die Prüfungen, „keine Migration“ und `Refs #68`. Danach Code-Review mit `high origin/develop...HEAD`, CI und Merge nach dem Abschnitt „Feature“ in `CLAUDE.md`, anschließend der Release.
