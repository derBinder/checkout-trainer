"use client";

import { createContext, use, useLayoutEffect, useState, useTransition } from "react";
import { updateNewPerDay } from "@/app/[lang]/(app)/settings/actions";
import { type FieldSpec } from "@/components/form/form-values";
import { useFieldErrors } from "@/components/form/use-field-errors";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_NEW_PER_DAY } from "@/lib/settings";
import { newPerDaySchema } from "@/lib/validation/schemas";

const FIELDS: FieldSpec[] = [{ name: "newPerDay", schema: newPerDaySchema }];

type FieldProps = ReturnType<ReturnType<typeof useFieldErrors>["fieldProps"]>;

/** Prüfung und Verknüpfungen des Formulars für das Eingabefeld, das mit dem gespeicherten Wert nachlädt. */
const NewPerDayFieldProps = createContext<FieldProps | null>(null);

/**
 * Formular „Neue Karten pro Tag" ohne den gespeicherten Wert: Beschriftung, Hinweis
 * und Knopf stehen sofort da. children ist der Platz für das Eingabefeld
 * (NewPerDayInput), das mit dem gespeicherten Wert nachlädt.
 */
export function NewPerDayForm({ children }: { children: React.ReactNode }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const { errors, fieldProps, errorId, validateForm } = useFieldErrors(FIELDS);

  // Next.js hält die Seite beim Verlassen mit ihrem Zustand vor (Activity): Die
  // Rückmeldung zum letzten Speichern soll beim Zurückkehren nicht stehen bleiben.
  // Eine noch nicht gespeicherte Eingabe bleibt.
  useLayoutEffect(() => () => setMessage(null), []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Das Feld lädt noch: nichts zu speichern.
    if (!event.currentTarget.elements.namedItem("newPerDay")) return;
    setMessage(null);
    if (!validateForm(event.currentTarget)) return;
    const value = Number(
      String(new FormData(event.currentTarget).get("newPerDay")).trim(),
    );
    startTransition(async () => {
      try {
        const result = await updateNewPerDay(value);
        setMessage(
          result.ok
            ? { text: "Gespeichert.", ok: true }
            : { text: "Das hat nicht geklappt. Versuche es erneut.", ok: false },
        );
      } catch {
        setMessage({ text: "Keine Verbindung. Versuche es erneut.", ok: false });
      }
    });
  }

  return (
    <form
      method="post"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-8"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="newPerDay">Neue Karten pro Tag</FieldLabel>
          <NewPerDayFieldProps value={fieldProps("newPerDay", "newPerDay-hint")}>
            {children}
          </NewPerDayFieldProps>
          <FieldDescription id="newPerDay-hint">
            Von 0 bis {MAX_NEW_PER_DAY}. Fällige Wiederholungen kommen immer dazu.
          </FieldDescription>
          <FieldError id={errorId("newPerDay")}>{errors.newPerDay}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-3">
        <Button type="submit" variant="secondary" size="xl" disabled={pending}>
          Speichern
        </Button>
        {message ? (
          <p
            role={message.ok ? "status" : "alert"}
            className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Das Eingabefeld mit dem gespeicherten Wert; steht nur innerhalb von NewPerDayForm. */
export function NewPerDayInput({ initial }: { initial: number }) {
  const fieldProps = use(NewPerDayFieldProps);
  return (
    <Input
      id="newPerDay"
      name="newPerDay"
      type="number"
      inputMode="numeric"
      min={0}
      max={MAX_NEW_PER_DAY}
      step={1}
      defaultValue={initial}
      required
      {...fieldProps}
    />
  );
}
