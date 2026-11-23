# Bereitstellung

Stand: 2026-11-23. Die App läuft bei Vercel im Tarif Hobby. Die Datenbank ist Postgres bei Neon im Tarif Free. Beide Tarife sind kostenlos und brauchen keine Zahlungsart. Jeder Merge nach `main` stellt eine neue Version bereit.

Dieses Dokument beschreibt die Einrichtung, den Ablauf eines Deploys und die Prüfungen. Den Git-Ablauf bis zum Merge beschreibt die CLAUDE.md im Abschnitt "Git-Flow und Ablauf bis Produktion".

## Überblick

| Teil | Einrichtung |
| --- | --- |
| Vercel-Projekt | Team `team_L16ekIiXaBpa4vlg7m0xQUbg`, Tarif Hobby, Adresse `<projektname>.vercel.app` |
| Git-Anbindung | Seit dem 2026-11-20 mit `derBinder/checkout-trainer` verbunden |
| Neon-Projekt | Tarif Free, über den Vercel Marketplace angelegt und mit dem Vercel-Projekt verbunden |
| Regionen | Funktionen in Frankfurt (`fra1`), Datenbank in Frankfurt (`aws-eu-central-1`) |
| Node | `package.json` legt `"engines": { "node": "24.x" }` fest |

## Ablauf eines Deploys

1. Ein PR wird nach `main` gemergt.
2. Vercel baut den Merge-Commit mit `sh scripts/vercel-build.sh`. `vercel.json` setzt diesen Befehl als Build-Befehl.
3. Das Skript prüft zuerst, dass `DATABASE_URL_UNPOOLED` gesetzt ist. Fehlt die Variable, bricht der Bau sofort ab.
4. Danach läuft `next build`.
5. Nur wenn der Bau gelingt, spielt das Skript die Migrationen aus `drizzle/` über `DATABASE_URL_UNPOOLED` ein.
6. Ist `ADMIN_INITIAL_PASSWORD` gesetzt, legt das Skript danach das Administratorkonto an. Ein vorhandenes Administratorkonto bleibt unverändert. Das Skript bricht ab, wenn die Adresse aus `ADMIN_EMAIL` einem Konto ohne Administratorrolle gehört oder das Startpasswort kürzer als 10 Zeichen ist.
7. Vercel meldet das Ergebnis als Commit-Status `Vercel` an GitHub. Bei Erfolg ist der Status `success` mit der Beschreibung "Deployment has completed".

Scheitert `next build`, bleibt die Datenbank unverändert. Die Live-Seite läuft dann mit dem alten Code und dem alten Schema weiter. Scheitert erst das Anlegen des Administratorkontos, ist die Migration schon gelaufen. Dann läuft der alte Code gegen das neue Schema weiter, bis ein Deploy gelingt. In beiden Fällen zeigt der Bau-Log hinter `target_url` im Commit-Status den Fehler.

Migrationen bleiben additiv. Zuerst wird das Schema erweitert, aufgeräumt wird in einem späteren Release. Der Grund: Zwischen der Migration und der Freischaltung der neuen Version läuft für kurze Zeit noch der alte Code gegen das neue Schema.

Nie `vercel deploy` von Hand ausführen. Die Git-Anbindung stellt jeden Merge nach `main` schon bereit, ein zweiter Deploy würde doppelt bereitstellen.

## Keine Previews

Die Datenbankvariablen der Neon-Integration gelten für Production und für Preview. Das sind `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PG*` und `POSTGRES_*`. Eine Preview liefe also mit unveröffentlichtem Code gegen die Produktionsdatenbank. Sie würde nicht migrieren, weil `scripts/vercel-build.sh` das nur in Production tut. Lesen und schreiben würde sie aber.

Zwei Sperren verhindern Previews:

- `vercel.json` erlaubt über `git.deploymentEnabled` nur Deploys von `main`. Dort steht `"**": false` statt `"*": false`, weil `*` nicht auf Branch-Namen mit Schrägstrich wie `feature/…` passt.
- Im Dashboard steht unter Settings, Build and Deployment, Ignored Build Step die Einstellung "Only build production". Sie greift auch für Branches, deren `vercel.json` die erste Sperre noch nicht enthält. Ihre Pushes erscheinen als abgebrochene Bereitstellung. Der Commit-Status `Vercel` ist dann `success` mit der Beschreibung "Canceled by Ignored Build Step". So geschehen am 2026-11-20 am Merge-Commit von PR #42. Der Status ist nicht rot und hält `gh pr checks` nicht auf.

Wer später Previews will, braucht vorher drei Änderungen:

1. Eine eigene Datenbank-Verzweigung bei Neon nur für Preview.
2. Die Produktionsvariablen nur noch für Production.
3. `BETTER_AUTH_TRUSTED_ORIGINS` für die Preview-Adressen, siehe Abschnitt "Better Auth".

## Regionen

Jede Seite stellt mehrere Datenbankabfragen nacheinander. Liegen Funktion und Datenbank in verschiedenen Regionen, kommt bei jeder Abfrage die Laufzeit zwischen den Rechenzentren dazu. Deshalb liegen beide in Frankfurt:

- Die Funktionsregion steht im Vercel-Projekt unter Settings, Functions, Function Region auf `fra1`. Die Einstellung kostet im Tarif Hobby nichts.
- Die Neon-Region ist `aws-eu-central-1`. Sie lässt sich nachträglich nicht ändern. Dafür bräuchte es ein neues Neon-Projekt.

## Node-Version

`package.json` legt `"engines": { "node": "24.x" }` fest, weil `ts-fsrs` 6 mindestens Node 24 braucht. Bei Vercel hat das Feld `engines` Vorrang vor der Einstellung im Dashboard unter Settings, General, Node.js Version.

Die Angabe ist `24.x` und nicht `>=24`. Bei einer offenen Angabe stuft Vercel beim Erscheinen einer neuen Hauptversion selbst hoch und warnt deshalb beim Bau. Lokal läuft Node 26. Diese Version wird nicht hochgeladen, npm warnt lokal höchstens wegen der Engine-Angabe.

## Datenbankverbindungen

Neon bietet zwei Verbindungsadressen. Beide stehen im Neon-Dashboard unter "Connect", und die Integration legt beide bei Vercel an:

- `DATABASE_URL` ist die gepoolte Adresse, ihr Host enthält `-pooler`. Die Funktionen nutzen sie. Jede Funktion öffnet kurzlebige Verbindungen, und der Pooler von Neon verteilt sie auf wenige Datenbankverbindungen.
- `DATABASE_URL_UNPOOLED` ist die direkte Adresse ohne `-pooler`. Nur Migrationen und das Anlegen des Administratorkontos nutzen sie. Der Pooler ist PgBouncer im Transaktionsmodus und für Schemaänderungen nicht geeignet.

Die App liest nur `DATABASE_URL`. Ist die Variable gesetzt, nutzt `src/lib/db/driver.ts` node-postgres (`pg`) mit höchstens 5 Verbindungen je Funktionsinstanz. Ohne die Variable nutzt die App PGlite. Fehlt sie bei Vercel zur Laufzeit, bricht die App mit einer Fehlermeldung ab und legt keine lokale Datenbank an.

Die Variablen der Neon-Integration sind bei Vercel als geheim markiert. Sie lassen sich nicht auf einen lokalen Rechner zurücklesen. Deshalb laufen Migrationen und das Anlegen des Administratorkontos beim Bau und nicht von Hand.

## Umgebungsvariablen

| Variable | Wert |
| --- | --- |
| `DATABASE_URL` | gepoolte Neon-Adresse, setzt die Integration |
| `DATABASE_URL_UNPOOLED` | direkte Neon-Adresse, setzt die Integration |
| `BETTER_AUTH_SECRET` | eigener Zufallswert, etwa aus `openssl rand -base64 32`, nicht der lokale Wert |
| `BETTER_AUTH_URL` | `https://<projektname>.vercel.app`, ohne Schrägstrich am Ende |
| `ADMIN_EMAIL` | echte Adresse des Administrators. Die Registrierung sperrt diese Adresse, deshalb muss sie bei Vercel gesetzt sein. |
| `ADMIN_INITIAL_PASSWORD` | nur für das erste Anlegen des Administratorkontos, danach wieder entfernen |

## Administratorkonto anlegen

Der Administrator gibt das Startpasswort selbst im Terminal ein. Es geht nicht durch den Chat:

```bash
npx vercel@65.12.1 env add ADMIN_INITIAL_PASSWORD production --sensitive
```

Der nächste Deploy legt das Konto an. Nach der ersten Anmeldung ändert der Administrator das Passwort in der App und entfernt die Variable:

```bash
npx vercel@65.12.1 env rm ADMIN_INITIAL_PASSWORD production
```

Die Vercel-CLI immer mit ausdrücklicher Version aufrufen. Auf dem Entwicklungsrechner läuft Safe-chain und blendet Paketversionen aus, die jünger als ein Mindestalter sind. `@latest` liefert deshalb nicht die neueste Version.

## Ausweichweg: Migration und Administratorkonto von Hand

Der Bau übernimmt beides. Fällt er dafür aus, geht es von einem lokalen Rechner mit der direkten Neon-Adresse. Die Werte landen dabei weder in Dateien noch im Shell-Verlauf. Die `read`-Befehle sind zsh-Syntax.

Migration:

```bash
read -rs "DIRECT_URL?Direkte Neon-Adresse: "; echo
DATABASE_URL="$DIRECT_URL" npm run db:migrate
unset DIRECT_URL
```

`drizzle.config.ts` liest `DATABASE_URL` aus der Shell. Ohne die Variable migriert der Befehl ohne Warnung die lokale PGlite-Datenbank. Deshalb die Variable immer ausdrücklich setzen.

Administratorkonto:

```bash
read -rs "DIRECT_URL?Direkte Neon-Adresse: "; echo
read -r "OP_EMAIL?Administratoradresse: "
read -rs "OP_PW?Startpasswort: "; echo
DATABASE_URL="$DIRECT_URL" ADMIN_EMAIL="$OP_EMAIL" ADMIN_INITIAL_PASSWORD="$OP_PW" npm run db:seed-admin
unset DIRECT_URL OP_EMAIL OP_PW
```

`scripts/seed-admin.ts` lädt zusätzlich `.env` und `.env.local`. Dort steht lokal ein Platzhalter für `ADMIN_EMAIL`. Werte aus der Shell haben Vorrang, deshalb setzt der Befehl alle drei Werte ausdrücklich. Die Adresse muss mit `ADMIN_EMAIL` bei Vercel übereinstimmen.

## Better Auth

### Erlaubte Herkunft

Better Auth nimmt `BETTER_AUTH_URL` als Basisadresse und lässt Anfragen nur von dieser Herkunft zu. Für die Produktionsadresse reicht diese eine Variable. Preview-Adressen würden bei Anmeldung und Registrierung abgelehnt. Für sie gibt es `BETTER_AUTH_TRUSTED_ORIGINS`, eine kommagetrennte Liste mit Platzhaltern. Ein Muster wie `*.vercel.app` erlaubt jede Vercel-Adresse und ist deshalb zu breit. Ein passendes Muster aus Projektname und Team-Kürzel lässt sich erst anhand einer echten Preview-Adresse festlegen.

### Rate-Limit

Better Auth begrenzt die Registrierung auf 5 Versuche je Stunde und die Anmeldung auf 10 Versuche je Minute. Die Zähler liegen je Client-IP in der Datenbank. Die IP liest Better Auth aus `x-forwarded-for`. In der installierten Version zählt der Header nur, wenn er genau einen Eintrag enthält. Sonst gilt die IP als nicht vertrauenswürdig, das Limit greift nicht, und im Log steht eine Warnung.

Laut Vercel-Dokumentation setzt Vercel `x-forwarded-for` auf die IP des Clients und übernimmt keinen mitgeschickten Wert. Der Code allein belegt das nicht. Deshalb gibt es eine Prüfung, siehe "Prüfungen nach der Einrichtung". Greift das Limit nicht, ist `advanced.ipAddress.ipAddressHeaders` mit `x-real-ip` oder `x-vercel-forwarded-for` die Abhilfe.

## Funktionsgröße

`@electric-sql/pglite` ist eine normale Abhängigkeit und steht in `serverExternalPackages`, damit lokal PGlite läuft. In Produktion öffnet die App PGlite nie, weil `DATABASE_URL` gesetzt ist. Die Dateien liegen trotzdem im Funktionspaket. Ein lokaler Build am 2026-11-11 ergab rund 20 MB PGlite von rund 23 MB je Funktion. Das liegt unter dem Vercel-Limit für Funktionen. Soll das Paket kleiner werden, schließt `outputFileTracingExcludes` PGlite aus.

`next build` fragt keine Datenbank ab. Öffentliche Seiten sind statisch, die übrigen dynamisch.

## Web Analytics und Speed Insights

Das Root-Layout bindet `@vercel/analytics` und `@vercel/speed-insights` ein. Daten kommen erst an, wenn beide Funktionen im Vercel-Projekt eingeschaltet sind. Dazu unter Analytics und unter Speed Insights jeweils "Enable" wählen und danach einmal neu bereitstellen.

Beide Funktionen haben im Tarif Hobby ein monatliches Freikontingent. Ist es aufgebraucht, erfasst Vercel nichts mehr, es entstehen keine Kosten. Die Größe des Kontingents steht im Dashboard.

Web Analytics setzt keine Cookies. Es zählt Seitenaufrufe anonymisiert mit Seite, Herkunft, Land, Gerät und Browser. Speed Insights misst Ladezeiten im Browser der Besucher. Vercel verarbeitet diese Daten, deshalb gehören beide Funktionen in die Datenschutzerklärung.

## Prüfungen nach der Einrichtung

Diese Prüfungen gehören zu einer neuen Einrichtung oder zu einer Änderung an Datenbank, Region oder Better Auth. Sie legen keine Daten echter Nutzer an.

1. Startseite, `/de/sign-in`, `/de/sign-up`, `/de/imprint` und `/de/privacy` laden.
2. Mit der Administratoradresse anmelden. `/de/admin` öffnet sich.
3. Ein Testkonto registrieren. Es landet unter `/de/pending` und erscheint in `/de/admin`. Nach dem Freischalten öffnen sich `/de/today` und `/de/study`, und eine Karte lässt sich bewerten.
4. Gleichzeitigkeit prüfen, siehe unten.
5. Rate-Limit prüfen: Mit einer falschen Testadresse elfmal in einer Minute anmelden. Der elfte Versuch muss mit Fehler 429 abgewiesen werden.
6. Das Testkonto löschen. Das Löschen der Zeile in `user` entfernt über `ON DELETE CASCADE` alle zugehörigen Daten.
7. In den Vercel-Logs stehen keine Fehler.
8. Regionen: In den Bereitstellungsdetails unter Functions steht `fra1`, im Neon-Dashboard steht `aws-eu-central-1`.
9. Geltungsbereiche: Unter Settings, Environment Variables gelten `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` und `ADMIN_EMAIL` nur für Production. Für die Datenbankvariablen gilt der Abschnitt "Keine Previews".

### Gleichzeitigkeit

`applyReview` sperrt die Nutzerzeile mit `SELECT … FOR UPDATE`. So zählt eine doppelt abgeschickte Bewertung nur einmal, und das Tageslimit für neue Karten hält. Lokal auf PGlite gibt es nur eine Verbindung. Echt gleichzeitig wird es erst auf Neon mit mehreren Verbindungen.

Die Bewertung läuft in der App über eine Server Action und lässt sich nicht einfach per `curl` doppeln. Deshalb ruft `scripts/check-concurrency.ts` die Funktion `applyReview` zweimal gleichzeitig auf. Es nutzt denselben `pg`-Treiber wie die Produktion, der Pool öffnet dafür zwei Verbindungen. Das Skript legt selbst einen Wegwerf-Nutzer an und löscht ihn am Ende:

```bash
read -rs "DIRECT_URL?Direkte Neon-Adresse: "; echo
DATABASE_URL="$DIRECT_URL" npx tsx scripts/check-concurrency.ts
unset DIRECT_URL
```

Erwartet:

- `OK: genau eine Bewertung gilt.` Ein Aufruf liefert `{"ok":true}`, der andere `{"ok":false,"reason":"stale"}`. In `review_log` und in `card_state` steht je eine Zeile.
- `OK: Tageslimit hält.` Von zwei gleichzeitigen neuen Karten bei einem Limit von zwei pro Tag und einer schon eingeführten Karte gilt genau eine.
- `Wegwerf-Nutzer entfernt.` und Exit-Code 0.

Meldet das Skript `FEHLER` und endet mit Exit-Code 1, schützt die Sperre auf Neon nicht. Dann wird nichts weiter freigegeben, bis die Ursache geklärt ist.

## Vor dem Weitergeben der Adresse

`/de/imprint` und `/de/privacy` zeigen noch den Platzhalter "Dieser Text wird vom Administrator ergänzt." Der Administrator füllt beide Seiten mit seinen echten Angaben, bevor er die Adresse öffentlich weitergibt. In den Datenschutztext gehören:

- Better Auth speichert zu jeder Sitzung die IP-Adresse und den User-Agent des Nutzers.
- Das Rate-Limit speichert Einträge je IP-Adresse.
- Beides liegt in der Datenbank bei Neon in Frankfurt.
- Vercel Web Analytics und Speed Insights, siehe oben.

Vercel Hobby ist nur für nicht kommerzielle Nutzung vorgesehen. Bringt die App Geld ein, braucht sie einen bezahlten Tarif.

## Kosten

| Teil | Tarif | Zahlungsart nötig |
| --- | --- | --- |
| Vercel-Projekt mit Funktionen und Deploys | Hobby | nein |
| Neon-Datenbank | Free | nein |
| Web Analytics und Speed Insights | Freikontingent in Hobby | nein |

Es gibt keine weiteren Dienste, keinen E-Mail-Versand und keine eigene Domain. Erreicht die App ein Limit des Tarifs Free oder Hobby, drosselt oder pausiert der Anbieter den Dienst. Er bucht nichts ab. Schlägt ein Dialog bei Vercel oder Neon eine kostenpflichtige Option vor, wird abgebrochen und mit dem Auftraggeber gesprochen.

Der Free-Tarif von Neon pausiert die Datenbank, wenn sie nicht genutzt wird. Der erste Aufruf danach wartet, bis sie wieder läuft.

## Rückbau

Das Vercel-Projekt lässt sich unter Settings, Advanced löschen, das Neon-Projekt im Neon-Dashboard oder über die Integration. Beides kostet nichts. Gelöscht wird nur nach ausdrücklicher Zustimmung des Auftraggebers.
