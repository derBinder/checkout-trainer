# Serie mit einem Tag Pause

## Ziel

Ein einzelner ausgelassener Tag soll die tägliche Serie nicht sofort beenden. Die Serie liegt einen Tag „auf Eis“. Öffnet man die App am Tag nach der Lücke, sieht man, dass sie pausiert ist. Lernt man an diesem Tag, läuft sie weiter. So verliert niemand wegen eines einzigen Tages die Motivation, und die Serie bleibt trotzdem im Kern täglich.

- Ziele: ein ausgelassener Tag höchstens einmal pro 7 Tage wird überbrückt; die Pause ist auf „Heute“ sichtbar und erklärt.
- Keine Ziele: einen dauerhaften Hinweis auf die Regel geben, einen Hinweis „Serie beendet“ zeigen, Pausen ansparen oder von Hand einsetzen.
- Fehlschlag, auch wenn es technisch läuft: Wer dauerhaft nur jeden zweiten Tag lernt, behält eine Serie.

## Regel

- Die Serie zählt Berliner Tage mit mindestens einer Bewertung, so wie bisher.
- Ein einzelner Tag ohne Bewertung wird überbrückt, wenn der Tag davor eine Bewertung hat und in den 7 Tagen danach kein anderer Tag überbrückt wurde. Zwei überbrückte Tage liegen also mindestens 7 Tage auseinander (Tag 3 und Tag 10 sind erlaubt, Tag 3 und Tag 9 nicht).
- Zwei Tage ohne Bewertung hintereinander beenden die Serie immer.
- Ein überbrückter Tag zählt nicht mit: 5 Tage, ein Tag Pause, ein Lerntag ergeben 6.
- Die Zählung läuft rückwärts von heute und überbrückt bei zu dicht liegenden Lücken die jüngere. Sie gilt rückwirkend für alle vorhandenen Bewertungen.
- Hat heute noch keine Bewertung, beginnt die Zählung wie bisher bei gestern. Heute ist noch keine Lücke.

**Pausiert** heißt: Heute und gestern haben keine Bewertung, vorgestern hat eine, und gestern wird überbrückt. Das ist am ersten Tag nach einer Lücke immer der Fall, weil vor ihr keine jüngere Überbrückung liegen kann. Mit der ersten Bewertung heute endet die Pause.

## Anzeige

- Das Schildchen (`StreakChip`) zeigt in der Pause die Zahl weiter an, aber gedämpft (`bg-muted text-muted-foreground`) und mit dem Zusatz „pausiert“: „5 Tage Serie · pausiert“ bzw. „5-day streak · paused“. Das gilt auf „Heute“ und „Statistik“.
- Nur auf „Heute“ und nur während der Pause steht unter der Überschrift ein Hinweis:
  „Deine Serie ist pausiert. Lerne heute, damit sie weiterläuft. Einen ausgelassenen Tag pro Woche fängt die Serie ab.“
  Englisch: „Your streak is paused. Study today to keep it going. The streak absorbs one missed day per week.“
- Alle Texte liegen in `src/i18n/dictionaries/` (de, en).

## Ansätze

- **Gewählt: die Zählregel in `streakOf` erweitern** (`src/lib/stats.ts`). `summarize` liefert die Serie als `{ days, paused }`. Dafür braucht es keine Migration und keine neuen Daten, die Regel ist mit reinen Unit-Tests prüfbar und wirkt sofort auf die vorhandenen Bewertungen.
- Verworfen: den Serienstand in der Datenbank speichern. Das bräuchte eine Migration und eine Schreiblogik beim Bewerten und schafft eine zweite Quelle, die mit den Bewertungen auseinanderlaufen kann.
- Verworfen: den Pausenzustand im Client berechnen. Das widerspricht dem Aufbau, denn die Lerndaten kommen aus Server-Datenbausteinen.

## Umsetzung (dem Umsetzenden überlassen, soweit nicht oben festgelegt)

- `streakOf` in `src/lib/stats.ts` ändern, `Stats.streak` wird `{ days: number; paused: boolean }`. Aufrufer: `today-data.tsx`, `stats-data.tsx`, Tests.
- `StreakChip` bekommt `paused`. Den Hinweis legt der Datenbaustein auf „Heute“ ab. Er liegt hinter einer Suspense-Grenze, weil er Nutzerdaten zeigt. Wo genau er im Baum sitzt (eigener Baustein unter dem Kopf oder am Anfang von `TodayOverview`), entscheidet der Umsetzende. Das Gerüst ohne Daten bleibt unverändert.
- Tests zuerst: Lücke überbrückt, zwei Lücken im Abstand 7 bzw. 6, zwei Fehltage hintereinander, Pausenzustand (gestern leer, vorgestern Bewertung), Pause endet mit Bewertung heute, Berliner Tagesgrenze. Komponententests für das gedämpfte Schildchen und den Hinweis.
