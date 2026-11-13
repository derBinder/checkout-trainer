# Paket 1: Zwei-Dart-Karten, Zerlegung, Prognose, Bildschirm an

Stand: 2026-11-13

## Worum es geht

Der Trainer soll helfen, am Board schnell den richtigen Weg zu finden, ohne eine Liste auswendig zu lernen (siehe [Grundentwurf](2026-11-11-checkout-trainer-design.md)). Paket 1 ist das erste von drei Erweiterungspaketen:

1. **Paket 1 (dieses Dokument):** Zwei-Dart-Karten mit Stellwürfen, Zerlegung statt Begründungssatz, Prognose in der Statistik, Bildschirm bleibt beim Lernen an.
2. Paket 2: Seite „Üben“ (freies Üben nach Restbereich und Kartenart, Rechenübung). Eigener Entwurf.
3. Paket 3: Zusatzkarten mit Schaltern (Single statt Doppel, Nachbarfelder, Reste über 170). Eigener Entwurf.

Warum Paket 1:

- **Zwei-Dart-Karten:** Im Spiel steht man ständig mit zwei Darts in der Hand vor einem Rest, nachdem der erste Dart gesessen hat. Bisher lernt die App diese Lage nur nebenbei (Hinweis „Mit 2 Darts“ in der Auflösung, Folgewege der Fehlwurf-Karten). Vor allem fehlt die Frage „Rest 125, noch zwei Darts, was stellst du dir?“.
- **Zerlegung:** Große Reste merkt man sich leichter als „ein Wurf plus ein Rest, den ich schon kenne“ als als eigenständige Folge von drei Darts. Das passt zum Ziel, keine Liste zu pauken.
- **Prognose:** Zeigt, wann man mit dem Freischalten durch ist. Motiviert und macht die Wirkung der Einstellung „Neue Karten pro Tag“ sichtbar.
- **Bildschirm an:** Am Board liegt das Handy oft eine Weile, beim Lernen soll es nicht ausgehen.

## Ziele

- Neue Kartenart „noch 2 Darts“ mit den 15 Wegen der Tabellenspalte „mit 2 Darts“ und 67 Stellwurf-Karten.
- In der Auflösung jeder Rest-Karte mit mindestens zwei Darts eine Zerlegungszeile statt des Begründungssatzes.
- Eine Prognosezeile auf der Statistikseite.
- Während einer Lernsitzung bleibt der Bildschirm an.

## Nicht-Ziele

- Keine Seite „Üben“ und kein Filter nach Kartenart (Paket 2).
- Keine Schalter, mit denen der Nutzer Kartenarten ein- oder ausschaltet (Paket 3). Die Zwei-Dart-Karten gehören in Paket 1 zum festen Kartensatz.
- Keine Ein-Dart-Karten.
- Keine Vorhersage, wann alle Karten „sicher“ sind. Das hängt von den Bewertungen ab und wäre geraten.
- Keine Einstellung für „Bildschirm an“.
- Keine Datenbankänderung.

## Anti-Ziele

- Ein Fragebildschirm, der verrät, ob es mit zwei Darts noch ein Finish gibt.
- Eine Zerlegung, die etwas anderes lehrt als die Karte des verbleibenden Rests.
- Eine Auflösung, die durch die Zerlegung länger wird als heute (sie ersetzt eine Zeile, sie kommt nicht hinzu).
- Mehr als eine neue Zeile auf der Statistikseite.

## Rahmen

- Es gelten alle Regeln aus `CLAUDE.md`, insbesondere: Texte in beiden Wörterbüchern, keine freien Tailwind-Werte, Tests zuerst, Abdeckung mindestens 80 %, Cache-Components-Regeln (keine Nutzerdaten im Gerüst, jeder Datenbaustein prüft die Sitzung selbst).
- Für 41 bis 170 gelten die Regeln der Referenztabelle. Die Tabelle sagt nichts zu Stellwürfen; für sie gilt wie bisher das eigene Regelwerk (`bestSetup` in `src/lib/darts/scoring.ts`).
- Kartendaten werden beim Bauen erzeugt (`npm run generate:cards`), `src/data/cards.generated.json` wird nicht von Hand geändert.
- Die Umsetzung muss so auf dem Smartphone (Maßstab 375 × 667) funktionieren wie der heutige Lernbildschirm: Tastenfeld, „Prüfen“ und Bewertungsleiste erreichbar ohne Scrollen.

## Ansätze

Für die Zwei-Dart-Karten wurden drei Umfänge erwogen:

| Ansatz | Umfang | Abwägung |
|---|---|---|
| Nur die 15 Tabellenwege | 15 Karten | klein, aber deckt sich fast mit dem bestehenden Hinweis „Mit 2 Darts“; die häufige Lage „zwei Darts, kein Finish mehr“ fehlt |
| **15 Tabellenwege plus Stellwürfe** | 82 Karten | trainiert genau das Umrechnen mit zwei Darts; Stellwürfe aus dem eigenen Regelwerk |
| Zusätzlich Ein-Dart-Karten | über 100 Karten | Ein-Dart-Lagen sind meist trivial (gerade Zahl halbieren) und blähen den Kartensatz auf |

Gewählt vom Auftraggeber: **15 Tabellenwege plus Stellwürfe.**

Für die Muster wurden zwei Formen erwogen:

| Ansatz | Abwägung |
|---|---|
| **Zerlegung**, automatisch aus dem besten Weg | lückenlos für jeden Rest, ohne Handarbeit, verknüpft große mit bekannten kleinen Resten |
| Gruppen, von Hand festgelegt („101 bis 110: T20, danach Rest −60“) | anschaulicher, aber nicht für jeden Rest, Texte in zwei Sprachen von Hand zu pflegen |

Gewählt vom Auftraggeber: **Zerlegung.**

Stellwürfe gezielt üben: Der Auftraggeber fragte nach einer eigenen Funktion. Entscheidung: keine eigene Funktion, sondern ein Filter nach Kartenart auf der Seite „Üben“ in Paket 2. Im Lernplan laufen die Stellwurf-Karten normal mit.

## Zwei-Dart-Karten

### Welche Karten entstehen

Eine Zwei-Dart-Karte gibt es für jeden Rest, bei dem man mit zwei Darts in der Hand etwas anderes tun muss, als die Rest-Karte lehrt:

1. **Weg-Karten (15):** Reste, für die die Tabellenspalte „mit 2 Darts“ einen Weg nennt: 61 bis 70, 90, 101, 104, 107, 110. Antwort: dieser Weg.
2. **Stellwurf-Karten (67):** Reste, bei denen mit zwei Darts kein Finish möglich ist: 99, 102, 103, 105, 106, 108, 109 und 111 bis 170 (einschließlich der Bogey-Zahlen). Antwort: der beste Stellwurf mit zwei Darts und der Rest, den er lässt.

Die Antwort ist in beiden Fällen genau das, was die bestehende Funktion `followAfterSingle(rest, 2)` in `src/lib/darts/cards.ts` liefert (Tabellenspalte, sonst Variante 1 mit höchstens zwei Schritten, sonst `bestSetup(rest, 2)`). Damit lehren Zwei-Dart-Karten und die Folgewege der Fehlwurf-Karten dasselbe. Es entsteht genau dann eine Zwei-Dart-Karte, wenn die Tabellenspalte einen Weg nennt oder das Ergebnis ein Stellwurf ist. Nachgerechnet am 2026-11-13: 15 plus 67, zusammen 82. Kein Rest, der mit zwei Darts checkbar ist, bekommt fälschlich eine Stellwurf-Karte.

Beispiele der Stellwürfe (heutiges Regelwerk): 99 → T20 · S7, lässt 32. 125 → T20 · T11, lässt 32. 161 → T20 · T17, lässt 50. 170 → T20 · T20, lässt 50.

Der Kartensatz wächst von 320 auf 402 Karten.

### Kartenaufbau

Neue Kartenart neben `rest`, `miss` und `bogey`, mit stabiler Kennung je Rest (Vorschlag: `t-<rest>`). Sie trägt den Rest und den Folgeweg im Format, das Fehlwurf-Karten schon nutzen (`FollowText`: Finish mit Weg oder Stellwurf mit Würfen und gelassenem Rest). Der genaue Typ ist Sache des Umsetzers.

### Reihenfolge der Freischaltung

Wie bisher aufsteigend nach Rest. Je Rest: erst die Rest- oder Bogey-Karte, dann die Fehlwurf-Karten, dann die Zwei-Dart-Karte.

Folge für bestehende Nutzer: Wer schon über Rest 61 hinaus ist, bekommt als nächste neue Karten zuerst die Zwei-Dart-Karten der bereits durchlaufenen Reste (`buildQueue` nimmt die ersten ungesehenen Karten der Reihenfolge). Das ist gewollt: Die Lücke wird von unten geschlossen, danach geht es normal weiter.

### Frage

- Oben wie bei allen Karten Kopfzeile, Zähler, Fortschritt.
- „Rest“ und die Zahl, darunter der Hinweis **„noch 2 Darts“** (Text in beiden Wörterbüchern).
- Drei Dart-Felder (`DartSlots`). Das erste ist als verbraucht markiert (neutral, ohne Wert und ohne Fehlwurf-Rot), die Eingabe füllt die beiden übrigen.
- Tastenfeld wie bei Fehlwurf-Karten: höchstens zwei Darts, „Prüfen“, „Ohne Eingabe aufdecken“. Keine Taste „Nicht checkbar“: Gefragt ist immer, was man mit den zwei Darts wirft.
- Der Bildschirm sieht für Weg- und Stellwurf-Karten gleich aus. Ob noch ein Finish geht, muss der Nutzer selbst erkennen.

Text-Skizze:

```
  ×                      7 / 20
  ━━━━━━━━━━━━──────────────────
                Rest
                125
            noch 2 Darts
     [ ── ]  [  ?  ]  [  ?  ]
     S  D  T
     1  2  3  4  5
     ...
  [ Ohne Eingabe aufdecken ]  [ Prüfen ]
```

### Prüfung

Reine Logik in `src/lib/darts/judge.ts`, mit vorhandenen Stufen:

- **Weg-Karte:** Eingabe gleich dem Weg → „Bester Weg“. Eingabe checkt den Rest regelgerecht mit höchstens zwei Darts → „Geht, aber nicht empfohlen“. Sonst „Geht nicht auf“. Ein geteilter Weg zählt wie überall, wenn die Eingabe einer der ausgeschriebenen Varianten entspricht.
- **Stellwurf-Karte:** Eingabe gleich dem Stellwurf → „Richtiger Stellwurf“. Eingabe endet regelgerecht auf null → nicht möglich, weil kein Finish existiert. Jede andere Eingabe → „Anderer Stellwurf“. (Wie bei Fehlwurf-Karten mit Stellwurf. Ein „Geht nicht auf“ gibt es hier nicht, weil kein Finish erwartet wird. Ein Nutzer, der ein Finish versucht, tippt zwangsläufig Darts ein, die den Rest nicht checken, und sieht „Anderer Stellwurf“ samt richtigem Stellwurf.)

### Auflösung

- Weg-Karte: der Weg als „Bester Weg“ in den beiden freien Feldern.
- Stellwurf-Karte: „Kein Finish mit 2 Darts“ und der Stellwurf mit dem gelassenen Rest, in derselben Darstellung wie der Stellwurf einer Fehlwurf-Karte.
- Bewertungsleiste wie bei allen Karten.

### Statistik

- Die Stufe eines Rests im Raster bestimmt weiter nur die Rest- oder Bogey-Karte. In `summarize` (`src/lib/stats.ts`) heißt die Bedingung heute „nicht `miss`“; sie muss auf „`rest` oder `bogey`“ umgestellt werden, sonst überschreibt die Zwei-Dart-Karte die Stufe.
- „Nochmal“ auf einer Zwei-Dart-Karte zählt wie bei Fehlwurf-Karten zum Rest der Karte (Liste „am häufigsten Nochmal“).
- Die Detailansicht eines Rests (Tippen im Raster) zeigt wie bisher die Rest-Karte mit dem Hinweis „Mit 2 Darts“. Ob sie zusätzlich den Stellwurf mit zwei Darts zeigt, entscheidet der Umsetzer.

## Zerlegung

### Was sie zeigt

Die Zerlegung ersetzt in der Auflösung der Rest-Karte den Begründungssatz (`reason`). Sie erklärt den besten Weg als ersten Dart plus den Rest, der dann bleibt, mit den Darts, die dann noch in der Hand sind:

- 3-Dart-Weg: „Nach T20 bleiben 110, mit 2 Darts: T20 · Bull“ (Rest 170).
- 2-Dart-Weg: „Nach S20 bleiben 40, mit 1 Dart: D20“ (Rest 60).

Wortlaut, Satzbau und Darstellung der Darts (Pillen oder Text) entscheidet der Umsetzer; der Satz muss in einer Zeile auf 375 px passen und in beiden Sprachen vorliegen.

Der Verweis im zweiten Teil ist immer der Weg für den verbleibenden Rest mit den verbleibenden Darts, also dasselbe, was die Zwei-Dart-Karte bzw. das Ein-Dart-Finish dieses Rests lehrt (`followAfterSingle`-Logik mit 2 bzw. 1 Dart). Nicht die Rest-Karte mit drei Darts.

### Wann sie fehlt oder verkürzt ist

Nachgerechnet am 2026-11-13 über alle Rest-Karten mit mindestens zwei Darts:

- **128 Reste:** Der Rest des besten Wegs nach dem ersten Dart ist genau der Weg, den der verbleibende Rest mit den verbleibenden Darts lehrt. Volle Zerlegung.
- **11 Reste** (104, 106, 107, 110, 112, 113, 125, 134, 139, 142, 145): Die Tabelle setzt nach dem ersten Dart anders fort, als der verbleibende Rest für sich lehrt. Beispiel 110: T20 · T10 · D10, aber Rest 50 mit zwei Darts lehrt S10 · D20. Hier steht nur der erste Teil: „Nach T20 bleiben 50“. Der Weg selbst steht ohnehin als „Bester Weg“ darüber.
- **3 Reste** (42, 46, 48): Der erste Wurf zielt zwischen zwei Felder. Hier bleibt der bisherige Begründungssatz (Fall `split`).
- **Ein-Dart-Wege** (direkte Doppel, Bull): Hier bleibt der bisherige Begründungssatz (Fall `direct`, `only`).

Ein Test prüft für jede Rest-Karte, welcher dieser Fälle vorliegt, und dass eine volle Zerlegung nie einen anderen Weg nennt, als die Karte des verbleibenden Rests lehrt. Die Liste der 11 Reste ist kein fester Wert im Code, sondern ergibt sich aus der Berechnung; der Test hält nur fest, dass es nach heutigem Stand diese sind.

### Wo die Daten entstehen

Die Zerlegung wird beim Erzeugen der Karten berechnet und an der Rest-Karte gespeichert, wie heute `reason`. Ob sie `reason` ersetzt oder als zusätzliches Feld neben `reason` liegt (damit Fälle ohne Zerlegung den Satz behalten), entscheidet der Umsetzer.

### Was mit der bisherigen Begründung verloren geht

Die Sätze „Bleibt bei Single 20 auf Bull-Finish“ und „Lässt D16, das sich viermal halbieren lässt“ entfallen dort, wo eine Zerlegung steht. Der Fall „nur Single getroffen“ steht weiterhin als eigene Zeile in der Auflösung und deckt den Teil „was passiert beim Fehlwurf“ ab. Bewusst in Kauf genommen, damit die Auflösung nicht länger wird.

## Prognose

- Eine Zeile auf der Statistikseite, bei den Zählern: „Alle Karten freigeschaltet voraussichtlich am 14. Januar“ (Datum in der Sprache der Oberfläche, Berliner Zeit wie alle Tage in der App).
- Berechnung: Anzahl der noch nie gesehenen Karten, verteilt auf die Tage mit der Einstellung „Neue Karten pro Tag“. Was heute noch an neuen Karten offen ist (Tagesgrenze inklusive heute gewährter Extrakarten minus heute schon eingeführter Karten), zählt für heute. Ab morgen nur noch die Einstellung, ohne Extrakarten.
- Sind alle Karten gesehen, steht stattdessen „Alle Karten freigeschaltet“.
- Steht „Neue Karten pro Tag“ auf 0 (erlaubt, siehe `newPerDaySchema`) und reichen die heute noch offenen Extrakarten nicht für alle ungesehenen Karten, gibt es kein Datum. Dann steht dort „Keine neuen Karten eingestellt“. (Meine Entscheidung.)
- Die Zeile ist Nutzerdaten und gehört in den Datenbaustein der Statistik, nicht ins Gerüst. Das Skeleton bekommt einen Platzhalter in derselben Höhe.
- Die Berechnung ist reine Logik mit eigenen Tests (Tagesgrenze, Extrakarten, Rest null, Einstellung 1).

## Bildschirm an

- Während einer Lernsitzung fordert die App eine Bildschirmsperre an (Screen Wake Lock API).
- Freigabe beim Verlassen der Sitzung (Schließen, Ende der Sitzung, Seitenwechsel innerhalb der App, Komponente verborgen durch Activity).
- Wird die Seite verborgen (Tab-Wechsel, Bildschirm aus), gibt der Browser die Sperre selbst frei. Kommt die Seite zurück und die Sitzung läuft noch, wird sie neu angefordert.
- Unterstützt der Browser die API nicht oder lehnt er ab, passiert nichts: keine Meldung, kein Fehler in der Konsole.
- Keine Einstellung, kein sichtbares Element.

## Was der Umsetzer entscheidet

- Name und genauer Typ der neuen Kartenart, Feldnamen.
- Ob die Zerlegung `reason` ersetzt oder daneben liegt.
- Wortlaut aller neuen Texte in beiden Sprachen (kurz, ohne Emojis, Stil der vorhandenen Wörterbücher).
- Darstellung des verbrauchten ersten Dart-Felds, solange es neutral ist und nicht wie ein Fehlwurf aussieht.
- Ob die Detailansicht in der Statistik den Zwei-Dart-Stellwurf zusätzlich zeigt.
- Genaue Stelle der Prognosezeile auf der Statistikseite.
- Ob die Wake-Lock-Logik ein eigener Hook ist.

## Tests

- Kartenerzeugung: genau 82 Zwei-Dart-Karten, 15 Wege und 67 Stellwürfe, an den oben genannten Resten. Jede Weg-Karte checkt ihren Rest mit höchstens zwei Darts. Jeder Stellwurf hat höchstens zwei Darts, lässt einen Rest größer als eins und ist für seinen Rest nicht durch ein Finish ersetzbar. Die Antworten stimmen mit den Folgewegen der Fehlwurf-Karten überein, wo beide denselben Rest mit zwei Darts betreffen.
- Der Test, dass `cards.generated.json` zum Generator passt, läuft weiter.
- Reihenfolge: Zwei-Dart-Karte direkt nach den Fehlwurf-Karten ihres Rests.
- Prüfung: Stufen für beide Arten der Zwei-Dart-Karte, inklusive geteilter Wege.
- Zerlegung: Fälle wie oben, Anzahl je Fall, kein falscher Verweis.
- Statistik: Zwei-Dart-Karten ändern die Stufe im Raster nicht.
- Prognose: siehe oben, dazu Einstellung 0 mit und ohne Extrakarten.
- Stellwürfe der Bogey-Zahlen mit zwei Darts als feste Fälle, etwa 159 → T20 · T20, lässt 39, und 169 → T20 · T20, lässt 49.
- Komponenten: Frage zeigt „noch 2 Darts“ und das verbrauchte Feld, keine Taste „Nicht checkbar“, höchstens zwei Darts eingebbar; Auflösung mit Weg bzw. Stellwurf; Zerlegungszeile in der Auflösung; Prognosezeile.
- Wake Lock: Anforderung beim Start, Freigabe beim Verlassen, erneute Anforderung bei Rückkehr, stilles Verhalten ohne API (mit nachgebildetem `navigator.wakeLock`).

## Ablauf der Umsetzung

Vom Auftraggeber festgelegt, gilt für alle drei Pakete:

- Umsetzung in einer eigenen Session in einem eigenen Worktree auf Basis des aktuellen `develop`. Die Session schreibt zuerst den Umsetzungsplan (`docs/superpowers/plans/`), setzt testgetrieben um und committet lokal.
- Danach Code-Review und Security-Review des Pakets, Befunde beheben.
- Test im Browser mit einem lokalen Testkonto (im Worktree eigene `.data/pglite`, Migration, Testkonto mit Betreiberrolle; `.env.local` aus dem Hauptverzeichnis übernehmen). Geprüft auf Smartphone-Größe (375 × 667) und am Desktop, hell und dunkel.
- Die Paket-Session endet mit einem geprüften, lokal committeten Branch und einem Bericht. Sie merged nicht, pusht nicht und greift nicht auf Vercel zu.
- Merge und Bereitstellung macht die koordinierende Session, nachdem sie das Ergebnis geprüft hat: Merge in `develop`, dann `develop` nach `main`, dann `npx vercel@65.12.1 deploy --prod` aus `main` (direkte Bereitstellung per CLI, ohne Git-Anbindung, siehe [Bereitstellung](../../bereitstellung.md)). Der Auftraggeber hat dem am 2026-11-13 zugestimmt („jedes Paket wird einzeln in develop gemerged und nach prod deployed, wenn es korrekt funktioniert“); das gilt als die in `CLAUDE.md` verlangte Absprache für diese drei Bereitstellungen. Gepusht wird weiterhin nie. Paket 1 braucht keine Migration.
- Nach der Bereitstellung: öffentliche Seiten in Produktion laden, Laufzeitfehler bei Vercel prüfen. Den angemeldeten Teil prüft der Auftraggeber selbst, weil in Produktion keine Passwörter eingegeben werden.
- Nach Paket 3: Gesamt-Review mit Security-Review über alle drei Pakete.
