# Versionsanzeige in den Einstellungen – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganz unten in den Einstellungen steht „Version <x.y.z>“ aus `package.json`.

**Architecture:** Ein rein darstellender Baustein `AppVersion` in eigener Datei `src/components/settings/app-version.tsx` (Serverkomponente) liest `version` aus `package.json` und rendert eine gedämpfte Zeile; die Seite übergibt den Text aus dem Wörterbuch und setzt den Baustein als letztes Element. Kein Datenzugriff, keine Suspense-Grenze.

**Tech Stack:** Next.js 16 (Serverkomponente), Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-19-versionsanzeige-design.md](../specs/2026-11-19-versionsanzeige-design.md)

## Global Constraints

- Alle Texte in `src/i18n/dictionaries/` (`de.ts` als Typquelle, `en.ts`), keine harten Texte in der Oberfläche.
- Keine Tailwind-Klassen mit freien Werten; nur Standardklassen (`text-sm text-muted-foreground`).
- Nur in Serverkomponenten aus `package.json` lesen, damit die Datei nicht ins Browser-Bundle gelangt.
- Tests zuerst; vor dem Commit `npm run test:coverage`, `npm run typecheck`, `npm run lint`.
- Commit-Nachrichten auf Englisch, `Refs #25`, kein `Closes`/`Fixes`.

## Review Focus

- `app-version.tsx` darf nie von einem `"use client"`-Baustein importiert werden, sonst landet `package.json` im Browser-Bundle. Deshalb eigene Datei und nicht `settings-parts.tsx` (das importieren `settings-skeleton.tsx` und `extra-cards-form.tsx`, beide Client).
- Englische Seite zeigt ebenfalls „Version 0.2.0“ (Test über `en`-Wörterbuch).

---

### Task 1: Versionszeile in den Einstellungen

**Files:**
- Modify: `src/i18n/dictionaries/de.ts` (Block `settings`), `src/i18n/dictionaries/en.ts` (Block `settings`)
- Create: `src/components/settings/app-version.tsx`
- Modify: `src/app/[lang]/(app)/settings/page.tsx` (letztes Kind von `SETTINGS_BODY`, nach `DeleteAccountSection`)
- Test: `src/components/settings/app-version.test.tsx` (neu, erste Zeile `// @vitest-environment jsdom`)

**Interfaces:**
- Produces: `settings.version: (v: string) => string` in beiden Wörterbüchern; `AppVersion({ label }: { label: (v: string) => string })` aus `@/components/settings/app-version`.

- [ ] **Step 1: Failing test schreiben** (`app-version.test.tsx`)

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { version } from "../../../package.json";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { AppVersion } from "./app-version";

describe("AppVersion", () => {
  it("zeigt die Version aus package.json auf Deutsch", () => {
    render(<AppVersion label={DICTIONARIES.de.settings.version} />);
    expect(screen.getByText(`Version ${version}`)).toBeTruthy();
  });
  it("zeigt die Version auf Englisch", () => {
    render(<AppVersion label={DICTIONARIES.en.settings.version} />);
    expect(screen.getByText(`Version ${version}`)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Test laufen lassen, er schlägt fehl**

Run: `npx vitest run src/components/settings/app-version.test.tsx`
Expected: FAIL (`AppVersion` bzw. `settings.version` fehlt)

- [ ] **Step 3: Umsetzen**
  - `de.ts` und `en.ts`: `version: (v: string) => \`Version ${v}\`` im Block `settings`.
  - `app-version.tsx` (ohne `"use client"`): `import { version } from "../../../package.json";` und `AppVersion` rendert `<p className="text-sm text-muted-foreground">{label(version)}</p>`.
  - `page.tsx`: `<AppVersion label={t.settings.version} />` als letztes Element in `SETTINGS_BODY`.

- [ ] **Step 4: Test grün**

Run: `npx vitest run src/components/settings/app-version.test.tsx`
Expected: PASS

- [ ] **Step 5: Gesamtprüfung**

Run: `npm run test:coverage && npm run typecheck && npm run lint`
Expected: alle grün, Coverage-Schwellen erfüllt (inkl. `no-hardcoded-text.test.ts`).

- [ ] **Step 6: Im Browser prüfen**

Dev-Server starten, mit dem Testkonto `/de/settings` und `/en/settings` öffnen: Unter „Konto löschen“ steht „Version 0.2.0“.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/dictionaries/de.ts src/i18n/dictionaries/en.ts src/components/settings/app-version.tsx src/components/settings/app-version.test.tsx "src/app/[lang]/(app)/settings/page.tsx"
git commit -m "feat: show app version at the bottom of the settings page" -m "Refs #25"
```
