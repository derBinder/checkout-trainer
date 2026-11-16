# Statistik: Datum „gelernt am“ und „sicher seit“

Kurzer Entwurf für eine kleine Änderung.

## Ziel und Grund

Tippt man in der Statistik auf einen Rest, der schon im Lernen oder sicher ist, nennt das Detailblatt ein Datum. Es zeigt, seit wann der Rest gelernt ist und seit wann er sicher sitzt.

```
Lernstand: im Lernen
gelernt am 01.01.2026

Lernstand: sicher
gelernt am 01.01.2026
sicher seit 05.01.2026
```

- Reste mit Stufe „neu“ bekommen keine Zeile.
- Das Datum steht numerisch: `01.01.2026` auf Deutsch, `01/01/2026` auf Englisch (`de-DE` bzw. `en-GB`, Berliner Tag).
- Nicht-Ziele: keine Verlaufsgrafik, keine Datumsangabe im Raster oder in der Liste „Am schwierigsten“, keine Änderung an Lernlogik oder Schema.

## Festlegungen

- „Gelernt am“ ist der Tag, an dem der Rest zum ersten Mal drankam (`card_state.introducedAt` der Rest- bzw. Bogey-Karte).
- „Sicher seit“ ist der Tag der Bewertung, nach der der Rest zuletzt sicher wurde und es seither blieb. „Sicher“ gilt wie bisher: Zustand Review und mindestens 21 Tage Abstand (`levelOf` in `src/lib/stats.ts`).
- Fällt ein sicherer Rest zurück ins Lernen (etwa durch „Nochmal“), verschwindet „sicher seit“. Wird er wieder sicher, steht dort das neue Datum. „Gelernt am“ bleibt.

## Ansätze

- **A: Spalte `known_since` in `card_state`.** `applyReview` pflegt sie, eine Migration füllt Altdaten per Abspielen von `review_log`. Festes Datum, aber Schemaänderung, Eingriff in den Schreibweg und ein Backfill, der selbst getestet werden muss.
- **B: Beim Laden berechnen (gewählt).** Die Statistik lädt ohnehin alle Bewertungen und spielt je Rest- bzw. Bogey-Karte deren Bewertungen durch `rate()` ab. Weniger Code, keine Migration, Altdaten stimmen sofort. Preis: Ändert jemand die FSRS-Parameter, verschieben sich alte Daten stillschweigend. Das wird am Planer in `src/lib/srs/fsrs.ts` vermerkt.

Gewählt wurde B, weil Datenmenge und App klein sind und B den riskantesten Teil von A, den Backfill, vermeidet.

## Umsetzung

- `src/lib/stats.ts`: `summarize` liefert zusätzlich `dates: Record<number, { learned: string; known?: string }>` (Berliner Tage als `YYYY-MM-DD`). Für jeden Rest mit Lernstand gibt es einen Eintrag. `learned` kommt aus `introducedAt`. Dafür bekommt `StatsInput.states` das Feld `introducedAt`. `known` entsteht, indem die Bewertungen der Rest- bzw. Bogey-Karte nach `reviewedAt` (bei Gleichstand nach `id`) abgespielt werden:
  - Wird der Zustand nach einer Bewertung sicher, merkt sich die Funktion deren Tag, falls noch keiner gemerkt ist.
  - Wird er nicht sicher, löscht sie den Tag.
  - Ergibt der Lauf am Ende „nicht sicher“, obwohl der gespeicherte Stand „sicher“ sagt (etwa nach geänderten Parametern), entfällt `known`. Die Zeile fehlt dann, statt ein falsches Datum zu zeigen.
- `src/lib/review/queries.ts`: `loadStatsData` lädt zusätzlich `introducedAt` und die `id` der Bewertungen (für die Reihenfolge bei Gleichstand).
- `src/components/stats/stats-data.tsx`: reicht `dates` an das Blatt weiter. Datumsformat über ein neues `formatDate` neben `formatDay` in `src/lib/forecast.ts` oder in `src/lib/time.ts`.
- `src/components/rest-sheet.tsx`: `RestDetailBody` zeigt unter der Stufe die ein bzw. zwei Zeilen.
- `src/i18n/dictionaries/de.ts` und `en.ts`: `stats.learnedOn(date)` („gelernt am …“ / „learned on …“) und `stats.knownSince(date)` („sicher seit …“ / „known since …“).
- Das Datum ist Nutzerdaten, kein Lerninhalt. Es entsteht erst im Datenbaustein nach `requireActiveUser()`, nie im vorgerenderten Gerüst, und wird nicht gecacht.

## Tests (zuerst schreiben)

- `src/lib/stats.test.ts`: Rest im Lernen (nur `learned`), Rest sicher (beide Daten), Rückfall mit Neuaufbau (neues `known`, altes `learned`), Rückfall ohne Neuaufbau (kein `known`), neuer Rest (kein Eintrag), Abweichung zwischen gespeichertem Stand und Abspielergebnis (kein `known`).
- `src/components/rest-sheet.test.tsx`: Blatt für neu, im Lernen und sicher; deutsch und englisch.
- `src/components/stats/stats-data.test.tsx` und `src/lib/review/review.test.ts`: angepasst an die erweiterten Daten.
- `no-hardcoded-text.test.ts` bleibt grün, weil alle Texte aus dem Wörterbuch kommen.

## Dem Bauenden überlassen

Genaue Typnamen, ob `formatDate` in `forecast.ts` oder `time.ts` landet, und die Abspielschleife als eigene Funktion oder inline in `summarize`.
