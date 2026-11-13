# Ring nach jedem Dart zurück auf S: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nach jedem eingegebenen Dart steht der Ring im Tastenfeld wieder auf S; der automatische Sprung auf D entfällt.

**Architecture:** Die ganze Ringlogik liegt im reinen Reducer `src/components/study/route-input.ts`. Dort setzt `add()` den Ring nach jedem Dart auf `"S"` statt ihn bei einem Doppel-Rest auf `"D"` zu stellen; `isDoubleRest` fällt weg. `ringsBefore` bleibt, damit Löschen den Ring vor dem gelöschten Dart wiederherstellt. Komponententests, die sich auf den Sprung verlassen, wählen D künftig selbst.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-13-ring-zurueck-auf-s-design.md](../specs/2026-11-13-ring-zurueck-auf-s-design.md)

## Global Constraints

- Tests zuerst schreiben.
- Vor dem Commit: `npm run test:coverage`, `npm run typecheck`, `npm run lint`. Abdeckung mindestens 80 % je Backend und Frontend, Schwellen nicht senken.
- Komponententests mit Testing Library; in `study-session.test.tsx` bleibt es bei `fireEvent` (nachgebildete Uhr, Tippschutz).
- Git: nur lokal committen, nie pushen, keine Attributionszeilen.
- Keine Änderung am Aussehen des Tastenfelds und an `route-pad.tsx`.

## Review Focus

- Ring T gewählt, dann 25 oder Bull getippt: Ring steht danach auf S (Test in Task 1, Schritt 1).
- Nach einem Dart den Ring umgestellt, dann gelöscht: Ring ist der vor dem gelöschten Dart gewählte, nicht S (bestehender Fall „60“ bleibt im Test).
- Löschen eines Bull/25-Darts: Ring ist der vor diesem Dart gewählte (Test in Task 1, Schritt 1).
- Letzter Dart füllt die Eingabe (Fehlwurfkarte `m-125-1`): Ring steht auf S, Tasten gesperrt (Komponententest in Task 1, Schritt 2).
- Rest 50 nach einem Dart (110 nach T20): Ring steht auf S, nicht T (Test in Task 1, Schritt 1, ersetzt den alten „bleibt T“-Fall).

---

### Task 1: Ring nach jedem Dart auf S

**Files:**
- Modify: `src/components/study/route-input.ts` (Kopfkommentar, `isDoubleRest` entfernen, `add()`)
- Test: `src/components/study/route-input.test.ts`
- Test: `src/components/study/study-question.test.tsx` (Fälle um Zeilen 60–77, 141–150, 152–163)
- Test: `src/components/study/study-session.test.tsx` (Fälle um Zeilen 378–386 und 466–474)
- Test: `src/components/study/study-data.test.tsx` (um Zeile 53)
- Modify: `docs/superpowers/specs/2026-11-12-weg-eingeben-design.md` (Abschnitt „Eingabe“)

**Interfaces:**
- Consumes: nichts aus anderen Tasks.
- Produces: `InputState`, `InputAction`, `initInput`, `inputReducer`, `remaining`, `isFull` unverändert in Signatur. `isDoubleRest` wird nicht mehr exportiert.

- [ ] **Step 1: Reducer-Tests in `route-input.test.ts` umschreiben**

`isDoubleRest` aus dem Import und den `describe("isDoubleRest")`-Block entfernen. Die Tests „switches to D once the rest is a direct double-out“, „only ever switches to D, never away from the chosen ring“ und „does not switch to D when 50 is left“ ersetzen. „keeps the ring for the next dart“ wird zu:

```ts
it("returns to S after every dart", () => {
  const s = run(initInput(restCheck(121)), T, num(20));
  expect(s.ring).toBe("S");
  expect(run(s, num(11)).darts).toEqual(["T20", "S11"]);
});

it("stays on S when the rest is a direct double-out", () => {
  // 33: S1 lässt 32, 100: T20 lässt 40, 110: T20 lässt 50
  expect(run(initInput(restCheck(33)), num(1)).ring).toBe("S");
  expect(run(initInput(restCheck(100)), T, num(20)).ring).toBe("S");
  expect(run(initInput(restCheck(110)), T, num(20)).ring).toBe("S");
});

it("returns to S after 25 and Bull too", () => {
  expect(run(initInput(restCheck(121)), T, { type: "outer" }).ring).toBe("S");
  expect(run(initInput(restCheck(121)), { type: "ring", ring: "D" }, { type: "bull" }).ring).toBe("S");
});
```

„undo restores the ring that was set before the removed dart“ anpassen: Im ersten Fall (121, T, 20, 19) ist `s.ring` jetzt `"S"`, Löschen ergibt `"T"`. Den Fall „60“ umbauen auf: `num(20)`, dann Ring `"T"` wählen, Löschen → `"S"`. Den Fall „40“ unverändert lassen. Neu dazu:

```ts
// Bull mit gewähltem D, Löschen → D
const v = run(initInput(restCheck(121)), { type: "ring", ring: "D" }, { type: "bull" }, { type: "undo" });
expect(v.ring).toBe("D");
```

- [ ] **Step 2: Komponententests anpassen, die sich auf den Sprung verlassen**

Der Tastenname hängt am gewählten Ring („Doppel 14“ gibt es nur bei gewähltem D). Daher vor jedem Doppel-Tipp D selbst wählen:

- `study-question.test.tsx`, Fall „füllt die Felder Dart für Dart und springt auf D…“: umbenennen in „füllt die Felder Dart für Dart und stellt den Ring nach jedem Dart auf S“. Nach `Triple 20` erwartet `checkedRing()` `"Single"`; vor `Triple 11` `ring("Triple")`; nach `Triple 11` `"Single"`; vor `Doppel 14` `ring("Doppel")`.
- Gleiche Datei, Fall `m-125-1`: Kommentar und Erwartung auf `checkedRing()` `"Single"`, gesperrt geprüft über `isDisabled("Single 1")` statt `"Doppel 1"`.
- Gleiche Datei, `QuestionFooter` mit `r-100`: vor `Doppel 20` `ring("Doppel")`.
- `study-session.test.tsx`, „prüft den eingegebenen Weg…“: nach `Single 1` erwartet `checkedRing()` `"Single"` (Kommentar: Ring bleibt auf S, auch bei direktem Doppel), dann `fireEvent.click(screen.getByRole("radio", { name: "Doppel" }))` vor `Doppel 2`.
- Gleiche Datei, „prüft den Weg einer Zwei-Dart-Karte“ (`t-61`): Doppel-Radio vor `Doppel 8` klicken.
- `study-data.test.tsx`: Doppel-Radio vor `Doppel 2` klicken.

- [ ] **Step 3: Tests laufen lassen, sie schlagen fehl**

Run: `npx vitest run src/components/study`
Expected: FAIL in `route-input.test.ts` (Ring ist `"D"` statt `"S"`) und in den angepassten Komponententests (Ring „Doppel“ statt „Single“ erwartet bzw. Tasten-Label passt nicht).

- [ ] **Step 4: `add()` in `route-input.ts` ändern, `isDoubleRest` entfernen**

`add(s, dart)` gibt den neuen Zustand mit `ring: "S"` zurück; `ringsBefore` merkt weiter `s.ring`. `isDoubleRest` samt Kommentar löschen. Kopfkommentar ersetzen: Der Ring startet auf S und steht nach jedem Dart wieder auf S, damit das Tastenfeld keinen Hinweis auf den Weg gibt; Löschen stellt den Ring wieder her, der vor dem gelöschten Dart gewählt war.

- [ ] **Step 5: Tests laufen lassen, sie bestehen**

Run: `npx vitest run src/components/study`
Expected: PASS

- [ ] **Step 6: Alten Entwurf anpassen**

In `docs/superpowers/specs/2026-11-12-weg-eingeben-design.md`, Abschnitt „Eingabe“: Den Satz „Der Ring bleibt gewählt, bis man ihn wechselt. Meist also ein Tipp pro Dart, nur beim Ringwechsel zwei.“ ersetzen durch „Nach jedem Dart steht der Ring wieder auf S. Ein Single kostet einen Tipp, ein Doppel oder Triple zwei.“ Den Punkt „Automatischer Ringwechsel …“ ersetzen durch „Löschen stellt den Ring wieder her, der vor dem gelöschten Dart gewählt war. (Seit 2026-11-13, siehe [2026-11-13-ring-zurueck-auf-s-design.md](2026-11-13-ring-zurueck-auf-s-design.md); vorher sprang der Ring bei einem Doppel-Rest auf D.)“ In der Überschrift „Variante A, „Ring bleibt stehen““ den Zusatz „(seit 2026-11-13: Ring nach jedem Dart auf S)“ anhängen.

- [ ] **Step 7: Prüfungen vor dem Commit**

Run: `npm run test:coverage && npm run typecheck && npm run lint`
Expected: alle Tests grün, Abdeckung über den Schwellen, keine Typ- und Lint-Fehler.

- [ ] **Step 8: Commit**

```bash
git add src/components/study/route-input.ts src/components/study/route-input.test.ts src/components/study/study-question.test.tsx src/components/study/study-session.test.tsx src/components/study/study-data.test.tsx docs/superpowers/specs/2026-11-12-weg-eingeben-design.md docs/superpowers/specs/2026-11-13-ring-zurueck-auf-s-design.md docs/superpowers/plans/2026-11-13-ring-zurueck-auf-s.md
git commit -m "fix: ring returns to single after every dart so the pad gives no hint"
```
