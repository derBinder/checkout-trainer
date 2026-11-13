# Paket 2: Seite „Üben“

Stand: 2026-11-13

## Worum es geht

Der Trainer lernt Checkout-Wege über einen Lernplan (FSRS) mit festen Tagesportionen. Zwei Dinge fehlen bisher:

1. **Gezielt frei üben**, unabhängig vom Lernplan: etwa vor einem Ligaspiel die Reste 101 bis 140 durchgehen oder nur Stellwürfe üben. Der Auftraggeber fragte ausdrücklich danach, Stellwürfe gesondert üben zu können; Entscheidung war, das als Filter nach Kartenart auf dieser Seite zu lösen statt mit einer eigenen Funktion.
2. **Rechnen kurz vor dem Checkout.** Der Auftraggeber: Es reichen kurze Rechnungen kurz vor dem Checkout, vor allem soll man sich nicht auf eine Bogey-Zahl stellen. Der Grundentwurf nennt schon, dass ihm das Umrechnen am Board schwerfällt.

Paket 2 ist das zweite von drei Erweiterungspaketen. Es baut auf Paket 1 auf ([Entwurf Paket 1](2026-11-13-paket-1-zwei-darts-zerlegung-design.md): Zwei-Dart-Karten mit Wegen und Stellwürfen, Zerlegung). Paket 3 bringt Zusatzkarten mit Schaltern (Single statt Doppel, Nachbarfelder, Stellwürfe über 170). Umgesetzt wird Paket 2 erst, wenn Paket 1 in Produktion ist.

## Ziele

- Eine Seite „Üben“ mit zwei Übungen: „Wege“ (Karten nach Bereich und Kartenart, ohne Lernplan) und „Rechnen“ (neuen Rest nach einer Aufnahme ausrechnen und Bogey-Zahlen erkennen).
- Üben ist folgenlos: kein Einfluss auf Lernplan, Statistik, Lernserie.
- Der Lernbildschirm wird für „Wege“ wiederverwendet, damit Eingabe, Prüfung und Darstellung überall gleich sind.

## Nicht-Ziele

- Keine Speicherung von Übungsergebnissen, keine Übungsstatistik.
- Kein vierter Tab in der Navigation.
- Keine frei eintippbaren Bereichsgrenzen (feste Bereiche als Chips).
- Keine Rechenaufgaben über lange Aufnahmen von 501 abwärts (vom Auftraggeber: kurze Rechnungen kurz vor dem Checkout reichen).
- Keine Übung „wohin mit dem letzten Dart, um keine Bogey-Zahl zu lassen“. Das gehört zu den Stellwürfen über 170 in Paket 3; dort gilt ein Stellwurf, der eine Bogey-Zahl lässt, nie als richtig.

## Anti-Ziele

- Eine Übungsseite, die sich anders bedient als der Lernbildschirm.
- Übungen, die den Lernplan verändern oder in der Statistik auftauchen.
- Karteninhalte (Wege, Stellwürfe, Begründungen) im vorgerenderten Gerüst.
- Eine Auswahlseite, auf der man scrollen muss, um „Los“ zu erreichen (Maßstab 375 × 667).

## Rahmen

- Alle Regeln aus `CLAUDE.md`, insbesondere die Cache-Components-Regeln: Die Seite liefert sofort ein Gerüst ohne Lerninhalte; der Datenbaustein ruft zuerst `requireActiveUser()` auf und liefert erst danach Kartendaten. Seitenname englisch: `/<lang>/practice`.
- Texte in beiden Wörterbüchern, keine freien Tailwind-Werte, Icons nur wo nötig, Tests zuerst, Abdeckung ≥ 80 %.
- Clientzustand überlebt Seitenwechsel (Activity). Eine Übungsrunde startet nach dem Verlassen frisch, wie die Lernsitzung (eigener React-Schlüssel je Navigation).
- Keine Datenbankänderung, keine Server Action, die schreibt.

## Ansätze

Für die Rechenübung wurden zwei Formen erwogen:

| Ansatz | Abwägung |
|---|---|
| **A: Rest rechnen und Bogey erkennen** („Rest 211, geworfen T20 · T19 · S5, was bleibt?“) | trainiert genau das schnelle Rechnen und das Erkennen von Bogey-Zahlen; eigenständig, keine Überschneidung |
| B: Der letzte Dart entscheidet („Rest 229, geworfen T20 · T20, wohin mit dem dritten?“) | trainiert das Vermeiden direkt, ist aber im Kern ein Stellwurf über 170 und überschneidet sich mit Paket 3 |

Gewählt vom Auftraggeber: **A.**

Für „Wege üben“ wurden zwei Bauweisen erwogen (Entscheidung des Erbauers, der Auftraggeber hat sie im Entwurf gesehen):

| Ansatz | Abwägung |
|---|---|
| **Lernsitzung mit Übungsmodus** | gleiche Karte, Eingabe und Prüfung; nur die Leiste unten und die Speicherung unterscheiden sich; eine Stelle zu pflegen |
| Eigene Übungsoberfläche | unabhängig, aber doppelte Pflege des Lernbildschirms und Gefahr, dass beide auseinanderlaufen |

Gewählt: **Lernsitzung mit Übungsmodus.**

## Einstieg

- Auf „Heute“ ein zweiter, ruhiger Knopf **„Üben“** unter dem Hauptknopf „Lernen“. Er ist immer da, auch wenn heute nichts fällig ist; fehlt „Lernen“, steht „Üben“ als ruhiger Knopf an dessen Stelle und wird nicht zur Hauptaktion. (Entscheidung des Erbauers.)
- Neue Seite `/<lang>/practice` im angemeldeten Bereich (`src/app/[lang]/(app)/practice/`). Nur aktive Nutzer; wartende und gesperrte kommen wie bei den anderen Seiten nicht hin.
- Die Navigation unten bleibt bei drei Einträgen. Auf der Auswahlseite ist sie sichtbar, während einer Runde ausgeblendet wie beim Lernen. `AppNav` blendet sich heute über den Pfad aus; ob die Runde dafür einen eigenen Unterpfad bekommt oder die Navigation anders erfährt, dass eine Runde läuft, entscheidet der Umsetzer.
- Während einer Runde (beide Übungen) bleibt der Bildschirm an, mit derselben Logik wie in der Lernsitzung aus Paket 1. (Entscheidung des Erbauers.)

## Auswahlseite

Oben ein Umschalter zwischen den beiden Übungen, darunter die Einstellungen der gewählten Übung und der Hauptknopf „Los“.

```
   Üben
   [ Wege ]  [ Rechnen ]

   Bereich
   (2–40) (41–60) (61–80) (81–100)
   (101–120) (121–140) (141–170)

   Kartenart
   (Alle) (Wege) (Fehlwürfe) (Stellwürfe)

            [ Los ]
```

„Rechnen“ hat keine Einstellungen; unter dem Umschalter steht ein Satz, was die Übung macht, und „Los“.

### Wege: Bereich

- Sieben Bereiche als Chips: 2–40, 41–60, 61–80, 81–100, 101–120, 121–140, 141–170. Mehrfachauswahl.
- Vorauswahl beim ersten Öffnen: alle Bereiche. Ist kein Bereich gewählt, ist „Los“ gesperrt.
- Die letzte Auswahl (Übung „Wege“ oder „Rechnen“, Bereiche, Kartenart) merkt sich das Gerät (localStorage, wie die Darstellungswahl). Fehlt oder misslingt der Zugriff, gilt die Vorauswahl („Wege“, alle Bereiche, „Alle“). (Entscheidung des Erbauers.)

### Wege: Kartenart

Einfachauswahl, Vorgabe „Alle“:

| Auswahl | Karten |
|---|---|
| Alle | alle Karten im Bereich |
| Wege | Rest-Karten und Zwei-Dart-Karten mit Weg |
| Fehlwürfe | Fehlwurf-Karten |
| Stellwürfe | Bogey-Karten, Zwei-Dart-Karten mit Stellwurf, Fehlwurf-Karten, deren Folgeweg ein Stellwurf ist |

Fehlwurf-Karten mit Stellwurf gehören damit zu „Fehlwürfe“ und zu „Stellwürfe“. Maßgeblich für den Bereich ist der Rest, mit dem die Karte beginnt (`rest`), nicht der neue Rest.

Ergibt eine Auswahl keine Karte (kann nach heutigem Kartensatz etwa bei „Stellwürfe“ in 2–40 passieren), ist „Los“ gesperrt und ein kurzer Hinweis erklärt warum. Ob die Anzahl der passenden Karten neben „Los“ steht, entscheidet der Umsetzer.

### Welche Karten in Frage kommen

Alle Karten, die zur Auswahl passen, auch solche, die im Lernplan noch nicht freigeschaltet sind. Beim freien Üben ist das gewollt (vorlernen, gezielt wiederholen). (Entscheidung des Erbauers.)

## Runde „Wege“

- Höchstens 20 Karten, zufällig aus den passenden gezogen, in zufälliger Reihenfolge. Gibt es weniger, alle.
- Ablauf je Karte wie beim Lernen: Frage, Eingabe über das Tastenfeld oder „Ohne Eingabe aufdecken“, Prüfung, Auflösung. Alles, was Paket 1 und der Entwurf „Weg eingeben“ für die Kartenarten festlegen, gilt unverändert.
- Statt der Bewertungsleiste zwei Knöpfe: **„Nochmal“** (die Karte kommt in dieser Runde später wieder, wie „Nochmal“ beim Lernen) und **„Weiter“** (Hauptknopf).
- Kopfzeile wie beim Lernen: Schließen, Zähler, Fortschritt.
- Ende der Runde: „Runde geschafft“, dazu **„Noch eine Runde“** (neue Ziehung mit derselben Auswahl) und **„Fertig“** (zurück zur Auswahlseite).
- Schließen während der Runde führt zur Auswahlseite.

## Runde „Rechnen“

### Aufgabe

```
   ×                      3 / 10
   ━━━━━━──────────────────────
                Rest
                211
     [ T20 ]  [ T19 ]  [ S5 ]
            Was bleibt?
              [ 8 9 ]
     1  2  3
     4  5  6
     7  8  9
     ⌫  0  Prüfen
```

- Zehn Aufgaben je Runde, im Browser zufällig erzeugt, nichts gespeichert.
- Startrest zwischen 171 und 230. Drei Würfe aus einem realistischen Vorrat rund um die 20 und die 19: S20, T20, S1, T1, S5, T5, S19, T19, S3, T3, S7, T7. Der neue Rest liegt zwischen 2 und 170.
- In etwa jeder vierten Aufgabe ist der neue Rest eine Bogey-Zahl (159, 162, 163, 165, 166, 168, 169). Die übrigen sind checkbare Reste. Genaues Verfahren (erst Zielrest wählen und passende Würfe suchen, oder ziehen und verwerfen) entscheidet der Umsetzer; es muss für jede Bogey-Zahl Aufgaben geben können.
- Die Würfe stehen in den drei Dart-Feldern.

### Eingabe

- Eigenes Zahlenfeld 0 bis 9, Löschen, „Prüfen“. Keine Bildschirmtastatur.
- Höchstens drei Ziffern. „Prüfen“ ist aktiv ab einer Ziffer.

### Auflösung

- Ergebniszeile: **„Richtig“** (dunkel mit Gelb) oder **„Falsch, es bleiben 89“** (hellrot), in der Art der vorhandenen Ergebnisstufen.
- Darunter: bei checkbarem Rest **„checkbar“** mit dem besten Weg aus der Rest-Karte, bei Bogey-Zahl **„Bogey, nicht checkbar“** mit dem Stellwurf der Bogey-Karte.
- Knopf **„Weiter“**.

### Ende

„8 von 10 richtig“, dazu „Noch eine Runde“ und „Fertig“.

## Daten und Sicherheit

- Der Datenbaustein der Übungsseite prüft die Sitzung (`requireActiveUser()`), bevor er Kartendaten an den Client gibt. Das Gerüst enthält nur Auswahl-Bausteine ohne Karteninhalte; der Skeleton deckt die Fläche ab, bis die Daten da sind.
- Ob der Server die Kartendaten für die ganze Auswahl liefert und der Client zieht, oder der Server die Runde zieht, entscheidet der Umsetzer. Es gibt keine Nutzerdaten in der Antwort außer dem, was jede angemeldete Seite ohnehin hat; Lerninhalte nur hinter der Sitzungsprüfung.
- Keine schreibende Server Action. Übungen erzeugen keine Zeilen in `review_log` oder `card_state`.
- Die Auswahl aus localStorage wird beim Lesen geprüft (nur bekannte Bereiche und Kartenarten), ungültige Werte werden verworfen.

## Was der Umsetzer entscheidet

- Aufbau des Übungsmodus in der Lernsitzung (Eigenschaft, eigener Reducer-Zweig, eigene Leiste).
- Ob die Anzahl passender Karten neben „Los“ steht.
- Wortlaut aller neuen Texte in beiden Sprachen.
- Erzeugungsverfahren der Rechenaufgaben im Rahmen oben.
- Darstellung des Umschalters (Segmentleiste wie S/D/T oder Tabs).
- Wo die gemeinsame Logik liegt (Filter nach Bereich und Kartenart, Aufgabenerzeugung: reine Logik unter `src/lib/`, mit Tests).

## Tests

- Filter: jede Kartenart und Bereich-Kombination liefert genau die erwarteten Karten; Fehlwurf-Karten mit Stellwurf in beiden Gruppen; leere Auswahl.
- Ziehung: höchstens 20, keine Doppelten, alle aus der Auswahl.
- Rechenaufgaben: Startrest 171 bis 230, Würfe aus dem Vorrat, neuer Rest 2 bis 170 und rechnerisch richtig; Anteil Bogey-Zahlen über viele Ziehungen ungefähr ein Viertel; jede Bogey-Zahl erreichbar. Mit festem Zufallsgenerator testbar.
- Komponenten: Einstieg auf „Heute“; Auswahl mit gesperrtem „Los“ bei leerer Auswahl; Runde „Wege“ mit „Nochmal“ und „Weiter“ und Ende; Runde „Rechnen“ mit Eingabe, richtiger und falscher Antwort, Bogey-Auflösung, Ende mit Ergebnis.
- Zugriff: wartende und gesperrte Nutzer kommen nicht auf `/practice`; kein Lerninhalt im Gerüst (vorhandener Wächtertest für Lader beachten).
- Üben schreibt nichts in die Datenbank.
- Der Wächtertest gegen harte Texte schlägt nicht an.

## Ablauf der Umsetzung

Wie für alle drei Pakete vom Auftraggeber festgelegt:

- Eigene Session in eigenem Worktree auf Basis des aktuellen `develop` (mit Paket 1). Sie schreibt zuerst den Umsetzungsplan, setzt testgetrieben um, lässt Code-Review und Security-Review laufen, testet im Browser (375 × 667 und Desktop, hell und dunkel) mit einem lokalen Testkonto und endet mit einem geprüften, lokal committeten Branch. Sie merged nicht, pusht nicht und greift nicht auf Vercel zu.
- Merge nach `develop` und `main` und die Bereitstellung per `npx vercel@65.12.1 deploy --prod` macht die koordinierende Session nach Prüfung (Zustimmung des Auftraggebers vom 2026-11-13). Paket 2 braucht keine Migration.
- In Produktion werden öffentliche Seiten und Laufzeitfehler geprüft, den angemeldeten Teil prüft der Auftraggeber.
