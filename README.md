# Checkout-Trainer

Deutsch- und englischsprachige Web-App, mit der Dartspieler Checkout-Wege (Rest 2 bis 170) per Karteikarten lernen. Die Registrierung ist öffentlich, der Betreiber schaltet jedes Konto von Hand frei. Es warten höchstens 100 Konten gleichzeitig (`MAX_PENDING_USERS`), danach ist die Registrierung bis zum Freischalten oder Löschen geschlossen. Es werden keine E-Mails verschickt.

## Lokale Einrichtung

1. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

2. Umgebungsvariablen: `.env.example` nach `.env.local` kopieren und ausfüllen. Die Datei gehört nicht ins Repository.

   - `DATABASE_URL`: lokal leer lassen, dann nutzt die App eine eingebettete Datenbank unter `.data/pglite`.
   - `BETTER_AUTH_SECRET`: zufälliger, langer Wert, zum Beispiel aus `openssl rand -base64 32`.
   - `BETTER_AUTH_URL`: `http://localhost:3000`.
   - `ADMIN_EMAIL`: Adresse des Betreiberkontos. Sie ist für die Registrierung gesperrt.
   - `ADMIN_INITIAL_PASSWORD`: Startpasswort des Betreibers, mindestens 10 Zeichen.

3. Datenbank migrieren:

   ```bash
   npm run db:migrate
   ```

4. Betreiber anlegen (aktiv, mit Adminrolle; läuft wiederholt ohne Wirkung):

   ```bash
   npm run db:seed-admin
   ```

5. Starten:

   ```bash
   npm run dev
   ```

   Die App läuft unter http://localhost:3000. Neue Konten erscheinen als "wartend" unter `/de/admin` (bzw. `/en/admin`). Dort schaltet der Betreiber sie frei, sperrt sie oder setzt ein neues Passwort.

Ist die lokale Datenbank beschädigt: `.data/pglite` löschen und die Schritte 3 und 4 wiederholen.

## Tests und Prüfungen

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Karten neu erzeugen

Die Karten liegen erzeugt und eingecheckt in `src/data/cards.generated.json` und werden nie von Hand geändert. Nach Änderungen an der Dart-Logik oder der Referenztabelle neu erzeugen:

```bash
npm run generate:cards
```

Ein Test prüft, dass die Datei zum Generator passt.
