# Ring nach jedem Dart zurück auf S: Entwurf

Stand: 2026-11-13

Kleine Änderung an der Wegeingabe aus [2026-11-12-weg-eingeben-design.md](2026-11-12-weg-eingeben-design.md).

## Worum es geht

Beim Eingeben eines Wegs springt der Ring heute nach einem Dart von selbst auf D, wenn der verbleibende Rest ein gerades Doppel von 2 bis 40 ist. Auf der 33 tippt man S1, es bleiben 32, und der Ring steht auf D. Damit verrät das Tastenfeld, dass als Nächstes ein Doppel kommt, und Wege lassen sich leichter erraten.

Neu: S ist immer die Vorgabe. Nach jedem eingegebenen Dart steht der Ring wieder auf S (Entscheidung des Nutzers).

## Ziele

- Das Tastenfeld gibt keinen Hinweis auf den Weg.
- S ist zu Beginn jeder Karte und nach jedem Dart gewählt.

## Nicht-Ziele

- Keine Änderung am Aussehen des Tastenfelds.
- Keine Änderung am Start jeder Karte auf S (gilt schon heute).

## Anti-Ziele

- Ein Ring, der sich abhängig vom Rest oder vom Weg von selbst umstellt.

## Ansätze

- **Im Eingabe-Reducer `src/components/study/route-input.ts` (gewählt):** Dort liegt die ganze Ringlogik, das Tastenfeld stellt nur dar. Eine Stelle, rein testbar ohne React.
- **Im Tastenfeld `route-pad.tsx` nach jedem Tipp einen Ringwechsel auslösen:** verworfen, verteilt die Ringlogik auf zwei Stellen und macht das darstellende Tastenfeld zustandsbehaftet.

Der Nutzer hat den Entwurf mit dem gewählten Ansatz freigegeben.

## Verhalten

- Nach jedem eingegebenen Dart steht der Ring auf S, egal ob über 1 bis 20, 25 oder Bull eingegeben.
- Der automatische Sprung auf D entfällt, ebenso `isDoubleRest`.
- Löschen stellt weiterhin den Ring wieder her, der vor dem gelöschten Dart gewählt war. Wer sich bei T19 vertippt, löscht und tippt direkt 20. Das verrät nichts, denn T war die eigene Wahl.
- In Kauf genommen: Jedes T und D kostet einen Tipp mehr (T20 · T20 = T, 20, T, 20).
- Die Änderung gilt überall, wo das Tastenfeld genutzt wird; es gibt nur dieses eine.

## Dazu

- Tests zuerst: Ring steht nach jedem Dart auf S (auch auf Resten wie 100 nach T20 und 33 nach S1), Löschen bringt den gewählten Ring zurück. Die Tests zu `isDoubleRest` und zum Sprung auf D entfallen.
- Kommentar am Kopf von `route-input.ts` anpassen.
- Im Entwurf zur Wegeingabe die Punkte „Der Ring bleibt gewählt, bis man ihn wechselt“ und „Automatischer Ringwechsel“ durch das neue Verhalten ersetzen, mit Verweis auf diesen Entwurf.

## Dem Umsetzer überlassen

- Ob `ringsBefore` in seiner heutigen Form bleibt oder sich vereinfachen lässt, solange Löschen den Ring vor dem gelöschten Dart wiederherstellt.
