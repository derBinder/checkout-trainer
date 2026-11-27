# Begründung bei „Geht, aber nicht empfohlen“

Refs #89

## Ziel

Geht ein eingegebener Weg auf, ist aber weder der beste Weg noch eine Alternative, nennt die Ergebniszeile den Grund. Heute steht dort nur „Der Checkout stimmt, der Weg ist schlechter“.

- Ziele: der Grund auf Rest-Karten, Fehlwurf-Karten mit Finish und Zwei-Dart-Karten mit Weg, in Lernsitzung und Übung.
- Keine Ziele: eine Änderung der Rangfolge, der Referenztabelle oder der Karten. Die Reihenfolge der Darts zählt bei Wegen weiter, wie in `2026-11-12-weg-eingeben-design.md` festgelegt.
- Fehlschlag, auch wenn es technisch läuft: Ein Grund nennt den eingegebenen Weg schlechter, obwohl die Rangfolge der App ihn gleich oder besser einordnet.

Der Auftraggeber hat die Funktion bestellt und die Entscheidungen Claude überlassen. Alles Folgende sind Festlegungen von Claude.

## Wege

- **Grund aus der Rangfolge ableiten.** Gewählt, wie bei den Stellwürfen (#87). `compareRoutes` vergleicht den eingegebenen Weg mit dem besten Weg der Karte, das erste Kriterium mit Unterschied ist der Grund.
- **Fester Text je Karte.** Verworfen, er sagt nichts zum eingegebenen Weg.
- **Eigene Begründungen aus der Referenztabelle.** Verworfen. Die Tabelle nennt Wege, keine Gründe. Ein Grund dazu wäre erfunden.

## Anzeige

Der Grund steht in der Ergebniszeile an der Stelle des bisherigen Hinweises. Dort stehen schon die Gründe für „Geht nicht auf“. Eine weitere Notiz „Warum“ gibt es nicht, weil Rest-Karten unter dem besten Weg schon eine Notiz „Warum“ für den besten Weg tragen.

```
Geht, aber nicht empfohlen        Geht auch mit 2 Darts
```

## Gründe

Verglichen wird mit dem ersten besten Weg der Karte. Eine Zählung über alle 338 Karten mit Weg und alle 83.082 gültigen Wege, die weder bester Weg noch Alternative sind:

| Entscheidend | Anteil | Text |
|---|---|---|
| Der beste Weg braucht weniger Darts | 73.294 | „Geht auch mit 2 Darts“ |
| Das Doppel des besten Wegs lässt sich öfter halbieren | 7.144 | „D16 lässt sich öfter halbieren als D20“ |
| Gleich viele Halbierungen, höheres Doppel | 215 | „D20 geht vor D12“ |
| Ein Triple, nach dessen Single kein Finish bleibt | 324 | „Single statt Triple lässt kein Finish“ |
| Mehr Triples | 20 | „Braucht mehr Triples“ |
| Gleiche Darts, nur die Reihenfolge der Felder | selten | „Gleiche Darts, das höhere Feld zuerst“ |
| Die Rangfolge sieht keinen Nachteil | rund 2.000 | „Der Checkout stimmt, empfohlen ist ein anderer Weg“ |

Die letzte Zeile betrifft nur Reste von 41 bis 170. Dort kommt der beste Weg aus der Referenztabelle, und die Rangfolge der App ordnet manche Eingaben gleich oder besser ein, etwa S16 D20 statt T16 D4 bei Rest 56. Die App kennt den Grund der Tabelle nicht und behauptet deshalb keinen. Der Text sagt nur, dass ein anderer Weg empfohlen ist, und nennt den eingegebenen nicht mehr „schlechter“. Bis Rest 40 kommt dieser Fall nicht vor.

## Technik

- `scoring.ts`: eine geordnete Liste der Kriterien. `compareRoutes` und die Sortierung in `rankCheckouts` laufen darüber, ein neuer Vergleich liefert das entscheidende Kriterium dazu. Ohne Zwischenlisten je Vergleich, die Sortierung läuft über tausende Wege.
- `judge.ts`: `notRecommended` trägt ein `detail` mit dem Grund, der Dartzahl des besten Wegs und beiden Doppeln.
- Wörterbücher: Texte in Deutsch und Englisch. Der feste Hinweis bei `notRecommended` entfällt.
- Keine Änderung an der Oberfläche außer dem Text, keine Migration.

## Tests

- Je Grund ein Beispiel in `judge.test.ts`.
- Eine Durchzählung über alle Karten mit Weg: Jedes „Geht, aber nicht empfohlen“ hat einen Grund, und kein Grund widerspricht der Rangfolge. Bis Rest 40 kommt der Grund ohne Nachteil nicht vor.
- Die Texte beider Sprachen sind vollständig und verschieden.
