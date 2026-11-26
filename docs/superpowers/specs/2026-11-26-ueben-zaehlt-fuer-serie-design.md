# Üben zählt für die Serie

Refs #81

## Ziel

Ein Tag, an dem der Nutzer mindestens eine Karte oder Aufgabe übt, verlängert die Serie wie ein Tag mit einer Bewertung in der Lernsitzung.

Der Grund: Die Serie zählt bisher nur Tage mit Bewertung. Sind alle Karten begonnen und die Abstände lang, ist an den meisten Tagen nichts fällig. Dann lässt sich keine Bewertung abgeben und die Serie endet, obwohl der Nutzer weiter trainiert.

- Ziele: Üben zählt immer, auch wenn Karten fällig sind. Es zählt in beiden Übungen, „Wege“ und „Rechnen“.
- Keine Ziele: eine Rückmeldung oder Nachricht beim Verlängern, eine Statistik über das Üben, Änderungen an Fälligkeiten oder am Lernstand.
- Fehlschlag, auch wenn es technisch läuft: Üben verändert „sicher seit“, die schwersten Reste oder den Lernplan. Oder die Übung zeigt wegen des Speicherns eine Meldung oder stockt.

## Wege

- **Eigene Tabelle für Übungstage.** Gewählt. Eine Zeile je Nutzer und Berliner Tag, die Serie liest Lerntage und Übungstage zusammen.
- **Übungen ins Bewertungsprotokoll `review_log` schreiben.** Verworfen. Die Statistik rechnet daraus „sicher seit“ (`rest-dates.ts`) und die schwersten Reste.
- **Letzten Übungstag am Nutzer speichern.** Verworfen. `streakOf` braucht alle Tage, nicht nur den letzten.

## Verhalten

Vom Auftraggeber entschieden:

- Die erste geübte Karte oder Aufgabe einer Runde verlängert die Serie. Die Runde muss nicht zu Ende gespielt werden.
  - „Wege“: die erste Bewertung mit „Nochmal“ oder „Weiter“.
  - „Rechnen“: die erste beantwortete Aufgabe.
- Die Serie wird still verlängert, wie in der Lernsitzung. Es gibt keine Meldung, auch nicht bei einem Fehler.

Festlegungen von Claude:

- Scheitert das Speichern, läuft die Übung normal weiter. Der Tag zählt dann nicht.
- Je Runde wird höchstens einmal gespeichert. Mehrere Runden am selben Tag ergeben eine Zeile.
- „Fortschritt zurücksetzen“ löscht auch die Übungstage. Es setzt schon heute die Serie zurück.
- Das Löschen des Kontos entfernt die Übungstage über den Fremdschlüssel.

## Daten

Neue Tabelle `practice_day` in `src/lib/db/schema.ts`, Migration mit `db:generate`:

| Spalte | Typ | Hinweis |
|---|---|---|
| `user_id` | text | Fremdschlüssel auf `user.id`, `onDelete: cascade` |
| `day` | text | Berliner Tag `YYYY-MM-DD` aus `dayKey(now)` |

Der Primärschlüssel ist `(user_id, day)`. Geschrieben wird mit `onConflictDoNothing`. Die Migration ist rein additiv.

## Umsetzung

- **Speichern.** Eine Server Action für die Übungsseite prüft die Sitzung wie die Bewertungs-Action und schreibt den heutigen Tag. Die beiden Runden rufen sie beim ersten Ereignis auf und warten nicht auf das Ergebnis.
- **Lesen.** `loadReviewDays` liefert Lerntage und Übungstage zusammen. Die Statistik übergibt `summarize` die Übungstage zusätzlich zu den Bewertungen. `streakOf` bleibt unverändert.
- **Heute-Seite.** Der Hinweis erscheint immer, wenn die Serie pausiert ist. Die Ausnahme für „nichts zu tun und alle Karten begonnen“ entfällt, weil Üben jetzt immer möglich ist.
- **Zurücksetzen.** `resetProgress` löscht `practice_day` in derselben Transaktion.

Nach einer Übung zeigen „Heute“ und „Statistik“ das Schildchen als „heute verlängert“. Das wird im Browser geprüft.

## Texte

Nur `today.streakPaused` ändert sich. Geprüft mit unslop-ui: Der zweite Satz verliert den Nachsatz, der den ersten wiederholt.

| Sprache | Alt | Neu |
|---|---|---|
| de | Lerne heute, damit deine Serie weiterläuft. Pro Woche darfst du einen Tag auslassen, ohne dass die Serie endet. | Lerne oder übe heute, damit deine Serie weiterläuft. Pro Woche darfst du einen Tag auslassen. |
| en | Study today to keep your streak going. You can skip one day per week without ending the streak. | Study or practice today to keep your streak going. You can skip one day per week. |

„Lerne“ und „übe“ sind die Wörter der beiden Knöpfe auf der Heute-Seite. Der Text zum Zurücksetzen („… und deine Serie werden gelöscht“) bleibt richtig.

## Tests

- `practice_day`: Der erste Aufruf schreibt eine Zeile, der zweite am selben Tag keine weitere. Ohne aktive Sitzung wird nichts geschrieben.
- Serie: Ein reiner Übungstag verlängert sie. Ein Übungstag schließt die Lücke zwischen zwei Lerntagen.
- Statistik: Übungstage ändern nur die Serie, nicht die Zähler und nicht die schwersten Reste.
- Runden: Die erste Karte und die erste Aufgabe lösen genau einen Aufruf aus. Ein Fehler der Action zeigt keine Meldung.
- Heute-Seite: Der Hinweis erscheint bei pausierter Serie auch ohne fällige Karten.
- `resetProgress` löscht die Übungstage.

## Offen für die Umsetzung

- Name und Ort der Server Action
- Wie die Statistik die Übungstage lädt, als eigene Abfrage oder in `loadStatsData`
