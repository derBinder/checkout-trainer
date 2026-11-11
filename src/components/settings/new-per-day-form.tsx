"use client";

import { useState, useTransition } from "react";
import { updateNewPerDay } from "@/app/(app)/einstellungen/actions";
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

export function NewPerDayForm({ initial }: { initial: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const { errors, fieldProps, errorId, validateForm } = useFieldErrors(FIELDS);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            {...fieldProps("newPerDay", "newPerDay-hint")}
          />
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
