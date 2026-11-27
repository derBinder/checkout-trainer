# Paket 3: Zusatzkarten mit Schaltern

Stand: 2026-11-13

## Worum es geht

Der Grundentwurf beschränkt Fehlwurf-Karten bewusst auf „Single statt Triple“ und die Reste auf 2 bis 170. Am Board passieren aber ständig weitere Fehlwürfe, und oberhalb von 170 entscheidet die Aufnahme, ob man sich auf eine Bogey-Zahl stellt. Der Auftraggeber zu den Rechenübungen: Es geht vor allem darum, sich nicht auf eine Bogey-Zahl zu stellen.

Paket 3 bringt drei Arten von Zusatzkarten, die jeder Nutzer einzeln zuschaltet, und eine neue Prüfstufe für Stellwürfe, die eine Bogey-Zahl lassen. Weil die Zusatzkarten den Kartensatz von 402 auf bis zu 683 Karten vergrößern, sind sie anfangs aus: Der Kern bleibt so schnell gelernt wie bisher.

Paket 3 ist das letzte von drei Erweiterungspaketen und baut auf den beiden ersten auf:

- [Paket 1](2026-11-13-paket-1-zwei-darts-zerlegung-design.md): Zwei-Dart-Karten mit Wegen und Stellwürfen, Zerlegung, Prognose, Bildschirm an.
- [Paket 2](2026-11-13-paket-2-ueben-design.md): Seite „Üben“ mit Wegen nach Bereich und Kartenart und Rechenübung (Startreste 171 bis 230).

Umgesetzt wird Paket 3 erst, wenn Paket 2 in Produktion ist.

## Ziele

- Drei Schalter in den Einstellungen: „Single statt Doppel“, „Nachbarfelder“, „Reste über 170“, je Konto gespeichert, anfangs aus.
- 19 Karten „Single statt Doppel“, 202 Nachbarfeld-Karten, 60 Stellwurf-Karten für 171 bis 230.
- Neue Prüfstufe „Lässt Bogey-Zahl“ für alle Stellwurf-Prüfungen der App.
- Lernplan, Prognose und Seite „Üben“ berücksichtigen nur eingeschaltete Zusatzkarten.

## Nicht-Ziele

- Keine Nachbarfelder bei anderen Zielen als T20 und T19, keine Nachbar-Triples (vom Auftraggeber: Umfang A).
- Kein Fehlwurf „Doppel ganz verfehlt“ (Wurf außerhalb, null Punkte) und keine Würfe ins Nachbar-Doppel.
- Keine Reste über 230. Dort ist man weit vom Checkout, und der Stellwurf ist bis auf wenige Ausnahmen (etwa 339 bis 349, wo T20 · T20 · T20 eine Bogey-Zahl ließe) T20 · T20 · T20.
- Statistik-Raster bleibt bei 2 bis 170. Keine eigene Statistik je Zusatzkarte.
- Keine Änderung des Stellwurf-Regelwerks (`bestSetup`). Die neue Stufe betrifft nur die Prüfung der Eingabe.

## Anti-Ziele

- Zusatzkarten, die ohne Zutun des Nutzers im Lernplan auftauchen.
- Ausschalten, das Lernstand löscht.
- Ein Stellwurf, der eine Bogey-Zahl lässt, wird irgendwo in der App als richtig oder „anderer Stellwurf“ gewertet.
- Eine Einstellungsseite, die durch die Schalter unübersichtlich wird.

## Rahmen

- Alle Regeln aus `CLAUDE.md`. Insbesondere: `src/lib/db/schema.ts` von Hand pflegen, Migration mit `npm run db:generate`; Kartendaten mit `npm run generate:cards`; Texte in beiden Wörterbüchern; Tests zuerst; Abdeckung ≥ 80 %; Cache-Components-Regeln; Server Actions leiten nur über `localeRedirectPath()` um.
- Für 41 bis 170 gelten die Regeln der Referenztabelle. Folgewege nach einem Fehlwurf entstehen wie bei den bestehenden Fehlwurf-Karten über `followAfterSingle(neuerRest, dartsLeft)` in `src/lib/darts/cards.ts` (Tabellenspalte „mit 2 Darts“, sonst Variante 1 mit höchstens zwei Schritten, sonst eigenes Regelwerk bzw. Stellwurf). So lehren alle Karten zu derselben Lage dasselbe.
- Stellwürfe aus `bestSetup` in `src/lib/darts/scoring.ts`.

## Ansätze

Umfang der Nachbarfeld-Karten (die bestehenden 151 Fehlwurf-Fälle zielen 67-mal auf T20, 34-mal auf T19, 50-mal auf andere Triples):

| Ansatz | Karten | Abwägung |
|---|---|---|
| **A: Nachbar-Single nur bei T20 und T19** | 202 | die häufigsten Fehlwürfe überhaupt, zwei Drittel der Fälle |
| B: Nachbar-Single bei allen Triples | etwa 300 | wenig zusätzlicher Nutzen, seltenere Ziele |
| C: wie B plus Nachbar-Triples | etwa 600 | Nachbar-Triples sind selten, verdoppelt die Menge |

Gewählt vom Auftraggeber: **A.**

Zuschnitt der Karten „Single statt Doppel“ (Entscheidung des Erbauers, vom Auftraggeber im Kurzentwurf gesehen): eine Karte je Doppel statt eine je Rest-Karte. Je Rest-Karte gäbe es dieselbe Rechnung (D16 verfehlt, 16 bleiben) über hundertmal.

Ort der Schalter: am Konto (Datenbank) statt je Gerät, weil der Lernplan am Konto hängt und auf jedem Gerät gleich sein muss.

## Schalter

- Neuer Abschnitt **„Zusatzkarten“** auf der Einstellungsseite, unter „Neue Karten pro Tag“. Drei Schalter, je mit einem kurzen Satz, was sie bringen und wie viele Karten:
  - „Single statt Doppel“ (19 Karten)
  - „Nachbarfelder“ (202 Karten)
  - „Reste über 170“ (60 Karten)
- Anfangs aus, für neue und für bestehende Konten.
- Gespeichert am Nutzer in der Datenbank. Schema von Hand in `src/lib/db/schema.ts`, Migration mit `db:generate`. Die Form (drei boolesche Spalten oder eine Liste) entscheidet der Umsetzer; die Felder dürfen wie `newPerDay` und `extraNew*` nicht über Endpunkte von Better Auth setzbar sein.
- Ändern über eine Server Action mit `requireActiveUser()` und Prüfung der Eingabe (nur bekannte Schalter, nur wahr oder falsch), wie `set-new-per-day.ts`.
- Ob ein Schalter sofort beim Umlegen speichert oder es einen Knopf „Speichern“ gibt, entscheidet der Umsetzer im Stil des Formulars „Neue Karten pro Tag“. Eine Rückmeldung, dass gespeichert wurde, ist Pflicht.
- In Produktion läuft die Migration beim Bau automatisch (`scripts/vercel-build.sh`). Die Migration darf bestehende Daten nicht verändern und muss für bestehende Konten „aus“ ergeben.

## Nachbarfeld-Karten

- Grundlage: jeder bestehende Fehlwurf-Fall (`singleCases` der Rest-Karten) mit Ziel T20 oder T19. Statt des Singles desselben Felds wird das Single eines Nachbarfelds getroffen:
  - Ziel T20: S1 oder S5.
  - Ziel T19: S7 oder S3.
- Je Fall zwei Karten, zusammen 202 (67 × 2 + 34 × 2).
- Aufbau wie eine Fehlwurf-Karte: ursprünglicher Rest, schon geworfene Darts, Ziel, Treffer, neuer Rest, verbleibende Darts, Folgeweg (`followAfterSingle(neuerRest, dartsLeft)`).
- Frage, Eingabe, Prüfung und Auflösung wie bei Fehlwurf-Karten (Entwurf „Weg eingeben“): Der neue Rest wird im Kopf gerechnet, eingegeben wird der Folgeweg; Stellwurf-Stufen, wenn kein Finish mehr geht.
- Der Treffer wird wie bei Fehlwurf-Karten rot dargestellt; „Ziel war T20, getroffen: S5“.
- Stabile Kennung je Fall und Treffer (Vorschlag: `n-<rest>-<dartIndex>-<treffer>`).
- Ergibt ein Fall keine sinnvolle Karte (neuer Rest unter 2), entfällt er. Nach heutigem Kartensatz tritt das nicht auf; ein Test hält die Anzahl 202 fest.

## Karten „Single statt Doppel“

- Eine Karte je Doppel D2 bis D20, zusammen 19. Keine Karte für D1 (nach S1 bleibt 1, kein Finish möglich) und keine für Bull: Die App zielt nie mit Darts in Reserve aufs Bull (Rest 50 lehrt mit drei und mit zwei Darts S10 · D20, Tabelle Variante 1), ein verfehltes Bull lässt also nie Darts übrig. (Entscheidung des Erbauers nach dem Gegenlesen.)
- Lage: Man steht auf dem Rest des Doppels (D16: Rest 32), hat drei Darts in der Hand, zielt aufs Doppel und trifft das Single (S16). Gefragt: neuer Rest und Weg mit den zwei verbleibenden Darts.
- Antwort: `followAfterSingle(neuerRest, 2)`. Beispiele: D16 → S16 → 16 bleiben → D8. D15 → S15 → 15 bleiben → S7 · D4 (eigenes Regelwerk).
- Darstellung wie Fehlwurf-Karten: Rest, erster Dart rot mit „Ziel war D16, getroffen: S16“, zwei offene Felder.
- Stabile Kennung je Doppel (Vorschlag: `d-<feld>`).

## Stellwurf-Karten für 171 bis 230

- Eine Karte je Rest von 171 bis 230, zusammen 60.
- Frage: „Rest 199“ mit drei offenen Feldern, Eingabe von bis zu drei Darts. Keine Taste „Nicht checkbar“ (über 170 ist nichts checkbar, die Zahl verrät es ohnehin).
- Antwort: `bestSetup(rest, 3)` mit dem gelassenen Rest. Beispiele nach heutigem Regelwerk: 171 → T20 · T20 · S19, lässt 32. 199 → T20 · T20 · T13, lässt 40. 221 → T20 · T20 · T17, lässt 50. 230 → T20 · T20 · T20, lässt 50.
- Prüfung mit den Stellwurf-Stufen (siehe unten), höchstens drei Darts. Die Reihenfolge der Darts zählt wie überall in der App: T20 · T20 · S19 ist richtig, S19 · T20 · T20 ist „Anderer Stellwurf“, weil man den Plan nach jedem Dart anpasst und mit dem schweren Wurf beginnt. (Entscheidung des Erbauers.) Seit `2026-11-27-stellwurf-begruendung-design.md` zählt die Reihenfolge bei Stellwürfen nicht mehr. Der vorhandene Prüftyp `setup` erlaubt heute höchstens zwei Darts und muss auf drei erweitert werden.
- Auflösung: „Stellwurf“ mit Würfen und gelassenem Rest, Zerlegung entfällt.
- Stabile Kennung je Rest (Vorschlag: `o-<rest>`).

## Neue Prüfstufe „Lässt Bogey-Zahl“

- Gilt für jede Prüfung eines Stellwurfs in der App: Zwei-Dart-Stellwürfe (Paket 1), Fehlwurf-Karten mit Stellwurf, Nachbarfeld-Karten mit Stellwurf, „Single statt Doppel“ mit Stellwurf, Stellwürfe über 170.
- Reihenfolge der Stufen:
  1. Eingabe gleich dem Stellwurf der Karte → „Richtiger Stellwurf“ (unverändert).
  2. Rest minus Summe der Eingabe ist eine Bogey-Zahl (159, 162, 163, 165, 166, 168, 169) → **„Lässt Bogey-Zahl“**, hellrot, mit der gelassenen Zahl („Lässt 159, nicht checkbar“).
  3. Sonst → „Anderer Stellwurf“ (unverändert).
- Ein Stellwurf, der überwirft (Rest unter 2), bleibt wie heute bei „Anderer Stellwurf“. (Entscheidung des Erbauers; nicht Teil dieses Pakets.)
- Die Stufe hängt nicht an den Schaltern: Sie gilt auch für Karten aus Paket 1 und die bestehenden Fehlwurf-Karten.
- Bogey-Karten fragen den Stellwurf weiterhin nicht ab (Entwurf „Weg eingeben“); für sie ändert sich nichts.

## Freischaltung und Lernplan

- Reihenfolge wie bisher aufsteigend nach Rest. Je Rest: Rest- oder Bogey-Karte, Fehlwurf-Karten, Nachbarfeld-Karten, Zwei-Dart-Karte. Karten „Single statt Doppel“ stehen beim Rest ihres Doppels (D16 beim Rest 32) nach dessen übrigen Karten. Stellwurf-Karten über 170 folgen nach Rest 170 aufsteigend.
- Ausgeschaltete Zusatzkarten fehlen in der Reihenfolge, die der Lernplan nutzt: Sie werden weder als neue Karten eingeführt noch als fällig angezeigt. Ihr Lernstand bleibt in der Datenbank. Nach dem Wiedereinschalten sind sie mit ihrem alten Lernstand wieder da (fällige Karten kommen sofort).
- Wer einen Schalter einschaltet, bekommt als nächste neue Karten zuerst die Zusatzkarten der Reste, die er schon durchlaufen hat (wie bei Paket 1).
- Die Lernsitzung, die beim Umschalten schon geladen ist, darf unverändert zu Ende laufen.
- Prognose (Paket 1) zählt nur eingeschaltete Karten.
- „Heute“ zählt fällige und neue Karten nur aus eingeschalteten Karten.

## Statistik

- Raster bleibt bei 2 bis 170; die Stufe eines Rests bestimmt weiter nur die Rest- oder Bogey-Karte.
- „Nochmal“ auf einer Zusatzkarte zählt zum Rest der Karte (Nachbarfeld: ursprünglicher Rest; Single statt Doppel: Rest des Doppels). Stellwurf-Karten über 170 zählen nicht zur Liste der schwierigsten Reste, weil das Raster sie nicht zeigt und die Detailansicht sie nicht öffnen kann. (Entscheidung des Erbauers.)
- Lernserie: Bewertungen auf Zusatzkarten zählen wie alle anderen.

## Seite „Üben“ (Paket 2)

- Es werden nur Karten eingeschalteter Arten angeboten.
- Zuordnung zu den Kartenarten: Nachbarfeld- und „Single statt Doppel“-Karten zu „Fehlwürfe“ (bei Stellwurf-Folgeweg zusätzlich zu „Stellwürfe“); Stellwurf-Karten über 170 zu „Stellwürfe“.
- Bereichs-Chip „171–230“ erscheint nur, wenn „Reste über 170“ eingeschaltet ist. Eine gemerkte Auswahl mit diesem Bereich wird ohne den Schalter still verworfen.
- Die Rechenübung ändert sich nicht.

## Was der Umsetzer entscheidet

- Form der Speicherung der Schalter, Namen der neuen Kartenarten und Felder.
- Ob die Nachbarfeld- und „Single statt Doppel“-Karten eigene Kartenarten sind oder Varianten der Fehlwurf-Karte.
- Speichern beim Umlegen oder per Knopf (mit Rückmeldung).
- Wortlaut aller Texte in beiden Sprachen.
- Wie der Filter nach Schaltern in Lernplan, „Heute“, Prognose und „Üben“ an einer Stelle umgesetzt wird.

## Tests

- Kartenerzeugung: 202 Nachbarfeld-Karten mit richtigen Treffern und Resten; 19 Karten „Single statt Doppel“ (D2 bis D20); 60 Karten über 170 mit `bestSetup`; stabile Kennungen; Reihenfolge wie oben; `cards.generated.json` passt zum Generator.
- Prüfung: Stufe „Lässt Bogey-Zahl“ vor „Anderer Stellwurf“, für jede Bogey-Zahl; drei Darts bei Stellwürfen über 170; bestehende Stufen unverändert.
- Schalter: Server Action nur für aktive Nutzer, ungültige Eingaben abgelehnt, Wirkung auf Lernplan (keine neuen und keine fälligen ausgeschalteten Karten), Lernstand bleibt beim Aus- und Einschalten.
- Migration: bestehende Konten haben alle Schalter aus.
- Prognose, „Heute“ und „Üben“ zählen nur eingeschaltete Karten; Bereich 171–230 nur mit Schalter.
- Statistik: Zusatzkarten ändern das Raster nicht; über 170 nicht in der Liste der schwierigsten Reste.
- Komponenten: Abschnitt „Zusatzkarten“ mit drei Schaltern und Rückmeldung; Fragen und Auflösungen der neuen Karten; Ergebniszeile „Lässt Bogey-Zahl“.

## Ablauf der Umsetzung

Wie für alle drei Pakete vom Auftraggeber festgelegt:

- Eigene Session in eigenem Worktree auf Basis des aktuellen `develop` (mit Paket 1 und 2). Sie schreibt zuerst den Umsetzungsplan, setzt testgetrieben um, lässt Code-Review und Security-Review laufen (Schwerpunkt: neue Server Action, Schema und Migration), testet im Browser (375 × 667 und Desktop, hell und dunkel) mit einem lokalen Testkonto, inklusive Migration einer lokalen Datenbank mit vorhandenem Lernstand, und endet mit einem geprüften, lokal committeten Branch. Sie merged nicht, pusht nicht und greift nicht auf Vercel zu.
- Merge nach `develop` und `main` und die Bereitstellung per `npx vercel@65.12.1 deploy --prod` macht die koordinierende Session nach Prüfung (Zustimmung des Auftraggebers vom 2026-11-13). **Paket 3 braucht eine Migration**; sie läuft beim Prod-Bau automatisch auf Neon. Die koordinierende Session prüft vorher die erzeugte SQL-Datei.
- Danach Gesamt-Review mit Security-Review über alle drei Pakete in einer eigenen Session.
