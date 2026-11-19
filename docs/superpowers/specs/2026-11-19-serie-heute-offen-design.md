# Schildchen „Serie heute noch offen“

## Ziel

Das Serien-Schildchen zeigt, ob die Serie heute schon verlängert wurde. Wer eine aktive Serie hat und heute noch nichts bewertet hat, sieht das Schildchen schwächer. Nach der ersten Bewertung des Tages wird es wieder kräftig gelb. Das ist eine stille Erinnerung, ohne zusätzlichen Text.

- Ziele: drei unterscheidbare Zustände des Schildchens, im hellen und dunklen Design gut lesbar.
- Keine Ziele: einen neuen Text oder Hinweis zeigen, Benachrichtigungen schicken, die Zählregel ändern.
- Fehlschlag, auch wenn es technisch läuft: „heute offen“ ist von „pausiert“ nicht zu unterscheiden, oder es ist im hellen Design schlecht lesbar.

## Zustände

| Zustand | Bedingung | Darstellung |
|---|---|---|
| heute verlängert | Serie ≥ 1, heute mindestens eine Bewertung | wie bisher: `bg-accent text-accent-foreground`, „5 Tage Serie“ |
| heute offen | Serie ≥ 1, heute keine Bewertung, nicht pausiert (gestern bewertet) | Hellgelb: `bg-streak-open text-streak-open-foreground`, „5 Tage Serie“ |
| pausiert | wie bisher | wie bisher: `bg-muted text-muted-foreground`, „5 Tage Serie · pausiert“ |

„Heute“ ist der Berliner Tag (`dayKey`), wie bei der Zählung. Ohne Serie (0 Tage) bleibt das Schildchen weg. Es gilt überall, wo das Schildchen steht („Heute“ und „Statistik“).

## Farbe

Neue Theme-Farben in `src/app/globals.css`, mit denselben Werten wie `verdict-soft`, aber eigenen Namen, damit Schildchen und Lernanzeige unabhängig bleiben:

- hell: `--streak-open: #fff6c2`, `--streak-open-foreground: #0b0b0c`
- dunkel: `--streak-open: #332b00`, `--streak-open-foreground: #ffd400`
- dazu `--color-streak-open` und `--color-streak-open-foreground` im `@theme`-Block

Im Dunkeln ist das gelbe Schrift auf dunklem Grund, was das Farbkonzept erlaubt. Kontrast laut bestehendem Kommentar zu `verdict-soft`: 18 : 1 hell, 9,9 : 1 dunkel.

## Ansätze

- **Gewählt:** `Streak` (`src/lib/stats.ts`) bekommt `today: boolean` (heute mindestens eine Bewertung). `StreakChip` wählt daraus die Darstellung. Die Daten liegen schon vor, es gibt keine Migration und keine neue Abfrage.
- Verworfen: im Schildchen selbst berechnen. Es bekommt nur die fertige Serie, die Lerndaten bleiben auf dem Server.
- Verworfen: `bg-verdict-soft` direkt verwenden. Damit hingen Schildchen und Lernanzeige aneinander, und der Name passt nicht.

## Dem Umsetzenden überlassen

- Wo `today` in `streakOf` gesetzt wird (es ist schon als `days.has(dayKey(now))` da).
- Tests: Zählung liefert `today` richtig (heute bewertet, nur gestern, pausiert, keine Serie); Schildchen zeigt je Zustand die richtige Klasse bzw. den richtigen Text. Die Farbe ist im Komponententest nur über die Klasse prüfbar; die Optik im Browser ansehen (hell und dunkel).
