#!/bin/sh
# Build bei Vercel. Zuerst läuft der Bau. Nur wenn er gelingt, wird in der
# Produktionsumgebung das Datenbankschema eingespielt (direkte Neon-Adresse,
# nicht der Pooler) und, falls ein Startpasswort hinterlegt ist, das
# Administratorkonto angelegt. Beides ist wiederholbar. Scheitert der Bau, bleibt die
# Datenbank unberührt, und die Live-Seite läuft mit altem Code gegen altes Schema.
# Die Variablenprüfung steht vor dem Bau: So scheitert eine fehlende Adresse sofort.
# Vorschau-Bereitstellungen und lokale Läufe fassen die Datenbank nicht an.
set -e

if [ "$VERCEL_ENV" = "production" ] && [ -z "$DATABASE_URL_UNPOOLED" ]; then
  echo "DATABASE_URL_UNPOOLED fehlt: Schema kann nicht eingespielt werden." >&2
  exit 1
fi

npx next build

if [ "$VERCEL_ENV" = "production" ]; then
  DATABASE_URL="$DATABASE_URL_UNPOOLED" npx drizzle-kit migrate
  if [ -n "$ADMIN_INITIAL_PASSWORD" ]; then
    DATABASE_URL="$DATABASE_URL_UNPOOLED" npx tsx scripts/seed-admin.ts
  else
    echo "ADMIN_INITIAL_PASSWORD nicht gesetzt: Administratorkonto wird nicht angelegt."
  fi
fi
