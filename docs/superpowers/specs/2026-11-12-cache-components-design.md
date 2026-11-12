# Sofortige Seitenwechsel mit Cache Components: Design

Stand: 2026-11-12

## Worum es geht

Beim Wechsel zwischen den angemeldeten Seiten (Heute, Lernen, Statistik, Einstellungen, Verwaltung) bleibt die alte Seite stehen, bis der Server die neue komplett fertig hat. Der Auftraggeber empfindet das als Verzögerung.

Ursache: Jede dieser Seiten wartet auf dem Server zuerst auf die Sitzungsprüfung und dann auf ihre Datenbankabfragen, bevor sie irgendetwas zurückgibt. Es gibt keine Ladezustände, keine Suspense-Grenzen, keine Skeletons. Vieles auf den Seiten ist aber für alle Nutzer gleich und braucht keine Datenbank.

## Ziele

- Ein Seitenwechsel zeigt die neue Seite im Moment des Tippens: das feste Gerüst sofort, Nutzerdaten als Skeleton, die sich füllen, sobald die Daten da sind.
- Das feste Gerüst wird auf dem Server vorgerendert (statische Shell).
- Umsetzung mit Cache Components von Next.js 16 (Entscheidung des Auftraggebers), dazu Partial Prefetching (Entscheidung des Entwerfers).
- Skeletons mit dem shadcn-Baustein „Skeleton".
- Der Zugriffsschutz bleibt mindestens so stark wie heute.

## Nicht-Ziele

- Kein Zwischenspeichern von Nutzerdaten, weder im Browser (`use cache: private`) noch auf dem Server (`use cache` mit Nutzer-ID). Lerndaten und Sitzungsstatus werden bei jedem Seitenwechsel frisch geladen. Grund: Der Stand soll immer stimmen, und eine Sperrung durch den Betreiber soll sofort wirken. (Entscheidung des Entwerfers, vom Auftraggeber bestätigt.)
- Keine automatischen Browser-Tests mit Playwright. Das wäre eine neue Abhängigkeit.
- Keine Verhaltensänderung an den Seiten außerhalb des angemeldeten Bereichs (Start, Anmelden, Registrieren, Warten, Impressum, Datenschutz). Technische Anpassungen, die Cache Components dort verlangt, sind erlaubt, solange sich für den Nutzer nichts ändert. `/warten` liest die Sitzung und bleibt blockierend (`instant = false`). Ob das Root-Layout mit Darstellungs-Skript, Analytics und Speed Insights ohne Anpassung baut, klärt der Erbauer im ersten Schritt.
- Keine Änderung an Verhalten, Texten, Daten oder Server Actions.

## Anti-Ziele

Die Änderung ist gescheitert, auch wenn sie technisch läuft, wenn:

- Inhalte beim Füllen der Skeletons springen (Layout-Verschiebung),
- ein nicht angemeldeter oder gesperrter Nutzer Nutzerdaten zu sehen bekommt, auch nur kurz,
- Daten veraltet angezeigt werden (zum Beispiel ein alter Lernstand nach einer Sitzung),
- der Seitenwechsel weiterhin erst nach dem Laden der Daten passiert,
- die Regeln aus `CLAUDE.md` verletzt werden (deutsche Oberfläche, keine Emojis, keine Tailwind-Klassen mit freien Werten).

## Was fest ist und was per Skeleton kommt

Vom Auftraggeber anhand eines Entwurfs bestätigt (`.superpowers/brainstorm/6222-1794471238/content/geruest-und-skeleton.html`).

| Seite | Sofort da (Gerüst) | Per Skeleton (Nutzerdaten) |
|---|---|---|
| Heute | Titel, Beschriftungen „fällig" und „neu", leere Fortschrittsleiste | Serien-Schildchen, die zwei Zahlen, Fortschrittstext mit Prozent, Füllung der Leiste, der Knopf „Lernen" bzw. der Fertig-Zustand mit „Weitere 5 Karten lernen" |
| Lernen | Kopfzeile mit Schließen-Kreuz, leere Fortschrittslinie | Zähler „7 / 20", die Karte (Beschriftung, Zahl, Felder), der Knopf unten |
| Statistik | Titel, die drei Beschriftungen mit Legende, das Raster mit den Zahlen 2 bis 170 in neutraler Darstellung | Serien-Schildchen, die drei Zähler, die Einfärbung der Rasterfelder, die Liste der schwierigsten Reste, die Inhalte der Detailansicht je Rest |
| Einstellungen | Titel, alle Abschnittsüberschriften, Darstellungs-Umschalter, die Formulare für Passwort, Abmelden | Der gespeicherte Wert „Neue Karten pro Tag", der Abschnitt „Konto löschen" (für das Betreiberkonto ausgeblendet) |
| Verwaltung | Titel | Die Nutzerliste (nur für den Betreiber, sonst Umleitung auf `/heute`) |
| Navigation | Die drei Einträge Heute, Statistik, Einstellungen | Der vierte Eintrag „Verwaltung" für das Betreiberkonto |

Regeln für Skeletons:

- Jedes Skeleton hat die Maße des späteren Inhalts im Normalfall. Beim Füllen verschiebt sich im Normalfall nichts. Wo der Inhalt je nach Nutzer verschieden hoch ist, gilt (Entscheidung des Entwerfers): Das Skeleton bildet den häufigsten Zustand ab (Heute: zwei Zahlen und Knopf „Lernen"). Listen mit wechselnder Länge (schwierigste Reste, Nutzerliste) stehen am Seitenende und reservieren keine feste Höhe. Eine Verschiebung ist nur hingenommen im selteneren Zustand (Heute im Fertig-Zustand, Einstellungen des Betreibers ohne „Konto löschen") und am Seitenende. Über dem ersten Bildschirm darf im Normalfall nichts springen.
- Ruhige Darstellung in der Flächenfarbe des Designs, mit den vorhandenen Rundungen. Pulsieren nur, wenn der Nutzer Animationen nicht reduziert hat.
- Skeletons sind für Screenreader versteckt. Der ladende Bereich ist als beschäftigt gekennzeichnet (`aria-busy`).
- Das Raster in der Statistik zeigt im Gerüst alle Felder als „neu" (umrandet). Die Einfärbung kommt mit den Daten, ohne dass sich Größe oder Position ändern.
- Der Eintrag „Verwaltung" erscheint beim Betreiber nachträglich. Diese eine Verschiebung in der Navigation wird hingenommen (Entscheidung des Entwerfers: Sie betrifft nur das Betreiberkonto).

## Zugriffsschutz

Heute prüft das Layout der angemeldeten Seiten die Sitzung, bevor irgendetwas gerendert wird, und jede Seite prüft noch einmal selbst. Mit einer vorgerenderten Shell kann das Layout nicht mehr vor dem Rendern warten. Neue Aufteilung:

1. **Schnelle Vorprüfung in `proxy.ts`** (Entscheidung des Entwerfers): Für die fünf angemeldeten Routen und für `/warten` prüft sie nur, ob ein Sitzungs-Cookie vorhanden ist. Fehlt es, leitet sie sofort auf `/anmelden` um, bevor eine Shell ausgeliefert wird. Keine Datenbankabfrage. Sie ist Komfort, nicht Schutz.
2. **Echte Prüfung bei den Daten:** Jeder Baustein, der Nutzerdaten lädt, ruft `requireActiveUser()` (bzw. `requireAdmin()`) selbst auf, bevor er etwas lädt. Das ist heute schon so und bleibt die maßgebliche Stelle. Die Prüfung liest den Status weiterhin frisch aus der Datenbank.
3. **Das Gerüst enthält keine Nutzerdaten und keine Lerninhalte.** Es ist für alle gleich und darf deshalb vor der Prüfung ausgeliefert werden. Die Vorprüfung sieht nur, dass irgendein Cookie da ist, das Gerüst erreicht also auch wartende und gesperrte Konten. Deshalb bleiben auch die Karteninhalte (Wege, Begründungen, Alternativen, Stellwürfe) hinter der echten Prüfung, so wie heute: Die Detailansicht der Statistik und die Karten der Lernsitzung werden erst im Datenbaustein geladen. (Entscheidung des Entwerfers: nichts wird ausgeliefert, was heute ein aktives Konto braucht.)
4. **Wartende und gesperrte Nutzer** haben ein Cookie und passieren die Vorprüfung. Sie sehen kurz das Gerüst und werden dann aus dem Datenbaustein heraus auf `/warten` umgeleitet. Daten sehen sie nie.
5. **Verwaltung leitet Nicht-Betreiber um** (Entscheidung des Auftraggebers, 2026-11-12): Beim Bau hat sich gezeigt, dass Cache Components bei jeder Route zuerst das vorgerenderte äußere Gerüst ausliefert. Der Status steht damit auf 200, bevor eine Prüfung läuft, eine echte 404-Antwort ist nicht mehr möglich. Die Verwaltung bleibt deshalb im gemeinsamen Bereich und wird wie die anderen Seiten zerlegt. Ihr Datenbaustein prüft `requireAdmin()` vor dem Laden der Nutzerliste. Ein angemeldeter Nicht-Betreiber wird auf `/heute` umgeleitet. Sollte die Umleitung nicht möglich sein, erscheint die Fehlerseite mit Status 200. Daten sieht er in keinem Fall.
6. **Server Actions** sind nicht betroffen. Sie prüfen wie bisher selbst.

## Technik

- `next.config.ts`: `cacheComponents: true` und `partialPrefetching: true`.
- Die Sitzungsprüfung im Layout `src/app/(app)/layout.tsx` entfällt als blockierender Aufruf. Der Betreiber-Eintrag der Navigation wird in einem eigenen Baustein hinter einer Suspense-Grenze geladen.
- Jede Seite wird in ein Gerüst (ohne Datenzugriff) und Datenbausteine hinter Suspense-Grenzen zerlegt. Die Skeletons sind die Rückfall-Inhalte dieser Grenzen.
- Zeitabhängiges (`new Date()` für die Tagesgrenze) darf nicht im vorgerenderten Gerüst stehen und wandert in die Datenbausteine.
- Kein `use cache`, kein `use cache: private`, kein `use cache: remote` für Nutzerdaten.
- Baustein `src/components/ui/skeleton.tsx` über die shadcn-CLI, angepasst an die Tokens des Designs (keine freien Tailwind-Werte).
- Vorgehen nach der Next.js-Anleitung zur schrittweisen Umstellung: Schalter einschalten, alle angemeldeten Routen zunächst mit `instant = false` vom sofortigen Wechsel ausnehmen, damit die App baut und läuft, dann Route für Route umstellen und die Ausnahme entfernen. Am Ende trägt nur noch `/warten` die Ausnahme.
- Maßgeblich ist die mitgelieferte Dokumentation unter `node_modules/next/dist/docs/` (vor allem `migrating-to-cache-components.md`, `authentication-with-cache-components.md`, `instant-navigation.md`, `adopting-partial-prefetching.md`), nicht das Gedächtnis.
- Der Bau bei Vercel (`scripts/vercel-build.sh`) bleibt unverändert. Der lokale Bau darf weiterhin keine Datenbank öffnen.

## Wie geprüft wird

- Die Prüfhinweise von Next.js in der Entwicklung zeigen für die umgestellten Routen keine blockierende Stelle mehr.
- Die Build-Ausgabe weist die vier umgestellten Routen (Heute, Lernen, Statistik, Einstellungen) als teilweise vorgerendert aus.
- Alle bestehenden Tests bleiben grün. Neue Tests für alles, was sich als reine Logik herauslösen lässt (zum Beispiel die Entscheidung der Vorprüfung).
- Im Browser bei Handybreite, hell und dunkel, mit gedrosselter Verbindung: Beim Tippen auf einen Navigationseintrag erscheint das Gerüst sofort, Skeletons füllen sich ohne Springen.
- Zugriff: ohne Cookie sofortige Umleitung, mit Cookie eines wartenden oder gesperrten Kontos Umleitung auf `/warten` ohne Daten und ohne Lerninhalte in der Antwort (im ausgelieferten HTML und in den nachgeladenen Daten nach einem Karteninhalt suchen), Nicht-Betreiber auf `/verwaltung` werden auf `/heute` umgeleitet und erhalten keine Nutzerliste.
- Nach einer Lernsitzung zeigen Heute und Statistik den neuen Stand.

## Auslieferung

Eigener Branch von `develop`. Bereitstellung in die Produktion erst nach Zustimmung des Auftraggebers.

## Offen für den Erbauer

- Wo genau die Suspense-Grenzen liegen und ob zusätzlich `loading.tsx`-Dateien gebraucht werden.
- Der Name des Sitzungs-Cookies und der passende Helfer von Better Auth für die Vorprüfung.
- Die genaue Form der Skeletons je Baustein.
- Die Reihenfolge der Routen bei der Umstellung.
