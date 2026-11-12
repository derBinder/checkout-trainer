"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { authErrorMessage } from "@/components/auth/auth-error";
import { type FieldSpec } from "@/components/form/form-values";
import { PasswordInput } from "@/components/form/password-input";
import { PasswordStrength } from "@/components/form/password-strength";
import { useFieldErrors } from "@/components/form/use-field-errors";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import {
  currentPasswordSchema,
  newPasswordSchema,
} from "@/lib/validation/schemas";

const FIELDS: FieldSpec[] = [
  { name: "currentPassword", schema: currentPasswordSchema },
  { name: "newPassword", schema: newPasswordSchema },
];

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  // Neuer Schlüssel nach Erfolg: Die Felder starten wieder verborgen.
  const [fieldsKey, setFieldsKey] = useState(0);
  const { errors, fieldProps, errorId, validateForm, reset } =
    useFieldErrors(FIELDS);
  const newPasswordProps = fieldProps("newPassword", "newPassword-hint");
  const formRef = useRef<HTMLFormElement>(null);

  // Next.js hält die Seite beim Verlassen mit ihrem Zustand vor (Activity). Ein
  // Passwort soll nicht stehen bleiben: Beim Verbergen leeren, wieder verborgen
  // zeigen und alte Hinweise entfernen, wie nach einem erfolgreichen Ändern.
  useLayoutEffect(() => {
    const form = formRef.current;
    return () => {
      form?.reset();
      reset();
      setNewPassword("");
      setFieldsKey((key) => key + 1);
      setMessage(null);
    };
  }, [reset]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!validateForm(formElement)) return;
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
        reset();
        setNewPassword("");
        setFieldsKey((key) => key + 1);
        setMessage({ text: "Passwort geändert. Andere Geräte sind abgemeldet.", ok: true });
      }
    } catch {
      setMessage({ text: "Keine Verbindung. Versuche es erneut.", ok: false });
    }
    setPending(false);
  }

  return (
    <form
      ref={formRef}
      method="post"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-8"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">Aktuelles Passwort</FieldLabel>
          <PasswordInput
            key={fieldsKey}
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            required
            {...fieldProps("currentPassword")}
          />
          <FieldError id={errorId("currentPassword")}>
            {errors.currentPassword}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">Neues Passwort</FieldLabel>
          <PasswordInput
            key={fieldsKey}
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            {...newPasswordProps}
            onChange={(event) => {
              newPasswordProps.onChange(event);
              setNewPassword(event.currentTarget.value);
            }}
          />
          <PasswordStrength id="newPassword-hint" value={newPassword} />
          <FieldError id={errorId("newPassword")}>
            {errors.newPassword}
          </FieldError>
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
