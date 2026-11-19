# Versionsanzeige in den Einstellungen

Issue: #25

## Absicht

Ganz unten in den Einstellungen steht die Version des laufenden Deployments, damit nach einem Deploy sichtbar ist, welcher Release live ist.

## Ziele und Nicht-Ziele

- Ziel: eine kleine, gedämpfte Zeile „Version 0.2.0“ unter „Konto löschen“, auf Deutsch und Englisch.
- Nicht-Ziel: Commit-Hash, Build-Zeit oder eigene Kennung für Vorschau-Deployments. Vorschauen und lokale Läufe zeigen die Version aus `package.json` des jeweiligen Stands.

## Randbedingungen

- Die Version in `package.json` wird nur auf Release- und Hotfix-Branches angehoben, deployt wird aus `main`. Sie entspricht damit immer dem Produktionsstand.
- Die Versionsnummer ist weder Nutzerdatum noch Lerninhalt und darf ins vorgerenderte Gerüst (keine Suspense-Grenze).
- Alle Texte in `src/i18n/dictionaries/`, keine freien Tailwind-Werte.

## Ansätze

1. **`version` direkt aus `package.json` in der Serverkomponente der Seite importieren** (gewählt). Kein Zusatzcode, die Datei gelangt nicht ins Browser-Bundle, weil die Seite eine Serverkomponente ist.
2. `process.env.npm_package_version`: verworfen, weil `scripts/vercel-build.sh` `npx next build` aufruft und nicht `npm run`; der Wert wäre bei Vercel leer.
3. Eigene Umgebungsvariable über `env` in `next.config.ts`: verworfen, zusätzliche Konfiguration ohne Gewinn gegenüber 1.

Der Auftraggeber hat Ansatz 1 mit dem Entwurf freigegeben.

## Entwurf

- `src/app/[lang]/(app)/settings/page.tsx`: als letztes Element in `SETTINGS_BODY` eine Zeile `<p className="text-sm text-muted-foreground">{t.settings.version(version)}</p>`, `version` aus `package.json`.
- Wörterbücher: `settings.version: (v: string) => \`Version ${v}\`` in `de.ts` und `en.ts`.
- Test: Komponententest der Seite bzw. des Bausteins, der die Zeile mit der Nummer aus `package.json` sichtbar prüft.

## Dem Umsetzer überlassen

- Ob die Zeile direkt in der Seite steht oder als kleiner Baustein in `settings-parts.tsx`, je nachdem, was sich einfacher testen lässt.
