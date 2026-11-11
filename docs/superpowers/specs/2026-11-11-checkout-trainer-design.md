# Checkout-Trainer: Design

Stand: 2026-11-11

## Worum es geht

Eine Web-App, mit der Dartspieler die Checkout-Wege (Rest 170 und darunter) mit Karteikarten lernen. Auslöser: Der Auftraggeber findet am Board die richtigen Wege nicht schnell genug, will aber keine Liste auswendig lernen. Zusätzlich fällt ihm das Umrechnen schwer, wenn er statt des nötigen Triple nur das Single-Feld trifft.

Die App vermittelt pro Rest den besten Weg, zeigt Alternativen und zeigt, wie es nach einem Single statt Triple weitergeht.

## Ziele

- Checkout-Wege durch Wiederholung in wachsenden Abständen lernen, nicht durch Listenpauken.
- Das Umrechnen nach einem Fehlwurf (Single statt Triple) als eigene Übung trainieren.
- Hauptsächlich am Smartphone nutzbar, funktioniert aber auf allen Bildschirmgrößen.
- Öffentlich: Jeder kann sich registrieren. Ein Konto wird erst nutzbar, wenn der Betreiber es manuell freischaltet.
- Lernstand hängt am Konto und ist auf jedem Gerät gleich.
- Statistik über den eigenen Lernfortschritt.

## Nicht-Ziele

- Kein Scorer, kein Spielmodus, keine Wurferfassung am Board.
- Kein E-Mail-Versand (keine Bestätigungsmail, kein Passwort-Reset per Mail). Es gibt keine eigene Domain.
- Kein Eintippen des Wegs durch den Nutzer. Er überlegt im Kopf und bewertet sich selbst.
- Keine Fehlwurf-Karten für „Single statt Doppel" oder für Würfe ins Nachbarfeld. Nur „Single statt Triple".
- Keine eigenen Karten oder eigenen Wege der Nutzer.
- Keine Mehrsprachigkeit. Oberfläche ist Deutsch.

## Anti-Ziele

Die App ist gescheitert, auch wenn sie technisch funktioniert, wenn sie:

- langsam ist,
- unübersichtlich ist oder zu viel Inhalt auf einer Seite zeigt,
- Icons als Dekoration nutzt (Icons nur dort, wo sie nötig sind),
- Emojis enthält,
- den Betreiber Geld kostet.

## Was ein „bester Weg" ist

Vom Auftraggeber festgelegt, in dieser Reihenfolge wichtig:

1. Weniger Darts gewinnen: Ein Weg mit zwei Darts schlägt einen mit drei, auch wenn der längere auf einem besseren Doppel endet (Rest 100: T20 · D20, nicht T20 · S8 · D16).
2. Der Weg endet auf einem Doppel, das sich gut halbieren lässt (viele Split-Möglichkeiten: D16 vor D8 vor D4, D20, D12 usw.).
3. Trifft man statt des Triple nur das Single, soll möglichst noch ein Finish offen bleiben, bevorzugt ein Bull-Finish.

Bei einem Widerspruch zwischen diesen Kriterien und den üblichen Checkout-Tabellen gewinnt die übliche Tabelle. Der Erbauer wählt dafür eine verbreitete Tabelle als Referenz, legt sie als Datei im Repository ab und nennt die Quelle (Entscheidung des Entwerfers: welche Tabelle, bleibt dem Erbauer überlassen). Der beste Weg jeder Rest-Karte entspricht dieser Referenz. Das Regelwerk liefert die Alternativen, die Begründung und die Fehlwurf-Folgewege und entscheidet dort, wo die Referenz mehrere Wege nennt.

Die Wege werden nicht von Hand abgeschrieben. Ein Regelwerk erzeugt für jeden Rest alle gültigen Wege mit höchstens drei Darts, bewertet sie nach den beiden Kriterien und wählt daraus:

- den besten Weg,
- bis zu zwei Alternativen,
- eine kurze Begründung in einem Satz, warum der Weg der beste ist (z. B. „Bleibt bei Single 20 auf Bull-Finish").

Ein Test stellt sicher, dass der beste Weg jedes Rests mit der Referenztabelle übereinstimmt.

Annahme für alle Karten: drei Darts in der Hand.

Die genaue Gewichtung der Bewertung ist Sache des Erbauers, solange die drei Kriterien oben in dieser Reihenfolge gelten und der Abgleich mit der Referenztabelle besteht.

## Karten

**Rest-Karte.** Eine pro checkbarem Rest von 2 bis 170.

**Bogey-Karte.** Eine pro nicht checkbarem Rest: 169, 168, 166, 165, 163, 162, 159. Vom Auftraggeber gewünscht, damit man auch lernt, welche Zahlen sich nicht checken lassen. Die Frageseite sieht genauso aus wie bei einer Rest-Karte und verrät nicht, dass es eine Bogey-Zahl ist. Die Auflösung zeigt „Nicht checkbar" und einen empfohlenen Stellwurf mit dem Rest, den man sich lässt (Entscheidung des Entwerfers: der Stellwurf). Bogey-Karten haben keine Fehlwurf-Karten. Sie werden wie alle anderen der Größe nach freigeschaltet und erscheinen im Statistik-Raster.

**Fehlwurf-Karte.** Wird automatisch aus dem besten Weg erzeugt: für jedes Triple im besten Weg der Fall „nur das Single desselben Felds getroffen". Die Karte nennt den ursprünglichen Rest, das Ziel und den Treffer. Gefragt sind der neue Rest und der Weg mit den verbleibenden Darts. Ist mit den verbleibenden Darts kein Finish mehr möglich, ist die Antwort der beste Stellwurf (der Rest, den man sich für die nächste Aufnahme lässt). Ergibt ein Fall keine sinnvolle Karte, entfällt er.

Die Kartendaten werden beim Bauen berechnet und als feste Daten mit der App ausgeliefert. Sie liegen nicht in der Datenbank und werden nicht pro Aufruf berechnet. Jede Karte hat eine stabile Kennung, die sich bei unverändertem Rest und Fall nicht ändert.

## Ablauf einer Karte

Vom Auftraggeber anhand eines Mockups bestätigt.

1. **Frage.** Nur der Rest steht groß da, darunter drei leere Dart-Felder. Bei der Fehlwurf-Karte: ursprünglicher Rest, Treffer im ersten Feld, „Ziel war T20, getroffen: Single 20", neuer Rest als Fragezeichen. Ein Knopf: „Weg zeigen".
2. **Auflösung.** Bester Weg in den drei Feldern, darunter Begründung, Alternativen und der Fall „nur Single getroffen" mit Folgeweg.
3. **Selbstbewertung.** Vier Knöpfe: Nochmal, Schwer, Gut, Leicht, jeweils mit dem nächsten Abstand darunter.

Oben eine schmale Fortschrittsleiste und „7 / 20" für die heutige Sitzung. Sonst nichts auf dem Bildschirm.

## Wiederholung

- Verfahren: FSRS (Bibliothek `ts-fsrs`). Pro Nutzer und Karte wird der Lernzustand gespeichert.
- „Nochmal" bringt die Karte in derselben Sitzung zurück.
- Neue Karten werden von unten nach oben freigeschaltet: niedrige Reste zuerst. Zu jedem Rest kommt erst die Rest-Karte, danach ihre Fehlwurf-Karten.
- Neue Karten pro Tag: Vorgabe 10, vom Nutzer einstellbar.
- Eine Sitzung besteht aus den fälligen Wiederholungen plus den neuen Karten des Tages.

## Seiten

Jede Seite hat eine Aufgabe.

| Seite | Inhalt |
|---|---|
| Startseite (öffentlich) | Kurz, was die App tut. Anmelden, Registrieren. |
| Registrieren, Anmelden | E-Mail und Passwort. |
| Warten auf Freischaltung | Hinweis, dass der Betreiber das Konto noch aktivieren muss. |
| Heute | Anzahl fälliger und neuer Karten, ein Knopf „Lernen". |
| Lernen | Der Kartenablauf oben. |
| Statistik | Siehe unten. |
| Einstellungen | Neue Karten pro Tag, Passwort ändern, Konto löschen, Abmelden. |
| Verwaltung (nur Betreiber) | Offene Registrierungen freischalten, Konten sperren, neues Passwort für einen Nutzer setzen. |
| Impressum, Datenschutz | Platzhalterseiten. Den Text liefert der Betreiber. |

Navigation am Smartphone: drei Einträge unten (Heute, Statistik, Einstellungen). Während des Lernens ist sie ausgeblendet.

## Statistik

- Wie viele Reste sicher sitzen, wie viele im Lernen sind, wie viele noch neu.
- Raster aller Reste von 2 bis 170, eingefärbt nach Lernstand. Tippen auf einen Rest zeigt dessen Weg.
- Lernserie in Tagen.
- Die Reste, bei denen am häufigsten „Nochmal" gedrückt wurde.

## Konten

- Bibliothek: Better Auth, E-Mail und Passwort. Formulare aus shadcn-Bausteinen.
- Nach der Registrierung ist das Konto „wartend". Wartende Nutzer sehen nur die Warteseite.
- Das Betreiberkonto wird nicht über die öffentliche Registrierung angelegt, sondern per Einrichtungsskript aus zwei Umgebungsvariablen (E-Mail und Startpasswort). Diese E-Mail ist in der öffentlichen Registrierung gesperrt. Das Konto ist freigeschaltet und sieht die Verwaltung. (Entscheidung des Entwerfers: Ohne Mail-Bestätigung könnte sonst jeder die Betreiber-Adresse zuerst registrieren.) Vorerst wird eine ausgedachte Testadresse verwendet (`betreiber@checkout-trainer.test`). Der Auftraggeber ersetzt sie später über die Umgebungsvariable.
- Passwort vergessen: Da keine Mails verschickt werden, setzt der Betreiber in der Verwaltung ein neues Passwort und gibt es dem Nutzer auf eigenem Weg weiter. Die Anmeldeseite weist darauf hin.
- Schutz gegen Massenregistrierung: Begrenzung der Versuche pro IP (Bordmittel von Better Auth).

## Technik

Entscheidungen des Entwerfers, vom Auftraggeber nicht widersprochen:

- Next.js (App Router) mit TypeScript, shadcn, Lucide-Icons. Vom Auftraggeber vorgegeben: Next.js, shadcn, Lucide, Vercel.
- Hosting: Vercel, Team `team_L16ekIiXaBpa4vlg7m0xQUbg`, Hobby-Tarif, Adresse `*.vercel.app`.
- Datenbank: Neon Postgres im kostenlosen Tarif über den Vercel Marketplace. Zugriff mit Drizzle.
- Bei der Umsetzung gelten die Skills `vercel-react-best-practices` und `frontend-design`.

In der Datenbank liegen nur: Nutzer und Sitzungen (Better Auth), Freischaltstatus, Einstellungen, Lernzustand pro Nutzer und Karte, Bewertungsprotokoll für die Statistik.

Geschwindigkeit:

- Kartendaten sind fester Bestandteil der Auslieferung.
- Eine Lernsitzung lädt ihre Kartenliste einmal. Bewertungen werden im Hintergrund gespeichert, die nächste Karte erscheint sofort.
- Öffentliche Seiten sind statisch.

Kosten: Alles muss in den kostenlosen Tarifen von Vercel und Neon bleiben. Kein Dienst, der eine Zahlungsart verlangt.

Git: Der Erbauer legt ein lokales Repository an und committet. Das Pushen nach GitHub macht der Auftraggeber selbst.

Bereitstellung: Gehört zum Bau, aber jeder Schritt an Vercel, Neon oder einem anderen fremden Dienst wird vorher mit dem Auftraggeber abgesprochen. Der Erbauer baut zuerst alles lokal fertig, legt dann einen konkreten Bereitstellungsvorschlag vor und wartet auf Zustimmung. Erst danach gilt: Der Erbauer legt das Vercel-Projekt im genannten Team an, richtet die Neon-Datenbank und die Umgebungsvariablen ein, spielt das Schema ein, legt das Betreiberkonto an und prüft die laufende App unter `*.vercel.app`. Da der Erbauer nicht nach GitHub pusht, erfolgt die erste Bereitstellung direkt (Vercel-Werkzeuge oder CLI), nicht über die Git-Anbindung. Die Git-Anbindung kann der Auftraggeber nach dem Pushen selbst herstellen. Lokale Entwicklung und Tests laufen ohne fremden Dienst gegen eine eingebettete Postgres-Datenbank (PGlite), damit vor der Absprache nichts bei Neon angelegt wird.

## Gestaltung

Ruhig und typografisch. Die Zahl (der Rest) ist das größte Element auf der Lernseite. Viel Weißraum, wenig Farbe, Farbe nur mit Bedeutung (bester Weg, Fehlwurf, Lernstand). Heller und dunkler Modus. Keine Emojis, Icons nur für Navigation und wo ein Text allein nicht reicht. Die konkrete Ausarbeitung ist Sache des Erbauers mit dem Skill `frontend-design`.

## Tests

- Regelwerk: Jeder Weg summiert sich auf den Rest und endet auf Doppel oder Bull. Jeder checkbare Rest hat einen Weg, jede Bogey-Zahl eine Bogey-Karte mit Stellwurf. Bekannte Standardwege kommen heraus. Fehlwurf-Karten rechnen richtig.
- Wiederholung: Reihenfolge der Freischaltung, Tagesgrenze, „Nochmal" in derselben Sitzung.
- Konten: Wartende und gesperrte Nutzer kommen nicht an Lernseiten, Nicht-Betreiber nicht in die Verwaltung.

## Offen für den Erbauer

- Gewichtung im Regelwerk und Wahl der Referenztabelle.
- Wortlaut der Begründungen.
- Genaues Datenbankschema.
- Visuelle Ausarbeitung.
