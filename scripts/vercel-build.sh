#!/bin/sh
# Build bei Vercel. In der Produktionsumgebung wird vor dem Bau das Datenbankschema
# eingespielt (direkte Neon-Adresse, nicht der Pooler) und, falls ein Startpasswort
# hinterlegt ist, das Betreiberkonto angelegt. Beides ist wiederholbar.
# Vorschau-Bereitstellungen und lokale Läufe fassen die Datenbank nicht an.
set -e

if [ "$VERCEL_ENV" = "production" ]; then
  if [ -z "$DATABASE_URL_UNPOOLED" ]; then
    echo "DATABASE_URL_UNPOOLED fehlt: Schema kann nicht eingespielt werden." >&2
    exit 1
  fi
  DATABASE_URL="$DATABASE_URL_UNPOOLED" npx drizzle-kit migrate
  if [ -n "$ADMIN_INITIAL_PASSWORD" ]; then
    DATABASE_URL="$DATABASE_URL_UNPOOLED" npx tsx scripts/seed-admin.ts
  else
    echo "ADMIN_INITIAL_PASSWORD nicht gesetzt: Betreiberkonto wird nicht angelegt."
  fi
fi

npx next build
