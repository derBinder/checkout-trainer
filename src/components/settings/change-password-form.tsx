"use client";

import { useState } from "react";
import { authErrorMessage } from "@/components/auth/auth-error";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setMessage(null);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: String(form.get("currentPassword")),
        newPassword: String(form.get("newPassword")),
        revokeOtherSessions: true,
      });
      if (error) {
        setMessage({ text: authErrorMessage(error), ok: false });
      } else {
        formElement.reset();
        setMessage({ text: "Passwort geändert. Andere Geräte sind abgemeldet.", ok: true });
      }
    } catch {
      setMessage({ text: "Keine Verbindung. Versuche es erneut.", ok: false });
    }
    setPending(false);
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">Aktuelles Passwort</FieldLabel>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">Neues Passwort</FieldLabel>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="newPassword-hint"
            required
          />
          <FieldDescription id="newPassword-hint">
            Mindestens {MIN_PASSWORD_LENGTH} Zeichen.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-3">
        <Button type="submit" variant="secondary" size="xl" disabled={pending}>
          Passwort ändern
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
