"use client";

import { useState, useTransition } from "react";
import { updateNewPerDay } from "@/app/(app)/einstellungen/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const RANGE_MESSAGE = "Gib eine ganze Zahl von 0 bis 50 ein.";

export function NewPerDayForm({ initial }: { initial: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get("newPerDay")).trim();
    const value = raw === "" ? Number.NaN : Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 50) {
      setMessage({ text: RANGE_MESSAGE, ok: false });
      return;
    }
    setMessage(null);
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
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="newPerDay">Neue Karten pro Tag</FieldLabel>
          <Input
            id="newPerDay"
            name="newPerDay"
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            step={1}
            defaultValue={initial}
            aria-describedby="newPerDay-hint"
            required
          />
          <FieldDescription id="newPerDay-hint">
            Von 0 bis 50. Fällige Wiederholungen kommen immer dazu.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-3">
        <Button type="submit" size="xl" disabled={pending}>
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
