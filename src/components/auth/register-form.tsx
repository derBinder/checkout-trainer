"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import {
  emailSchema,
  nameSchema,
  newPasswordSchema,
  normalizeEmail,
} from "@/lib/validation/schemas";
import { authErrorMessage } from "./auth-error";

const FIELDS: FieldSpec[] = [
  { name: "name", schema: nameSchema },
  { name: "email", schema: emailSchema },
  { name: "password", schema: newPasswordSchema },
];

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const { errors, fieldProps, errorId, validateForm } = useFieldErrors(FIELDS);
  const passwordProps = fieldProps("password", "password-hint");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signUp.email({
        name: String(form.get("name")).trim(),
        email: normalizeEmail(String(form.get("email"))),
        password: String(form.get("password")),
      });
      if (error) {
        setError(authErrorMessage(error));
        setPending(false);
        return;
      }
      router.replace("/warten");
    } catch {
      setError("Keine Verbindung. Versuche es erneut.");
      setPending(false);
    }
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
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            {...fieldProps("name")}
          />
          <FieldError id={errorId("name")}>{errors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="email">E-Mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            {...fieldProps("email")}
          />
          <FieldError id={errorId("email")}>{errors.email}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Passwort</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            {...passwordProps}
            onChange={(event) => {
              passwordProps.onChange(event);
              setPassword(event.currentTarget.value);
            }}
          />
          <PasswordStrength id="password-hint" value={password} />
          <FieldError id={errorId("password")}>{errors.password}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-3">
        <Button type="submit" size="xl" disabled={pending}>
          Registrieren
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
