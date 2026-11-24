# Serien-Schildchen mit Icon

Refs #68

## Ziel

Das Serien-Schildchen auf „Heute“ und „Statistik“ zeigt ein Icon und dahinter nur noch die Zahl der Tage. Es ist kürzer und am Smartphone auf einen Blick lesbar. Das Icon zeigt den Zustand, er hängt nicht mehr allein an der Farbe.

## Anzeige

| Zustand | Icon aus `lucide-react` | Text | Farbe |
|---|---|---|---|
| heute verlängert | `Flame`, gefüllt | 12 Tage | `bg-accent text-accent-foreground` |
| heute noch offen | `Flame`, nur Umriss | 12 Tage | `bg-streak-open text-streak-open-foreground` |
| pausiert | `Pause` | 12 Tage | `bg-muted text-muted-foreground` |

- Deutsch steht „1 Tag“ und „12 Tage“, englisch „1 day“ und „12 days“.
- Der Zusatz „· pausiert“ ist nicht mehr sichtbar.
- Die Farben und `data-state` bleiben unverändert.
- Ohne Serie (`days < 1`) zeigt das Schildchen weiterhin nichts.

## Nicht Teil der Änderung

- Die Berechnung der Serie in `src/lib/stats`
- Der Hinweistext `today.streakPaused` auf „Heute“
- Neue Farben oder Theme-Tokens

## Wege

Für das Icon der pausierten Serie gab es drei Wege:

1. **`Pause`**: passt zum Wort „pausiert“ im Hinweistext und erklärt sich selbst. Gewählt vom Auftraggeber.
2. **`Snowflake`**: bekannt aus anderen Lern-Apps. „Einfrieren“ kommt in der App aber sonst nicht vor.
3. **`Flame` in Grau**: am ruhigsten. Dann zeigt wieder nur die Farbe die Pause.

Verlängert und offen sind dieselbe Serie und bekommen deshalb dieselbe Flamme. Die Füllung unterscheidet sie.

## Umsetzung

Die Änderung liegt in `src/components/streak-chip.tsx` und den beiden Wörterbüchern.

- Das `<p>` wird zu `inline-flex items-center gap-1`.
- Es enthält drei Teile:
  - das Icon mit `aria-hidden` in `size-3.5`, bei „verlängert“ zusätzlich mit `fill-current`
  - den sichtbaren Text in einem `<span aria-hidden>`
  - den vollen Text für Screenreader in einem `<span className="sr-only">`
- Der sichtbare Text kommt aus dem neuen Schlüssel `streak.days(n)`.
- Der Text für Screenreader kommt aus den bestehenden Schlüsseln `streak.label` und `streak.pausedLabel`. Sie bleiben unverändert, also „Serie: 5 Tage · pausiert“ und „5-day streak · paused“.
- `streak.sample` wird zu „00 Tage“ und „00 days“.
- Das Skeleton bekommt denselben Aufbau mit einem unsichtbaren Platzhalter in Icon-Größe. So springt das Schildchen nicht, wenn die Daten kommen.
- Nur Standardklassen der Tailwind-Skala, keine freien Werte.

## Tests

Tests zuerst.

- `streak-chip.test.tsx`:
  - Sichtbar ist „1 Tag“, „12 Tage“, „1 day“ und „12 days“.
  - Der Screenreader-Text ist je Zustand der volle Text.
  - Je Zustand stimmt das Icon. Geprüft wird über `data-state` und die Füllung.
  - Die Farben stimmen weiterhin.
  - Das Skeleton zeigt „00 Tage“.
- `skeletons.test.tsx` erwartet englisch „00 days“.
- `dictionaries.test.ts` bekommt Fälle für `streak.days` in beiden Sprachen. Die bestehenden Fälle für `label` und `pausedLabel` bleiben.
- Im Browser bei Smartphone-Breite alle drei Zustände auf „Heute“ und „Statistik“ ansehen, hell und dunkel.

## Entscheidungen von Claude

Diese Punkte hat der Auftraggeber nicht ausdrücklich genannt:

- Die Einzahl „1 Tag“ und „1 day“
- Der Screenreader-Text nutzt die bestehenden Schlüssel, statt neue anzulegen.
- Die Icon-Größe `size-3.5` passend zu `text-xs`
