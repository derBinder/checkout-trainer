# Weg selbst eingeben: Entwurf

Stand: 2026-11-12

## Worum es geht

Beim Lernen sieht man heute den Rest, denkt sich den Weg im Kopf, deckt mit „Weg zeigen“ auf und bewertet sich selbst (Nochmal / Schwer / Gut / Leicht). Ob man wirklich richtig lag, prüft niemand. Bei knappen Fällen (T20 statt T19 als erster Dart) redet man sich leicht ein „Gut“ ein.

Neu: Der Nutzer tippt seinen Weg Dart für Dart ein und lässt ihn prüfen. Die Auflösung zeigt dann, ob sein Weg der beste Weg ist, eine Alternative, ein gültiger, aber nicht empfohlener Weg, oder ob er gar nicht aufgeht. Darunter stehen wie bisher bester Weg und Erklärungen.

## Ziele

- Ehrliche Rückmeldung pro Karte: Der Nutzer sieht schwarz auf weiß, ob sein Weg stimmt.
- Eingabe am Smartphone mit möglichst einem Tipp pro Dart, ohne Bildschirmtastatur.
- Eingabe und Auflösung passen ohne Scrollen auf den Bildschirm (Maßstab: 375 × 667, iPhone SE). Nur auf noch kleineren Geräten darf gescrollt werden.

## Nicht-Ziele

- Die Bewertung (Nochmal bis Leicht) wird **nicht** aus dem Ergebnis abgeleitet. Der Nutzer legt sie weiter selbst fest (seine Entscheidung).
- Keine Speicherung der eingegebenen Wege oder Ergebnisse in der Datenbank, keine Statistik dazu. (Meine Entscheidung, siehe unten.)
- Keine Texteingabe über die Tastatur, keine Dartscheibe zum Antippen.

## Anti-Ziele

- Ein Lernbildschirm, auf dem man scrollen muss, um Tastenfeld, „Prüfen“ oder die Bewertungsleiste zu erreichen.
- Ein hartes „Falsch“ für einen Weg, der aufgeht, nur weil er nicht der Tabellenweg ist.

## Eingabe (vom Nutzer gewählt: Variante A, „Ring bleibt stehen“)

Aufbau des Fragebildschirms von oben nach unten:

1. Kopfzeile wie heute (Schließen, Zähler, Fortschritt).
2. „Rest“ und die Zahl. Die Zahl wird kleiner als heute (im Entwurf etwa 72 px statt bis zu 10rem), damit das Tastenfeld Platz hat.
3. Drei Dart-Felder wie heute (`DartSlots`). Eingegebene Darts füllen sie von links, das nächste offene Feld ist hervorgehoben.
4. Umschalter **S / D / T** als durchgehende Segmentleiste.
5. Tastenfeld: 1–20 in vier Reihen zu fünf, darunter **25**, **Bull** und **Löschen** (entfernt den letzten Dart).
6. Fußleiste: **„Nicht checkbar“** (zweitrangig) und **„Prüfen“** (Hauptschaltfläche) nebeneinander, darunter ein kleiner Link **„Ohne Eingabe aufdecken“**.

Verhalten:

- Ein Tipp auf eine Zahl setzt einen Dart mit dem gewählten Ring. Der Ring bleibt gewählt, bis man ihn wechselt. Meist also ein Tipp pro Dart, nur beim Ringwechsel zwei.
- 25 und Bull sind eigene Tasten und hängen nicht vom Ring ab (25 = Single Bull, Bull = Doppel).
- Ist T gewählt, bleiben 25 und Bull trotzdem tippbar (sie ignorieren den Ring).
- Automatischer Ringwechsel: Ist der verbleibende Rest nach den eingegebenen Darts mit einem Doppel direkt zu checken (gerade Zahl von 2 bis 40), springt der Ring auf D. Nicht bei 50: Bull hat eine eigene Taste, und auf 110 würde nach T20 sonst aus T10 ein D10. Der Nutzer kann jederzeit zurückschalten. Löschen stellt den Ring wieder her, der vor dem gelöschten Dart gewählt war. (Meine Präzisierung von „beim letzten Dart springt er auf D“, nach dem Code-Review angepasst.)
- Höchstens drei Darts. Nach dem dritten sind die Zahlentasten gesperrt, Löschen bleibt.
- „Prüfen“ ist aktiv, sobald mindestens ein Dart eingegeben ist. Ein Weg mit einem oder zwei Darts ist erlaubt (z. B. 100 = T20 · D20).
- „Nicht checkbar“ ist immer aktiv, auch mit eingegebenen Darts, und prüft sofort (die Darts werden verworfen). Die Taste steht auf Rest- und Bogey-Karten gleichermaßen, damit der Bildschirm nicht verrät, welche Art vorliegt. Auf Fehlwurf-Karten fehlt sie (siehe Kartenarten).
- „Ohne Eingabe aufdecken“ verhält sich wie heute „Weg zeigen“: Auflösung ohne Ergebniszeile und ohne „Dein Weg“.

Eingaben werden nicht gespeichert. Verlässt man die Karte, ist die Eingabe weg.

## Auflösung

Von oben nach unten:

1. Kopfzeile.
2. „Rest“ und die Zahl, kleiner als heute (im Entwurf etwa 56 px).
3. **Ergebniszeile** (siehe unten).
4. **„Dein Weg“**: die eingegebenen Darts als Pillen in neutraler Farbe, ohne Markierung einzelner Darts. (Meine Entscheidung: Ein Vergleich Dart für Dart wäre bei unterschiedlich langen Wegen und bei geteilten Zielen irreführend. Die Ergebniszeile und der beste Weg direkt darunter reichen.) Hat der Nutzer „Nicht checkbar“ gewählt, steht hier dieser Text statt Pillen.
5. **„Bester Weg“**: wie heute hervorgehoben.
6. Erklärungen in Kurzform, je eine Zeile (siehe „Kürzere Erklärungen“).
7. Bewertungsleiste wie heute.

### Ergebnisstufen

| Stufe | Bedingung | Darstellung |
|---|---|---|
| Bester Weg | Eingabe entspricht dem besten Weg der Karte | dunkel mit Gelb, „genau richtig“ |
| Alternative | Eingabe entspricht einer Alternative der Karte oder dem Weg „mit 2 Darts“ | hellgelb, „auch richtig“ |
| Geht, aber nicht empfohlen | Eingabe checkt den Rest regelgerecht (Summe stimmt, letzter Dart ist ein Doppel oder Bull), ist aber keiner der obigen | hellgelb, „Finish stimmt, Weg ist schlechter“ |
| Geht nicht auf | Summe stimmt nicht oder der letzte Dart ist kein Doppel | hellrot |
| Ist checkbar | „Nicht checkbar“ gewählt, der Rest ist aber checkbar | hellrot |

Bogey- und Fehlwurf-Karten haben eigene Stufen, siehe Kartenarten.

Vergleich der Wege:

- Ein Weg mit Ziel zwischen zwei Feldern (z. B. `16/8 · D16/D20`) zählt als getroffen, wenn die Eingabe einem der beiden ausgeschriebenen Wege entspricht (`expandSteps` in `src/lib/darts/model.ts`).
- Die Reihenfolge der Darts zählt. T11 · T20 · D14 ist nicht der beste Weg für 121, sondern fällt unter „Geht, aber nicht empfohlen“.
- Für die Reste 41 bis 170 gelten die Regeln der Referenztabelle, darunter das eigene Regelwerk. Die Prüfung nutzt nur die Wege, die die Karte schon trägt (`best`, `alternatives`, `twoDarts`), und rechnet nichts Neues aus.

### Kürzere Erklärungen

Damit alles ohne Scrollen passt, werden die Erklärungen auf der Lernkarte knapper:

- „Warum“ bleibt als Satz (er steht schon kurz in den Daten).
- „Nur Single 20 getroffen / Rest 101, 2 Darts: T17 · Bull“ wird zu **„Nur S20“ / „101: T17 · Bull“**.
- Stellwurf-Texte entsprechend knapp.

Eine Rest-Karte hat heute höchstens vier Erklärungen (Warum, Alternativen, Mit 2 Darts, Fälle „Nur S…“; gezählt über alle 160 Rest-Karten). Mit drei Erklärungen blieben im Entwurf auf 375 × 667 rund 65 px frei, eine vierte einzeilige passt also. Reicht der Platz auf kleineren Geräten nicht, scrollt nur der mittlere Bereich wie heute (`my-auto` im Inhaltsbereich), Kopf und Bewertungsleiste bleiben stehen. Erklärungen werden nicht weggelassen oder eingeklappt. (Meine Entscheidung.)

Ob die Kurzform auch in der Statistik (`restDetailView` wird dort mitgenutzt) gilt, entscheidet der Umsetzer. Die Statistik hat keine Platznot.

## Kartenarten

Die App kennt drei Kartenarten: Rest-Karten (`rest`), Fehlwurf-Karten (`miss`, „Ziel war T16, getroffen S16, neuer Rest?“) und Bogey-Karten (`bogey`, nicht checkbar).

- **Rest-Karten:** Eingabe und Stufen wie oben beschrieben.
- **Bogey-Karten** (vom Nutzer entschieden): gleicher Fragebildschirm wie Rest-Karten, mit Tastenfeld und „Nicht checkbar“. Stufen:
  - „Nicht checkbar“ gewählt: **„Richtig: nicht checkbar“** (dunkel mit Gelb).
  - Weg eingegeben: **„Geht nicht auf“** (hellrot), denn kein Weg checkt einen Bogey-Rest.
  - Die Auflösung zeigt danach wie bisher „Nicht checkbar“ und den Stellwurf. Der Stellwurf wird nicht abgefragt.
- **Fehlwurf-Karten** (vom Nutzer entschieden): Eingegeben wird nur der Folgeweg. Die schon geworfenen Darts stehen fest in den ersten Feldern (wie heute, der Fehlwurf rot), die Eingabe füllt die übrigen Felder, also höchstens so viele Darts, wie noch in der Hand sind (`dartsLeft`). Den neuen Rest rechnet der Nutzer im Kopf, er wird nicht eingegeben. Löschen entfernt nur eigene Darts. Keine Taste „Nicht checkbar“. Der automatische Wechsel auf D richtet sich nach dem neuen Rest abzüglich der eingegebenen Darts. Stufen:
  - Folgeweg ist ein Finish (`follow.kind = "finish"`): **Bester Weg** bei Gleichheit mit `follow.route`, sonst **Geht, aber nicht empfohlen**, wenn die Eingabe den neuen Rest regelgerecht checkt, sonst **Geht nicht auf**. Alternativen gibt es hier nicht.
  - Folgeweg ist ein Stellwurf (`follow.kind = "setup"`, kein Finish mehr möglich): **„Richtiger Stellwurf“** bei Gleichheit mit `follow.throws`, sonst **„Anderer Stellwurf“** (hellgelb). Ein „Geht nicht auf“ gibt es hier nicht, weil kein Finish erwartet wird.

## Technik und Rahmen

- Bestehender Lernbildschirm (`src/components/study/`) wird erweitert, keine neue Seite.
- Die Prüfung ist reine Logik ohne Datenbank und kommt nach `src/lib/darts/` mit eigenen Tests (Tests zuerst).
- Eingabe und Prüfung laufen vollständig im Browser. Die Kartendaten mit bestem Weg liegen dem Client in der Lernsitzung ohnehin schon vor.
- Zustand der Eingabe gehört zur Karte in der Sitzung und wird wie die Lernsitzung beim Verlassen verworfen.
- Regeln aus `CLAUDE.md` gelten: deutsche Oberfläche, keine freien Tailwind-Werte (fehlende Größen als Token in `@theme`), Icons nur aus `lucide-react` (Löschen-Taste).

## Dem Umsetzer überlassen

- Genaue Abstände, Größen der Zahl und Tasten im Rahmen von 375 × 667 ohne Scrollen.
- Tastatursteuerung am Desktop (wünschenswert, nicht verlangt).
- Barrierefreiheit: Ring-Umschalter als Radiogruppe, Ergebniszeile als Statusmeldung.
- Ob die Bewertungsleiste nach der Prüfung den Fokus bekommt.

## Meine Entscheidungen (bitte prüfen)

- Link „Ohne Eingabe aufdecken“ als Ausweg.
- Automatischer Wechsel auf D, sobald der Rest mit einem Doppel direkt checkbar ist.
- Weg „mit 2 Darts“ zählt als Alternative.
- Keine rote Markierung einzelner Darts in „Dein Weg“.
- Auf kleineren Geräten als 375 × 667 scrollt nur der mittlere Bereich; keine Erklärung wird weggelassen.
- Stufen für Fehlwurf-Karten mit Stellwurf: „Richtiger Stellwurf“ / „Anderer Stellwurf“.
- Reihenfolge der Darts zählt.
- Eingaben und Ergebnisse werden nicht gespeichert.
