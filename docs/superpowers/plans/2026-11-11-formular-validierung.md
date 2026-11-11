# Formularprüfung und Passwortstärke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Formulare prüfen Eingaben mit deutschen Hinweisen am Feld, und überall, wo ein neues Passwort vergeben wird, zeigt ein Balken die Stärke von „Schwach" bis „Stark".

**Architecture:** Die Feldregeln stehen einmal als zod-Schemas (`zod/mini`) in einem client-sicheren Modul und werden vom Formular (Hinweis) und von den eigenen Server Actions (echte Prüfung) benutzt. Das Verhalten „Hinweis erst nach Verlassen des Felds oder beim Abschicken" liegt in einem reinen Reducer mit dünnem Hook. Die Passwortstärke ist eine eigene reine Funktion, kein Schema.

**Tech Stack:** Next.js 16.4.5, React 19, zod 4.6.7 (`zod/mini`), shadcn-Bausteine (`Field`, `FieldError`, `Input`), lucide-react, Tailwind 4, Vitest.

**Spec:** Mit dem Auftraggeber am 2026-11-11 im Gespräch festgelegt, hier vollständig wiedergegeben (kein eigenes Dokument, kleine Änderung).

## Global Constraints

- Feste Passwortregel: mindestens 10, höchstens 128 Zeichen (`MIN_PASSWORD_LENGTH`, `MAX_PASSWORD_LENGTH` aus `src/lib/auth/constants.ts`). Keine weiteren Pflichtkriterien. Der Stärke-Balken ist nur ein Hinweis und blockiert nie.
- Ein Hinweis erscheint erst, wenn das Feld verlassen wurde oder das Formular abgeschickt wird, nie beim ersten Tippen. Ist ein Feld einmal „berührt", wird es bei jeder Eingabe neu geprüft, sodass der Hinweis beim Korrigieren sofort verschwindet. Beim Abschicken mit Fehlern springt der Fokus ins erste fehlerhafte Feld.
- Die Sprechblasen des Browsers sind abgeschaltet (`noValidate`). Alle Texte deutsch, wörtlich wie unten.
- Stärke-Balken nur dort, wo ein NEUES Passwort vergeben wird: Registrieren, Passwort ändern (Feld „Neues Passwort"), Verwaltung „Passwort setzen". Nicht bei Anmeldung, nicht beim aktuellen Passwort, nicht beim Löschen des Kontos.
- Vier Stufen: `Schwach`, `Mittel`, `Gut`, `Stark`. Farben nur für diesen Balken, als benannte Tokens im `@theme` in `src/app/globals.css`: `--color-strength-weak` (Rot), `--color-strength-fair` (Orange), `--color-strength-good` (Gelbgrün), `--color-strength-strong` (Grün), mit Werten für hell und dunkel. Die Stufe steht immer auch als Wort da.
- Passwort anzeigen/verbergen: Lucide-Icon `Eye` / `EyeOff` im Feld, kein sichtbarer Text. Der Knopf hat `aria-label` „Passwort anzeigen" bzw. „Passwort verbergen" und `aria-pressed`.
- Keine neue Abhängigkeit außer `zod` (als direkte Abhängigkeit, Version `4.6.7` ausdrücklich angeben, Safe-chain nicht umgehen). In Client-Code nur `zod/mini` importieren. Kein Formular-Baukasten.
- Die Prüfung im Formular ist Komfort. Server Actions und Better Auth prüfen weiter selbst. Bestehende Passwörter bleiben gültig.
- Regeln aus `CLAUDE.md`: Oberfläche deutsch, keine Emojis, Icons nur aus `lucide-react`, keine Tailwind-Klassen mit freien Werten, Tests zuerst, nur lokal committen, keine Attributionszeilen, kein Zugriff auf Vercel oder Neon.

Texte (wörtlich):

| Fall | Text |
|---|---|
| Name leer | `Bitte gib einen Namen ein.` |
| E-Mail leer | `Bitte gib deine E-Mail-Adresse ein.` |
| E-Mail-Format | `Das ist keine gültige E-Mail-Adresse, zum Beispiel name@beispiel.de.` |
| Passwort leer | `Bitte gib ein Passwort ein.` |
| Neues Passwort zu kurz | `Das Passwort braucht mindestens 10 Zeichen.` |
| Neues Passwort zu lang | `Das Passwort darf höchstens 128 Zeichen haben.` |
| Aktuelles Passwort leer | `Bitte gib dein aktuelles Passwort ein.` |
| Neue Karten pro Tag | `Gib eine ganze Zahl von 0 bis 50 ein.` |
| Stärke-Hinweis unter 10 Zeichen | `Noch N Zeichen bis zum Minimum.` (bei N = 1: `Noch 1 Zeichen bis zum Minimum.`) |
| Stärke-Hinweis ab 10 Zeichen, nicht „Stark" | `Länger oder gemischter wird stärker.` |

## Review Focus

1. **Leerzeichen:** Ein Name oder eine E-Mail nur aus Leerzeichen gilt als leer. E-Mail wird vor der Prüfung getrimmt, Passwörter nie. Test in Task 1.
2. **Eingabe aus Passwortmanager oder Autofill:** Werte, die ohne Tastendruck ins Feld kommen, müssen beim Abschicken geprüft werden (Werte aus dem Formular lesen, nicht aus dem React-Zustand). Test in Task 2.
3. **Sehr lange oder ungewöhnliche Passwörter:** 128 Zeichen, Emojis, Umlaute, Leerzeichen dürfen die Stärkefunktion nicht zum Absturz bringen und nicht als „zu kurz" gelten. Test in Task 1.
4. **Serverfehler nach bestandener Formularprüfung:** Lehnt der Server ab (z. B. E-Mail schon vergeben, falsches aktuelles Passwort), bleibt die bestehende Meldung unter dem Formular erhalten und die Feldhinweise verschwinden nicht fälschlich. Test in Task 2.
5. **Fehler nur über Farbe:** Jeder Feldfehler steht als Text am Feld, ist per `aria-describedby` verbunden und das Feld trägt `aria-invalid`. Test in Task 2.

## File Structure

```
src/lib/validation/schemas.ts            zod/mini-Schemas und validateField, client-sicher
src/lib/validation/password-strength.ts  passwordStrength, strengthHint (rein)
src/lib/validation/field-errors.ts       fieldErrorsReducer (rein)
src/components/form/use-field-errors.ts  Hook um den Reducer
src/components/form/password-input.tsx   Input mit Auge-Knopf
src/components/form/password-strength.tsx Balken, Stufe, Hinweis
```

---

### Task 1: Regeln und Passwortstärke (reine Logik)

**Files:**
- Create: `src/lib/validation/schemas.ts`, `src/lib/validation/password-strength.ts`, `src/lib/validation/field-errors.ts`
- Modify: `package.json` (zod als direkte Abhängigkeit), `src/app/(app)/einstellungen/set-new-per-day.ts`, `src/app/(app)/verwaltung/admin-users.ts`
- Test: je eine `.test.ts` neben den drei neuen Dateien; bestehende Tests der beiden geänderten Dateien bleiben grün

**Interfaces:**
- Produces:
  ```ts
  // schemas.ts (nur zod/mini, keine Server-Importe)
  nameSchema, emailSchema, passwordRequiredSchema, currentPasswordSchema, newPasswordSchema, newPerDaySchema
  type FieldSchema = typeof nameSchema | …          // gemeinsamer Typ aller Schemas
  validateField(schema: FieldSchema, value: unknown): string | null   // erste Meldung oder null
  normalizeEmail(value: string): string             // trim
  // password-strength.ts
  type StrengthLevel = 0 | 1 | 2 | 3
  type Strength = { level: StrengthLevel; label: 'Schwach' | 'Mittel' | 'Gut' | 'Stark'; percent: 25 | 50 | 75 | 100 }
  passwordStrength(value: string): Strength | null  // null bei leerem Wert
  strengthHint(value: string): string               // Texte aus der Tabelle, '' bei 'Stark' und bei leerem Wert
  // field-errors.ts
  type FieldErrorsState = { touched: Record<string, true>; errors: Record<string, string | null> }
  type FieldErrorsAction =
    | { type: 'blur'; name: string; error: string | null }
    | { type: 'change'; name: string; error: string | null }
    | { type: 'submit'; errors: Record<string, string | null> }
    | { type: 'reset' }
  initialFieldErrors: FieldErrorsState
  fieldErrorsReducer(state: FieldErrorsState, action: FieldErrorsAction): FieldErrorsState
  firstInvalid(order: string[], errors: Record<string, string | null>): string | null
  ```
- Regeln der Stärke: unter `MIN_PASSWORD_LENGTH` Zeichen immer Stufe 0. Darüber steigt die Stufe mit Länge, Zahl der Zeichenarten (Klein, Groß, Ziffer, Sonstiges) und Zahl verschiedener Zeichen. Abzug für ein einziges wiederholtes Zeichen und für naheliegende Bestandteile (`passwor`, `123456`, `qwert`, `asdf`, `darts`, `checkout`, ohne Rücksicht auf Groß- und Kleinschreibung). Die genaue Gewichtung ist Sache des Erbauers, solange die Tests unten bestehen.
- `fieldErrorsReducer`: `blur` markiert das Feld als berührt und setzt seinen Fehler. `change` setzt den Fehler nur, wenn das Feld schon berührt ist, sonst bleibt der Zustand unverändert. `submit` markiert alle übergebenen Felder als berührt und setzt alle Fehler. `reset` stellt den Anfangszustand her.

- [ ] **Step 1: Tests schreiben**

```ts
// schemas.test.ts
expect(validateField(nameSchema, '')).toBe('Bitte gib einen Namen ein.')
expect(validateField(nameSchema, '   ')).toBe('Bitte gib einen Namen ein.')
expect(validateField(nameSchema, 'Felix')).toBeNull()
expect(validateField(emailSchema, '')).toBe('Bitte gib deine E-Mail-Adresse ein.')
expect(validateField(emailSchema, '   ')).toBe('Bitte gib deine E-Mail-Adresse ein.')
for (const bad of ['abc', 'a@b', 'a@b.', '@b.de', 'a b@c.de', 'a@b..de'])
  expect(validateField(emailSchema, bad)).toBe('Das ist keine gültige E-Mail-Adresse, zum Beispiel name@beispiel.de.')
for (const good of ['name@beispiel.de', '  name@beispiel.de  ', 'a.b+c@sub.example.org'])
  expect(validateField(emailSchema, good)).toBeNull()
expect(validateField(passwordRequiredSchema, '')).toBe('Bitte gib ein Passwort ein.')
expect(validateField(passwordRequiredSchema, 'x')).toBeNull()
expect(validateField(currentPasswordSchema, '')).toBe('Bitte gib dein aktuelles Passwort ein.')
expect(validateField(newPasswordSchema, '')).toBe('Bitte gib ein Passwort ein.')
expect(validateField(newPasswordSchema, 'a'.repeat(9))).toBe('Das Passwort braucht mindestens 10 Zeichen.')
expect(validateField(newPasswordSchema, 'a'.repeat(10))).toBeNull()
expect(validateField(newPasswordSchema, ' '.repeat(10))).toBeNull()          // Passwörter werden nicht getrimmt
expect(validateField(newPasswordSchema, 'a'.repeat(128))).toBeNull()
expect(validateField(newPasswordSchema, 'a'.repeat(129))).toBe('Das Passwort darf höchstens 128 Zeichen haben.')
for (const bad of ['', 'abc', '2.5', '-1', '51', 51, -1, 2.5, Number.NaN, null, undefined])
  expect(validateField(newPerDaySchema, bad)).toBe('Gib eine ganze Zahl von 0 bis 50 ein.')
for (const good of [0, 10, 50, '0', '10', ' 50 '])
  expect(validateField(newPerDaySchema, good)).toBeNull()
expect(validateField(nameSchema, 123)).not.toBeNull()                         // falscher Typ ist nie gültig

// password-strength.test.ts
expect(passwordStrength('')).toBeNull()
expect(passwordStrength('abc')).toMatchObject({ level: 0, label: 'Schwach', percent: 25 })
expect(passwordStrength('Aa1!Aa1!x')!.level).toBe(0)                          // 9 Zeichen: immer Schwach
expect(passwordStrength('passwort12')!.level).toBe(0)
expect(passwordStrength('aaaaaaaaaaaa')!.level).toBe(0)
expect(passwordStrength('kurzeswort')!.level).toBeLessThanOrEqual(1)
expect(passwordStrength('Triple20-und-Bull!')).toMatchObject({ level: 3, label: 'Stark', percent: 100 })
expect(passwordStrength('vier zufällige wörter hier')!.level).toBeGreaterThanOrEqual(2)
for (const odd of ['ä'.repeat(128), 'x'.repeat(128), '🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯', ' '.repeat(40)])
  expect(() => passwordStrength(odd)).not.toThrow()
// längeres Passwort mit denselben Zeichen ist nie schwächer
let prev = -1
for (const p of ['Kx7!mqz2Wp', 'Kx7!mqz2Wp4r', 'Kx7!mqz2Wp4rTy9', 'Kx7!mqz2Wp4rTy9#bn']) {
  const level = passwordStrength(p)!.level; expect(level).toBeGreaterThanOrEqual(prev); prev = level
}
expect(strengthHint('')).toBe('')
expect(strengthHint('abc')).toBe('Noch 7 Zeichen bis zum Minimum.')
expect(strengthHint('abcdefghi')).toBe('Noch 1 Zeichen bis zum Minimum.')
expect(strengthHint('kurzeswort')).toBe('Länger oder gemischter wird stärker.')
expect(strengthHint('Triple20-und-Bull!')).toBe('')

// field-errors.test.ts
let s = initialFieldErrors
s = fieldErrorsReducer(s, { type: 'change', name: 'email', error: 'x' })
expect(s).toEqual(initialFieldErrors)                                          // unberührt: kein Hinweis beim Tippen
s = fieldErrorsReducer(s, { type: 'blur', name: 'email', error: 'x' })
expect(s.errors.email).toBe('x'); expect(s.touched.email).toBe(true)
s = fieldErrorsReducer(s, { type: 'change', name: 'email', error: null })
expect(s.errors.email).toBeNull()                                              // Korrektur räumt sofort auf
s = fieldErrorsReducer(s, { type: 'submit', errors: { name: 'n', email: null, password: 'p' } })
expect(s.touched).toEqual({ name: true, email: true, password: true })
expect(firstInvalid(['name', 'email', 'password'], s.errors)).toBe('name')
expect(firstInvalid(['email'], { email: null })).toBeNull()
expect(fieldErrorsReducer(s, { type: 'reset' })).toEqual(initialFieldErrors)
```

- [ ] **Step 2:** `npx vitest run src/lib/validation`. Erwartet: FAIL (Module fehlen).
- [ ] **Step 3:** `npm install zod@4.6.7` und die drei Module implementieren.
- [ ] **Step 4:** `setNewPerDay` und `setUserPassword` prüfen ihre Eingabe über `newPerDaySchema` bzw. `newPasswordSchema` statt über eigene Bedingungen. Verhalten und Rückgabewerte bleiben gleich, die bestehenden Tests beider Dateien müssen unverändert bestehen.
- [ ] **Step 5:** `npm test`, `npm run typecheck`, `npm run lint`. Erwartet: alles grün.
- [ ] **Step 6:** Commit `feat: shared field rules and password strength`.

### Task 2: Formulare, Stärke-Balken, Auge-Icon

**Files:**
- Create: `src/components/form/use-field-errors.ts`, `src/components/form/password-input.tsx`, `src/components/form/password-strength.tsx`, `src/components/form/form-values.ts`
- Modify: `src/app/globals.css` (vier Stärke-Tokens), `src/components/auth/register-form.tsx`, `src/components/auth/login-form.tsx`, `src/components/settings/change-password-form.tsx`, `src/components/settings/delete-account.tsx`, `src/components/settings/new-per-day-form.tsx`, `src/components/admin/user-actions.tsx`
- Test: `src/components/form/form-values.test.ts`

**Interfaces:**
- Consumes: alles aus Task 1; `Field`, `FieldLabel`, `FieldDescription`, `FieldError` aus `src/components/ui/field.tsx`; `Input`.
- Produces:
  ```ts
  // form-values.ts (rein, testbar ohne Browser)
  type FieldSpec = { name: string; schema: FieldSchema }
  validateValues(fields: FieldSpec[], values: Record<string, unknown>): Record<string, string | null>
  // use-field-errors.ts
  useFieldErrors(fields: FieldSpec[]): {
    errors: Record<string, string | null>
    fieldProps(name: string): { onBlur: FocusEventHandler<HTMLInputElement>; onChange: ChangeEventHandler<HTMLInputElement>; 'aria-invalid': boolean; 'aria-describedby': string | undefined }
    errorId(name: string): string
    validateForm(form: HTMLFormElement): boolean      // liest Werte aus FormData, setzt Fehler, fokussiert das erste fehlerhafte Feld
    reset(): void
  }
  // password-input.tsx
  PasswordInput(props: React.ComponentProps<typeof Input>)   // rendert Input plus Auge-Knopf, type wechselt password/text
  // password-strength.tsx
  PasswordStrength(props: { value: string })                  // Balken (aria-hidden), Stufe als Wort, Hinweistext
  ```
- `validateForm` liest die Werte aus dem Formular (`FormData`), nicht aus React-Zustand, damit Autofill erfasst wird.
- Der Stärke-Balken braucht den aktuellen Wert des Passwortfelds: Das Formular hält dafür genau diesen einen Wert im Zustand.

- [ ] **Step 1: Tests schreiben**

```ts
// form-values.test.ts
const fields = [{ name: 'name', schema: nameSchema }, { name: 'email', schema: emailSchema }, { name: 'password', schema: newPasswordSchema }]
expect(validateValues(fields, { name: '', email: 'abc', password: 'kurz' })).toEqual({
  name: 'Bitte gib einen Namen ein.',
  email: 'Das ist keine gültige E-Mail-Adresse, zum Beispiel name@beispiel.de.',
  password: 'Das Passwort braucht mindestens 10 Zeichen.',
})
expect(validateValues(fields, { name: 'Felix', email: 'a@b.de', password: 'a'.repeat(10) })).toEqual({ name: null, email: null, password: null })
// fehlende Schlüssel (Feld nicht im Formular oder Autofill ohne Ereignis) zählen als leer
expect(validateValues(fields, {})).toEqual({
  name: 'Bitte gib einen Namen ein.',
  email: 'Bitte gib deine E-Mail-Adresse ein.',
  password: 'Bitte gib ein Passwort ein.',
})
```

- [ ] **Step 2:** `npx vitest run src/components/form`. Erwartet: FAIL.
- [ ] **Step 3:** `form-values.ts`, `use-field-errors.ts`, `password-input.tsx`, `password-strength.tsx` und die vier Tokens bauen. Balken: volle Breite, Höhe und Rundung aus der bestehenden Skala, Füllung 25/50/75/100 % in der Farbe der Stufe (Breite per Inline-`style`, das ist keine Tailwind-Klasse). Darunter eine Zeile: links die Stufe fett, rechts der Hinweis. Die Zeile ist `aria-live="polite"`. Ohne Eingabe ist der Balken leer und es steht nur der Hinweis „Mindestens 10 Zeichen.".
- [ ] **Step 4:** Alle sechs Formulare umstellen: `noValidate`, je Feld `fieldProps`, darunter `FieldError` mit `errorId`, beim Abschicken zuerst `validateForm` und nur bei `true` senden. Felder je Formular:
  - Registrieren: Name (`nameSchema`), E-Mail (`emailSchema`), Passwort (`newPasswordSchema`, `PasswordInput`, `PasswordStrength`).
  - Anmelden: E-Mail (`emailSchema`), Passwort (`passwordRequiredSchema`, `PasswordInput`, kein Balken).
  - Passwort ändern: aktuelles Passwort (`currentPasswordSchema`, `PasswordInput`), neues Passwort (`newPasswordSchema`, `PasswordInput`, `PasswordStrength`).
  - Konto löschen: Passwort (`currentPasswordSchema`, `PasswordInput`).
  - Neue Karten pro Tag: `newPerDaySchema`; die bisherige eigene Bereichsprüfung entfällt.
  - Verwaltung, Passwort setzen: `newPasswordSchema`, `PasswordInput`, `PasswordStrength`.
  Die bestehende Meldung unter dem Formular für Serverfehler bleibt, wie sie ist. Die E-Mail wird getrimmt gesendet (`normalizeEmail`).
- [ ] **Step 5:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Erwartet: alles grün. Danach prüfen und im Bericht angeben, um wie viel das Client-Skript der Seiten `/registrieren` und `/anmelden` gewachsen ist (Dateigrößen unter `.next/static` vor und nach der Änderung) und dass nur `zod/mini` im Client landet.
- [ ] **Step 6:** Im Browser prüfen, 375 px und 1280 px, hell und dunkel, mit einem selbst angelegten lokalen Testkonto: Registrieren (leer abschicken, „abc" als E-Mail und Feld verlassen, Korrektur räumt den Hinweis weg, Balken durch alle vier Stufen, Auge-Knopf), Anmelden (leer abschicken, falsche Zugangsdaten zeigen weiter die Servermeldung), Einstellungen (Karten pro Tag mit „abc" und „51", Passwort ändern mit falschem aktuellem Passwort), Tastaturbedienung und sichtbarer Fokus. Kein horizontales Scrollen.
- [ ] **Step 7:** Commit `feat: field validation, password strength bar and show-password toggle`.
