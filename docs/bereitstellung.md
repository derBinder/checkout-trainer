# Bereitstellungsvorschlag

Stand: 2026-11-11. Dieses Dokument ist ein Vorschlag. Bis zu deiner Zustimmung wird bei Vercel und Neon nichts angelegt, eingerichtet oder aufgerufen. Alle Prüfungen bis hierher liefen lokal.

Ziel: Die App läuft unter einer Adresse `*.vercel.app`, mit Datenbank bei Neon, ohne dass dich etwas Geld kostet.

## Was du vorher entscheiden musst

1. **Betreiberadresse.** `ADMIN_EMAIL` ist lokal der Platzhalter `betreiber@checkout-trainer.test`. Für die Produktion brauchen wir deine echte Adresse. Sie wird für die Registrierung gesperrt, es werden keine E-Mails dorthin verschickt.
2. **Startpasswort.** `ADMIN_INITIAL_PASSWORD`, mindestens 10 Zeichen. Du nennst es nicht im Chat, sondern gibst es selbst im Terminal ein (siehe Schritt 6). Nach der ersten Anmeldung ändern.
3. **Projektname.** Er bestimmt die Adresse (`<name>.vercel.app`). Vorschlag: `checkout-trainer`. Ist er vergeben, nehmen wir einen anderen.
4. **Impressum und Datenschutz.** `/impressum` und `/datenschutz` sind Platzhalter. Sie müssen mit deinen echten Angaben gefüllt sein, bevor die Adresse öffentlich weitergegeben wird. Das ist deine Aufgabe, vor oder nach der ersten Bereitstellung, aber vor dem Weitergeben.
5. **Nicht kommerziell.** Vercel Hobby ist nur für nicht kommerzielle Nutzung gedacht. Bleibt die App ein privates Lernwerkzeug ohne Einnahmen, passt das. Sobald sie Geld einbringt, wäre ein bezahlter Tarif nötig.

## Reihenfolge der Schritte

Jeder Schritt sagt, was angelegt wird und was er kostet. Keiner braucht eine Zahlungsart.

### Schritt 1: Node-Version festlegen

Was angelegt wird: nichts bei Vercel. `package.json` verlangt `"engines": { "node": ">=24" }`, weil `ts-fsrs` 6 mindestens Node 24 braucht.

Bei Vercel wird im Projekt unter Settings, General, Node.js Version der Wert **24.x** gewählt (Vercel liest zusätzlich `engines`, die ausdrückliche Einstellung ist die sichere Variante). Auf diesem Rechner läuft Node 26; die lokale Version reicht, sie wird nicht hochgeladen.

Kosten: keine.

### Schritt 2: Vercel-Projekt anlegen

Was angelegt wird: ein leeres Vercel-Projekt im Team `team_L16ekIiXaBpa4vlg7m0xQUbg`, Tarif Hobby, ohne Git-Anbindung. Dabei entsteht die Produktionsadresse `<projektname>.vercel.app`.

Ausführung (Vorschlag): Vercel-CLI, Version ausdrücklich angeben, zum Beispiel `npx vercel@<Version> link`. Auf diesem Rechner läuft Safe-chain und blendet Paketversionen aus, die jünger als ein Mindestalter sind. `@latest` liefert deshalb nicht die neueste Version. Wir nehmen eine ausdrücklich genannte, ältere Version und überspringen die Prüfung nicht. Die Anmeldung bei Vercel (`vercel login`) machst du selbst im Browser.

Kosten: keine.

### Schritt 3: Neon über den Vercel Marketplace verbinden

Was angelegt wird: ein Neon-Projekt mit einer Postgres-Datenbank im kostenlosen Tarif (Free), über Vercel, Storage, Marketplace, Neon. Es wird mit dem Vercel-Projekt verbunden und legt dort Umgebungsvariablen an.

Zwei Verbindungsadressen sind wichtig. Beide stehen im Neon-Dashboard unter "Connect":

- **Gepoolt** (Host enthält `-pooler`): für die Vercel-Funktionen. Jede Funktion öffnet kurzlebige Verbindungen, der Pooler bei Neon hält sie zusammen. Diese Adresse wird `DATABASE_URL` in Vercel.
- **Direkt** (ohne `-pooler`): nur für Migration und Betreiberkonto von diesem Rechner. Der Pooler (PgBouncer im Transaktionsmodus) ist für Schemaänderungen nicht geeignet.

Die Integration legt in der Regel beide an (`DATABASE_URL` gepoolt, `DATABASE_URL_UNPOOLED` direkt). Das prüfen wir im Dashboard, bevor wir uns darauf verlassen. Die App liest nur `DATABASE_URL`. Ist sie gesetzt, nutzt `src/lib/db/driver.ts` node-postgres (`pg`), sonst PGlite.

Kosten: keine. Der Free-Tarif von Neon braucht keine Zahlungsart. Er hat Grenzen (Speicher, Rechenzeit, Datenbank schläft bei Nichtnutzung ein und braucht beim ersten Aufruf einen Moment). Für diese App reicht er weit.

### Schritt 4: Umgebungsvariablen bei Vercel setzen

Was angelegt wird: Einträge in den Projekteinstellungen, Geltungsbereich **nur Production**. Preview-Bereitstellungen sollen nicht an die Produktionsdatenbank kommen.

| Variable | Wert |
| --- | --- |
| `DATABASE_URL` | gepoolte Neon-Adresse (setzt die Integration) |
| `BETTER_AUTH_SECRET` | neuer Zufallswert, `openssl rand -base64 32`, nicht der lokale |
| `BETTER_AUTH_URL` | `https://<projektname>.vercel.app` (ohne Schrägstrich am Ende) |
| `ADMIN_EMAIL` | deine echte Betreiberadresse |

`ADMIN_INITIAL_PASSWORD` wird bei Vercel **nicht** gesetzt. Es wird nur einmal beim Anlegen des Betreibers gebraucht (Schritt 6) und gehört nicht dauerhaft in die Laufzeitumgebung. Das ist eine bewusste Abweichung vom ursprünglichen Plan, der es unter den Variablen führte. Wenn du es trotzdem dort haben willst, sag Bescheid.

`ADMIN_EMAIL` muss bei Vercel gesetzt sein, weil die Registrierung diese Adresse sperrt.

Zu `BETTER_AUTH_URL` und erlaubten Herkünften (Better Auth, installierte Version geprüft): Better Auth nimmt `BETTER_AUTH_URL` als Basisadresse und lässt Anfragen nur von dieser Herkunft zu. Für die Produktionsadresse reicht deshalb diese eine Variable. Preview-Bereitstellungen haben jeweils eigene Adressen und würden bei Anmeldung und Registrierung abgelehnt. Darum gilt: Previews zunächst nicht nutzen. Wenn du später welche willst, gibt es `BETTER_AUTH_TRUSTED_ORIGINS` (kommagetrennt, Platzhalter wie `*.vercel.app` werden unterstützt). Ein so breites Muster erlaubt aber jede Vercel-Adresse und wird deshalb nicht empfohlen. Besser ein enges Muster aus Projektname und Team-Kürzel, das wir dann anhand der echten Preview-Adresse festlegen.

Kosten: keine.

### Schritt 5: Datenbankschema einspielen

Was angelegt wird: die Tabellen in der Neon-Datenbank (Migration `drizzle/0000_petite_stepford_cuckoos.sql`: Nutzer, Sitzungen, Konten, Rate-Limit, Lernstand, Bewertungsprotokoll, Einstellungen).

Von diesem Rechner aus, mit der **direkten** Adresse. Der Wert wird nicht in Dateien oder den Verlauf geschrieben:

```bash
read -rs "DIRECT_URL?Direkte Neon-Adresse: "; echo
DATABASE_URL="$DIRECT_URL" npm run db:migrate
```

`drizzle.config.ts` liest `DATABASE_URL` aus der Shell. Ohne diese Variable würde der Befehl stillschweigend die lokale PGlite-Datenbank migrieren. Deshalb immer ausdrücklich setzen. Nach dem Lauf prüfen wir im Neon-Dashboard (Tables), dass die Tabellen da sind.

Kosten: keine.

### Schritt 6: Betreiberkonto anlegen

Was angelegt wird: ein Konto (aktiv, Adminrolle) mit deiner echten Adresse. Der Befehl ist wiederholbar und tut bei vorhandenem Konto nichts.

Wichtig: `scripts/seed-admin.ts` lädt zusätzlich `.env` und `.env.local`. Dort steht lokal der Platzhalter für `ADMIN_EMAIL`. Werte aus der Shell haben Vorrang, deshalb alle Werte ausdrücklich setzen:

```bash
read -rs "DIRECT_URL?Direkte Neon-Adresse: "; echo
read -r "OP_EMAIL?Betreiberadresse: "
read -rs "OP_PW?Startpasswort: "; echo
DATABASE_URL="$DIRECT_URL" ADMIN_EMAIL="$OP_EMAIL" ADMIN_INITIAL_PASSWORD="$OP_PW" npm run db:seed-admin
unset DIRECT_URL OP_EMAIL OP_PW
```

(zsh-Syntax von `read`; die Werte erscheinen weder auf dem Bildschirm noch im Verlauf.) Die Adresse muss dieselbe sein wie `ADMIN_EMAIL` bei Vercel.

Kosten: keine.

### Schritt 7: Direkt bereitstellen, ohne Git

Was angelegt wird: die erste Produktionsbereitstellung. Der Quellcode wird per CLI hochgeladen und bei Vercel gebaut (`npx vercel@<Version> deploy --prod`). Es entsteht keine Verbindung zu GitHub. Ein Push durch den Erbauer findet nicht statt.

Zum Bau bei Vercel:

- `@electric-sql/pglite` steht in `serverExternalPackages` und ist eine normale Abhängigkeit, damit lokal PGlite läuft. In Produktion wird es nie geöffnet (`DATABASE_URL` ist gesetzt), liegt aber im Funktionspaket: Der lokale Build hat gezeigt, dass die Dateien von PGlite (rund 20 MB von rund 23 MB je Funktion) mit eingepackt werden. Das ist weit unter dem Vercel-Limit von 250 MB je Funktion und beeinflusst den Bau nicht, kostet aber etwas Paketgröße und minimal den Kaltstart. Wir ändern daran vor dem ersten Deploy nichts.
- Nach dem ersten Deploy prüfen: Der Build ist grün, die Funktionsgröße in den Bereitstellungsdetails liegt deutlich unter 250 MB, und in den Laufzeit-Logs steht kein PGlite-Fehler. Falls die Größe doch stört, ist `outputFileTracingExcludes` für PGlite die Stellschraube, das wäre eine eigene, kleine Änderung nach Absprache.
- `next build` läuft auf Vercel ohne `DATABASE_URL`-Zugriff auf die Datenbank. Die Seiten rufen beim Bau keine Datenbank ab. Öffentliche Seiten sind statisch, die übrigen dynamisch.

Kosten: keine. Hobby enthält die Bereitstellungen, die Funktionen und die Bandbreite in den Grenzen des Tarifs.

### Schritt 8: Prüfung unter `*.vercel.app`

Wir prüfen gemeinsam, ohne Daten von echten Nutzern anzulegen:

1. Startseite, `/anmelden`, `/registrieren`, `/impressum`, `/datenschutz` laden.
2. Mit der Betreiberadresse anmelden, `/verwaltung` öffnet. Passwort ändern.
3. Ein Testkonto registrieren: landet unter `/warten`, erscheint in `/verwaltung`, wird freigeschaltet, `/heute` und `/lernen` laufen, eine Karte lässt sich bewerten.
4. **Gleichzeitigkeit prüfen** (siehe nächster Abschnitt).
5. **Rate-Limit prüfen** (siehe unten).
6. Testkonto wieder entfernen (siehe Abschnitt Gleichzeitigkeit).
7. Vercel, Logs: keine Fehler.

## Zu den einzelnen technischen Punkten

### Gleichzeitigkeit (Doppelabsendung)

Der Schutz gegen doppelt abgeschickte Bewertungen sperrt in `applyReview` die Nutzerzeile mit `SELECT … FOR UPDATE`. Getestet wurde das bisher nur auf PGlite mit einer einzigen Verbindung. Auf Neon mit mehreren Verbindungen ist es erstmals echt gleichzeitig. Konkrete Prüfung nach dem Deploy, mit dem Testkonto aus Schritt 8.3, bevor es Karten bewertet hat (oder einem zweiten, frischen Testkonto):

1. Die Nutzer-ID des Testkontos aus der Datenbank holen (Neon-Dashboard, Tabelle `user`).
2. Von diesem Rechner mit der **direkten** Adresse zwei identische Bewertungen gleichzeitig ausführen. Die Bewertung wird in der App über eine Server Action gesendet und lässt sich nicht einfach per `curl` doppeln. Deshalb ruft die Prüfung dieselbe Funktion `applyReview` zweimal parallel auf, über denselben Pg-Treiber wie in Produktion (der Pool öffnet dafür zwei echte Verbindungen):

   ```bash
   read -rs "DIRECT_URL?Direkte Neon-Adresse: "; echo
   DATABASE_URL="$DIRECT_URL" TEST_USER_ID="<Nutzer-ID>" npx tsx -e '
   import { db } from "./src/lib/db";
   import { applyReview } from "./src/lib/review/queries";
   import { CARD_ORDER } from "./src/lib/cards";
   import { reviewLog } from "./src/lib/db/schema";
   import { eq } from "drizzle-orm";
   (async () => {
     const id = process.env.TEST_USER_ID!;
     const input = { cardId: CARD_ORDER[0], rating: 3 as const, reps: 0 };
     const user = { id, newPerDay: 10 };
     const results = await Promise.all([
       applyReview(db, user, input, new Date()),
       applyReview(db, user, input, new Date()),
     ]);
     console.log(JSON.stringify(results));
     const rows = await db.select().from(reviewLog).where(eq(reviewLog.userId, id));
     console.log("review_log-Zeilen:", rows.length);
     process.exit(0);
   })();
   '
   unset DIRECT_URL
   ```

3. Erwartet: ein Ergebnis `{"ok":true}`, ein Ergebnis `{"ok":false,"reason":"stale"}`, und **genau eine** Zeile in `review_log` (und eine in `card_state`). Zwei Zeilen oder zwei `ok:true` bedeuten, dass der Schutz auf Neon nicht greift. Dann wird nichts weiter freigegeben, wir klären zuerst die Ursache.
4. Testkonto löschen: Das Löschen der Zeile in `user` entfernt per `ON DELETE CASCADE` alle zugehörigen Daten.

Dieses Skript wird nicht ins Repository aufgenommen, es ist eine einmalige Prüfung.

### Rate-Limit und Client-IP

Das Limit (Registrierung 5 je Stunde, Anmeldung 10 je Minute) legt Better Auth pro Client-IP in der Datenbank ab und liest die IP aus `x-forwarded-for`. In der installierten Version zählt der Header nur, wenn er genau einen Eintrag enthält, sonst gilt die IP als nicht vertrauenswürdig, und das Limit greift nicht (es erscheint eine Warnung im Log). Vercel setzt `x-forwarded-for` auf die IP des Clients und übernimmt keinen mitgeschickten Wert. Daher ist nach unserem Kenntnisstand keine Konfigurationsänderung nötig. Das ist eine Angabe aus der Vercel-Dokumentation, nicht aus dem Code, und wird deshalb praktisch geprüft: Mit einer falschen Testadresse elfmal in einer Minute anmelden, der elfte Versuch muss abgewiesen werden (Fehler 429). Bleibt er aus, steht im Log die Warnung zur IP, und wir stellen `advanced.ipAddress.ipAddressHeaders` auf `x-real-ip` oder `x-vercel-forwarded-for` um. Das wäre dann eine kleine Codeänderung nach Absprache.

### Kosten im Überblick

| Schritt | Angelegt | Zahlungsart nötig |
| --- | --- | --- |
| 2 | Vercel-Projekt (Hobby) im Team | nein |
| 3 | Neon-Projekt (Free) über den Marketplace | nein |
| 4 | Umgebungsvariablen | nein |
| 5, 6 | Tabellen und Betreiberkonto | nein |
| 7 | Produktionsbereitstellung | nein |

Es werden keine weiteren Dienste angelegt. Kein E-Mail-Versand, keine Domain, keine Analyse. Wird ein Limit des Free- oder Hobby-Tarifs erreicht, werden Dienste gedrosselt oder pausiert, es wird nichts abgebucht. Schlägt ein Dialog bei Vercel oder Neon eine kostenpflichtige Option vor, brechen wir ab und sprechen darüber.

### Git

Du pushst selbst nach GitHub, der Erbauer pusht nie. Die erste Bereitstellung läuft deshalb direkt (Schritt 7). Später verbindest du das Repository im Vercel-Projekt unter Settings, Git, "Connect Git Repository". Ab dann löst jeder Push eine Bereitstellung aus. Dann gilt Schritt 4 erneut: Production-Variablen bleiben, für Previews entscheidest du bewusst (eigene Datenbank-Verzweigung bei Neon oder keine Previews, und `BETTER_AUTH_TRUSTED_ORIGINS` für deren Adressen).

## Rückbau

Alles lässt sich ohne Kosten rückgängig machen: Vercel-Projekt löschen (Settings, Advanced), Neon-Projekt im Neon-Dashboard oder über die Integration löschen. Beides macht der Auftraggeber oder der Erbauer nur nach ausdrücklicher Zustimmung.

## Zustimmung

Bitte antworte mit Zustimmung zu diesem Vorschlag, mit der Betreiberadresse, dem Projektnamen und der Angabe, ob `ADMIN_INITIAL_PASSWORD` wie oben nur lokal bleiben soll. Das Startpasswort selbst tippst du im Terminal ein.
