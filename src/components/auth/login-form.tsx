"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { type FieldSpec } from "@/components/form/form-values";
import { PasswordInput } from "@/components/form/password-input";
import { useFieldErrors } from "@/components/form/use-field-errors";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDictionary, useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";
import { authClient } from "@/lib/auth/client";
import {
  emailSchema,
  normalizeEmail,
  passwordRequiredSchema,
} from "@/lib/validation/schemas";
import { authErrorMessage } from "./auth-error";

const FIELDS: FieldSpec[] = [
  { name: "email", schema: emailSchema },
  { name: "password", schema: passwordRequiredSchema },
];

export function LoginForm() {
  const router = useRouter();
  const localePath = useLocalePath();
  const t = useDictionary();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { errors, fieldProps, errorId, validateForm, reset } = useFieldErrors(FIELDS);
  // Neuer Schlüssel beim Verbergen: Das Passwort startet wieder verborgen.
  const [fieldsKey, setFieldsKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Next.js hält die Seite nach der Anmeldung versteckt vor (Activity). Das
  // Passwort soll dort nicht stehen bleiben: Beim Verbergen alles zurücksetzen.
  useLayoutEffect(() => {
    const form = formRef.current;
    return () => {
      form?.reset();
      reset();
      setFieldsKey((key) => key + 1);
      setError(null);
      setPending(false);
    };
  }, [reset]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signIn.email({
        email: normalizeEmail(String(form.get("email"))),
        password: String(form.get("password")),
      });
      if (error) {
        setError(authErrorMessage(error, t.auth));
        setPending(false);
        return;
      }
      // Wartende Konten leitet die Übersicht weiter auf die Warteseite.
      router.replace(localePath(ROUTES.today));
    } catch {
      setError(t.auth.noConnection);
      setPending(false);
    }
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
          <FieldLabel htmlFor="email">{t.signIn.email}</FieldLabel>
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
          <FieldLabel htmlFor="password">{t.signIn.password}</FieldLabel>
          <PasswordInput
            key={fieldsKey}
            id="password"
            name="password"
            autoComplete="current-password"
            required
            {...fieldProps("password")}
          />
          <FieldError id={errorId("password")}>{errors.password}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-3">
        <Button type="submit" size="xl" disabled={pending}>
          {t.signIn.submit}
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
