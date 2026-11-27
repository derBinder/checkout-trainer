# Begründung beim Stellwurf

Refs #87

## Ziel

Weicht der eingegebene Stellwurf vom empfohlenen ab, zeigt die Auflösung beide Würfe mit ihrem Rest und dem Doppel und nennt den Grund, warum der empfohlene besser ist.

Der Grund: Heute steht dort nur „Anderer Stellwurf – Empfohlener Stellwurf unten“. Der Nutzer sieht, dass es einen besseren Wurf gibt, lernt aber nicht, warum.

- Ziele: Vergleich und Grund auf allen Karten mit Stellwurf, also Reste über 170, Fehlwurf-Karten ohne Finish und Zwei-Dart-Karten ohne Finish. Lernsitzung und Übung „Wege“ nutzen dieselbe Auflösung.
- Keine Ziele: der Grund bei „Geht, aber nicht empfohlen“ auf Wege-Karten. Eine Änderung der Rangfolge selbst. Eine Änderung an den Karten in `cards.generated.json`.
- Fehlschlag, auch wenn es technisch läuft: Ein Grund widerspricht der Empfehlung oder ist falsch. Oder die Auflösung passt am Smartphone nicht mehr ohne Scrollen.

## Wege

- **Grund aus der Rangfolge ableiten.** Gewählt vom Auftraggeber. Die Bewertung vergleicht den eingegebenen mit dem empfohlenen Wurf nach der Regel, die den empfohlenen ausgewählt hat. Das erste Kriterium mit Unterschied ist der Grund. Rangfolge und Gründe können nicht auseinanderlaufen.
- **Fester Text je Karte aus dem Generator.** Verworfen. Er erklärt nur den empfohlenen Wurf und sagt nichts zum eingegebenen.
- **Regeln einmal allgemein erklären.** Verworfen. Der Nutzer müsste die Regel bei jeder Karte selbst anwenden.

## Anzeige

Vom Auftraggeber entschieden: Vergleich plus Grund, nicht nur eine Zeile.

Festlegung von Claude: Es gibt keine neue Tabelle. Über den beiden vorhandenen Reihen steht rechts neben der Beschriftung der Rest, sodass die beiden Reste untereinander stehen, der Grund kommt als Notiz „Warum“ dazu. Die Notiz „Stellwurf: Danach Rest 32“ entfällt in diesem Fall, weil der Rest schon in der Beschriftung steht.

```
Anderer Stellwurf

DEIN WEG                 Rest 40 (D20)
[T20] [T19] [S14]

STELLWURF                Rest 32 (D16)
[T20] [T20] [S19]

WARUM   D16 lässt sich öfter halbieren als D20
```

- Das Doppel in Klammern steht nur bei einem Rest für einen Dart, bei 50 steht „Bull“.
- Bei „Überworfen“ und „Lässt eine Bogey-Zahl“ bleibt alles wie heute. Die Ergebniszeile nennt den Grund schon.
- Bei „Richtiger Stellwurf“ bleibt alles wie heute.

## Gründe

Eine Zählung über alle 165 Stellwurf-Aufgaben und alle eingebbaren Würfe zeigt, welche Kriterien tatsächlich entscheiden. Nur dafür gibt es Texte. Die Texte sind Festlegungen von Claude und stehen in `de.ts` und `en.ts`.

| Entscheidend | Beispiel | Text |
|---|---|---|
| Empfohlener Rest braucht weniger Darts | 98 statt 32 | „98 braucht noch zwei Darts, 32 nur einen“ |
| Eingegebener Rest ist mit zwei Darts nicht zu checken | 99 statt 32 | „99 ist mit zwei Darts nicht zu checken“ |
| Empfohlen ist ein bevorzugtes Doppel, eingegeben nicht | 50 statt 32 | „D16 ist ein bevorzugtes Doppel, Bull nicht“ |
| Beide bevorzugt, das empfohlene Doppel lässt sich öfter halbieren | 40 statt 32 | „D16 lässt sich öfter halbieren als D20“ |
| Beide bevorzugt, das Halbieren erklärt es nicht | 16 statt 40 | „D20 geht vor D8“ |
| Doppel vor Bull | 50 statt 38 | „Ein Doppel ist besser als das Bull“ |
| Beide brauchen zwei Darts | 110 statt 39 | „Beide brauchen zwei Darts, 39 ist der niedrigere Rest“ |
| Gleicher Rest, mehr Triples | T5 T20 statt T20 S15 | „Gleicher Rest, aber mehr Triples nötig“ |
| Gleicher Rest, weniger Darts auf der 20 | S10 T19 statt T20 S7 | „Gleicher Rest, aber weniger Darts auf die 20“ |

Das Kriterium „weniger Würfe“ entscheidet in der Zählung nie und bekommt keinen Text.

### Sonderfälle

Festlegungen von Claude, bitte prüfen:

- **Gleiche Darts in anderer Reihenfolge.** 148 Fälle, etwa S7 T20 statt T20 S7. Sie gelten künftig als „Richtiger Stellwurf“. Das Ergebnis fließt nicht in die Bewertung der Karte ein, die gibt der Nutzer selbst.
- **Stellwurf über Doppel oder Bull.** Die Empfehlung kennt nur Single und Triple. Mit Doppel oder Bull kann die Eingabe nach der Rangfolge gleich gut oder besser sein als die Empfehlung, in 1461 Fällen, etwa D11 T20 mit Rest 32 statt T20 S14 mit Rest 40. Dann lautet der Grund: „Stellwürfe gehen über Single und Triple, nicht über Doppel oder Bull“. Das gilt auch, wenn sich ein solcher Wurf sonst nur in den Feldern unterscheidet. Eine einzelne 25 zählt wie das Bull. Ist die Eingabe trotz Doppel oder Bull schlechter, gilt der normale Grund aus der Tabelle.
- **Gleichwertig bis auf die Felder.** 56 Fälle, etwa S20 T17 statt T20 S11, beide mit Rest 32 und einem Triple. Hier entscheidet nur „höhere Felder zuerst“. Das ist kein Grund, den ein Spieler annimmt. Der Titel bleibt „Anderer Stellwurf“, der Text lautet: „Beide Stellwürfe sind gleich gut“.

## Technik

- `src/lib/darts/scoring.ts` bekommt einen Vergleich zweier Stellwürfe, der neben der Reihenfolge das entscheidende Kriterium liefert. `bestSetup` sortiert mit genau diesem Vergleich. `judge.ts` baut die Rangfolge nicht nach.
- `judgeSetup` in `src/lib/darts/judge.ts` vergleicht ohne Reihenfolge und gibt bei `setupOther` ein `detail` mit beiden Resten und dem Grund als Daten zurück, wie die vorhandenen `VerdictDetail`-Arten. Den Text liefert das Wörterbuch.
- `card-view.ts` und `study-card.tsx` setzen den Rest in die Beschriftung der beiden Reihen und die Notiz „Warum“.
- Keine Migration, keine Änderung an `cards.generated.json`.

## Tests

- Ein Test zählt wie oben alle Stellwurf-Aufgaben und alle Eingaben durch. Jedes `setupOther` hat einen Grund. Kein Grund behauptet, die Eingabe sei schlechter, wenn die Rangfolge sie gleich oder besser einordnet.
- Je Zeile der Tabelle und je Sonderfall ein Test in `judge.test.ts` mit dem Beispiel von oben.
- Komponententest der Auflösung: beide Beschriftungen mit Rest und die Notiz „Warum“ sind sichtbar, bei „Überworfen“ und „Bogey-Zahl“ nicht.

## Offen für den Bau

- Die genaue Form des `detail` und der Name des Vergleichs.
