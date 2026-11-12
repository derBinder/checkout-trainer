# Mehrsprachigkeit (Deutsch und Englisch): Entwurf

Stand: 2026-11-12

## Worum es geht

Die App ist offen für jeden, bisher aber nur auf Deutsch. Künftig gibt es sie auf Deutsch und Englisch. Die Sprache steht vorne in jeder Adresse (`/de/…`, `/en/…`) und lässt sich umschalten: Angemeldete wechseln in den Einstellungen, Besucher ohne Konto über einen kleinen Schalter in der Fußzeile der öffentlichen Seiten.

Damit ist der Punkt „Keine Mehrsprachigkeit“ aus den Nicht-Zielen des ursprünglichen Entwurfs (`2026-11-11-checkout-trainer-design.md`) überholt.

## Reihenfolge

Die Mehrsprachigkeit wird erst gebaut, wenn der Zweig `feat/weg-eingeben` (Weg selbst eingeben, Entwurf `2026-11-12-weg-eingeben-design.md`) fertig und in `develop` gemergt ist (Entscheidung des Auftraggebers). Grundlage ist also der Stand von `develop` nach diesem Merge, nicht der heutige.

Die Umstellung umfasst damit auch alle Texte dieser Funktion: Tastenfeld (`route-pad`), Eingabe auf dem Fragebildschirm (`study-question`), Ergebnis beim Aufdecken (`verdict`, `src/lib/darts/judge.ts`) sowie die dort eingeführten Kurzformen der Erklärungen auf der Karte („Nur S20“, „101: T17 · Bull“, „Stellen: S20, Rest 32“, „Mit 2 Darts“). Wo dieser Entwurf Beispiele aus dem heutigen Stand nennt, gelten sinngemäß die Texte nach dem Merge.

## Ziele

- Jede Seite, jede Meldung und jede Karte ist vollständig auf Deutsch oder vollständig auf Englisch. Auf keinem Bildschirm stehen beide Sprachen gemischt, mit Ausnahme der Sprachnamen im Umschalter.
- Ein Besucher sieht beim ersten Aufruf die passende Sprache, ohne etwas einstellen zu müssen.
- Die Sprachwahl bleibt auf dem Gerät erhalten.
- Das vorgerenderte Gerüst jeder Seite bleibt erhalten, einmal je Sprache. Die App wird nicht langsamer.

## Nicht-Ziele

- Keine weitere Sprache. Der Aufbau soll eine dritte Sprache aber nicht verbauen.
- Die Sprache wird nicht im Konto gespeichert, sondern gilt pro Gerät, wie Hell/Dunkel.
- Alte Adressen ohne Sprache oder mit deutschen Seitennamen (`/heute`, `/de/heute`) brauchen keine Sonderbehandlung (Entscheidung des Auftraggebers). Wer so eine Adresse aufruft, wird wie bei jeder Adresse ohne Sprache weitergeleitet (siehe unten) und landet danach gegebenenfalls auf „nicht gefunden“.
- Der Inhalt von Impressum und Datenschutz wird nicht übersetzt. Er ist ein Platzhalter und bleibt Sache des Betreibers. Überschrift, Seitentitel und Links werden übersetzt.
- Keine Übersetzung von Fehlermeldungen, die nur in Server-Logs landen (etwa `throw new Error("Ungültiges Feld …")` in `src/lib/darts/model.ts`).

## Anti-Ziele

Die Umsetzung ist gescheitert, auch wenn sie technisch funktioniert, wenn:

- eine Seite langsamer lädt oder das sofortige Gerüst verliert,
- irgendwo Deutsch und Englisch gemischt erscheinen oder ein deutscher Rest im Englischen stehen bleibt,
- englische Fachbegriffe nach Übersetzung klingen statt nach Darts,
- der Sprachschalter die Oberfläche unruhiger macht (er ist nicht in der Navigation),
- ein neuer kostenpflichtiger Dienst oder Tarif nötig wird.

## Adressen

Die Sprache ist das erste Segment jeder Seitenadresse. Die Seitennamen sind in beiden Sprachen gleich und englisch (Entscheidung des Auftraggebers):

| bisher | neu |
|---|---|
| `/` | `/de`, `/en` |
| `/anmelden` | `/de/sign-in`, `/en/sign-in` |
| `/registrieren` | `/…/sign-up` |
| `/warten` | `/…/pending` |
| `/heute` | `/…/today` |
| `/lernen` | `/…/study` |
| `/statistik` | `/…/stats` |
| `/einstellungen` | `/…/settings` |
| `/verwaltung` | `/…/admin` |
| `/impressum` | `/…/imprint` |
| `/datenschutz` | `/…/privacy` |

Die englischen Namen in dieser Tabelle sind mein Vorschlag. Der Auftraggeber hat nur festgelegt, dass sie englisch sind.

`/api/auth/…` bleibt ohne Sprache.

Die Ordner unter `src/app/` werden entsprechend umbenannt und unter `src/app/[lang]/` verschoben, das Root-Layout wandert nach `src/app/[lang]/layout.tsx`. Gültige Werte für `lang` sind `de` und `en`, jeder andere Wert führt zu „nicht gefunden“. Mit Cache Components braucht das Root-Layout `generateStaticParams` mit beiden Sprachen (siehe `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-root-params.md`). Damit rendert Next das Gerüst je Sprache vor.

## Welche Sprache ein Besucher bekommt

Ruft jemand eine Seitenadresse ohne gültige Sprache auf, etwa `/` oder `/today`, leitet `proxy.ts` ihn auf dieselbe Adresse mit Sprache um (`/en/today`). Die Sprache ergibt sich so:

1. Die zuletzt im Umschalter gewählte Sprache, gespeichert in einem Cookie.
2. Sonst die Browsersprache (`Accept-Language`): Steht dort Deutsch vor Englisch, gilt Deutsch. Steht Englisch vor Deutsch oder fehlen beide, gilt Englisch.
3. Englisch ist also die Vorgabe für alle, deren Browser nicht Deutsch bevorzugt (Entscheidung des Auftraggebers).

Die genaue Auswertung von `Accept-Language` (Gewichte, Regionen wie `de-AT`) ist meine Entscheidung und folgt der Regel „die erste Sprache aus de und en in der Rangfolge des Browsers gewinnt“. Dafür braucht es kein neues Paket.

Das Cookie setzt nur der Umschalter, nicht schon der Besuch einer Seite. Wer über einen geteilten `/en/…`-Link kommt, sieht Englisch, ohne dass sich seine gespeicherte Wahl ändert. Interne Links und Weiterleitungen behalten die Sprache der aktuellen Seite. Das Cookie zählt deshalb nur bei Adressen ohne Sprache.

`proxy.ts` bleibt ohne Datenbank (Regel aus `CLAUDE.md`). Neben der Sprachweiterleitung behält es die Cookie-Vorprüfung der Anmeldung. Die geschützten Bereiche werden nach dem Sprachsegment geprüft: `/en/today` ohne Sitzungs-Cookie führt nach `/en/sign-in`. Sein Matcher umfasst künftig alle Seitenadressen außer `/api`, `/_next` und statischen Dateien. Die Weiterleitung auf die Sprache ist wie die Anmeldeweiterleitung ein 307.

## Der Umschalter

Entwürfe hat der Auftraggeber im Browser gesehen und gewählt.

- **Einstellungen:** Ein eigener Abschnitt „Sprache“ / „Language“ direkt unter „Darstellung“, im selben Stil wie der Hell/Dunkel-Schalter (`ThemeSwitch`): zweiteilig, echte Radio-Knöpfe, „Deutsch“ und „English“.
- **Öffentliche Seiten:** Ein kleiner zweiteiliger Schalter „DE | EN“ rechts in der Fußzeile, die aktive Sprache gelb hinterlegt (Variante B). Er steht auf der Startseite, auf Anmelden und Registrieren. Dass er auch auf der Warteseite (`pending`) steht, ist meine Entscheidung, weil wartende Konten die Einstellungen nicht erreichen. Anmelden, Registrieren und Warteseite haben heute keine Fußzeile und bekommen dafür eine schlichte.
- Die Sprachnamen stehen immer in ihrer eigenen Sprache und werden nie übersetzt.
- Wechseln setzt das Cookie und öffnet dieselbe Seite in der anderen Sprache. Ungespeicherte Eingaben auf der Seite gehen dabei verloren. Das ist hinnehmbar, weil der Schalter auf keiner Seite mit längeren Formularen neben dem Formular steht. Auf Anmelden und Registrieren gilt das auch für halb ausgefüllte Felder, Passwortfelder ohnehin.
- Die angezeigte Auswahl folgt der Adresse, nicht dem Cookie. So bleibt das Gerüst je Sprache statisch.

## Texte

- Alle Texte der Oberfläche liegen in einem Wörterbuch je Sprache. Ein Test (oder der Typ-Check) stellt sicher, dass beide Wörterbücher dieselben Einträge haben.
- Dazu gehören auch: Seitentitel und Beschreibung (`metadata`), `<html lang>`, `aria-label`s und andere unsichtbare Texte, Skeleton-Beschriftungen, Fehlerseiten (`error.tsx`, `global-error.tsx`), die Fehlermeldungen aus `src/lib/auth/constants.ts`, `src/components/auth/auth-error.ts` und `src/lib/validation/`, Rückmeldungen aus Server Actions und Datumsangaben in der Verwaltung.
- Englisch ist britisches Englisch, weil es die Sprache des Profi-Darts ist („treble“, nicht „triple“). Das ist meine Entscheidung.
- Fachbegriffe heißen so, wie englischsprachige Dartspieler sie nennen (Vorgabe des Auftraggebers): „checkout“, „finish“, „leave“, „setup shot“, „bogey numbers“, „double“, „treble“, „bull“. Feldnamen (`T19`, `D12`, `S20`, `Bull`) bleiben in beiden Sprachen gleich.
- Die englischen Texte schreibt der Umsetzer. Der Auftraggeber prüft sie am Ende im Browser.
- `src/lib/time.ts` nutzt `Intl` nur für die Tagesgrenze und bleibt unverändert. Sichtbare Datumsangaben richten sich nach der Sprache (`de-DE` beziehungsweise `en-GB`).

## Begründungen und Hinweise auf den Karten

Die Begründungen erzeugt heute der Generator (`reasonFor` in `src/lib/darts/cards.ts`) als fertige deutsche Sätze und schreibt sie in `src/data/cards.generated.json`. Künftig hält der Generator nur noch fest, welcher Fall vorliegt, mit den nötigen Werten, etwa „einziger Weg“, „direkt aufs Doppel“, „zwischen 10 und 6 zielen“, „bleibt bei Single 19 auf einem Finish“, „bleibt bei Single 20 auf Bull“, „endet auf D16, viermal halbierbar“, „üblicher Weg nach Tabelle“. Den Satz bildet erst die Anzeige in der jeweiligen Sprache. Das ist meine Entscheidung. Sie hält die Kartendatei einsprachig und die Sätze an einer Stelle.

Dasselbe gilt für die Texte, die erst beim Anzeigen entstehen (`src/components/study/card-view.ts` mit den Kurzformen aus `feat/weg-eingeben`, etwa „Kein Finish möglich. Stellen auf Rest 62.“ oder „Nur S20“), und für die Rest-Details der Statistik, die dieselben Texte nutzen.

`cards.generated.json` wird danach mit `npm run generate:cards` neu erzeugt. Der vorhandene Test, der Datei und Generator vergleicht, bleibt. Die Karten-IDs ändern sich nicht, der Lernstand der Nutzer bleibt also gültig.

## Was gleich bleibt

- Datenbank und Schema: keine Änderung.
- Lernlogik, Warteschlange, Bewertungen: keine Änderung.
- Cache-Components-Regeln aus `CLAUDE.md`: Nutzerdaten werden weiter nicht gecacht, jeder Datenbaustein prüft die Sitzung selbst, das Gerüst enthält keine Nutzerdaten und keine Lerninhalte. Neu ist nur, dass es das Gerüst zweimal gibt.

## Was dem Umsetzer überlassen bleibt

- Wie Client-Komponenten an ihre Texte kommen (etwa über einen Provider im Root-Layout oder per Props). `next/root-params` funktioniert nur in Server-Komponenten, nicht in Client-Komponenten oder Server Actions.
- Wie Server Actions und Validierung die Sprache erfahren (Sprache mitschicken oder Codes zurückgeben, die der Client übersetzt).
- Form der Wörterbücher (TypeScript-Objekte oder JSON) und die Gliederung der Schlüssel.
- Ein Hilfsmittel für interne Links mit Sprache, damit kein Link die Sprache vergisst.
- `hreflang`-Verweise (`alternates`) für die öffentlichen Seiten.
- Name des Sprach-Cookies.

## Abschluss

- `CLAUDE.md` wird angepasst: Routen, die Regel „Oberfläche vollständig auf Deutsch“ (wird zu: vollständig auf Deutsch und Englisch, über die Wörterbücher), die Aufgaben von `proxy.ts`, der Aufbau unter `src/app/[lang]/`.
- Prüfung im Browser mit dem Testkonto in beiden Sprachen: jede Seite einmal, Umschalter in den Einstellungen und auf den öffentlichen Seiten, Erstaufruf von `/` mit deutscher und mit anderer Browsersprache.
