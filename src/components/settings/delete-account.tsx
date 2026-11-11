"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorMessage } from "@/components/auth/auth-error";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { type FieldSpec } from "@/components/form/form-values";
import { PasswordInput } from "@/components/form/password-input";
import { useFieldErrors } from "@/components/form/use-field-errors";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import { currentPasswordSchema } from "@/lib/validation/schemas";

const FIELDS: FieldSpec[] = [{ name: "password", schema: currentPasswordSchema }];

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { errors, fieldProps, errorId, validateForm, reset } =
    useFieldErrors(FIELDS);

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setError(null);
      reset();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.deleteUser({
        password: String(form.get("password")),
      });
      if (error) {
        setError(authErrorMessage(error));
        setPending(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Keine Verbindung. Dein Konto wurde nicht gelöscht.");
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={<Button variant="destructive" size="xl" />}>
        Konto löschen
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form
          method="post"
          noValidate
          onSubmit={handleSubmit}
          className="grid gap-4"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Konto löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dein Konto und dein gesamter Lernstand werden endgültig gelöscht.
              Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="deletePassword">Passwort zur Bestätigung</FieldLabel>
            <PasswordInput
              id="deletePassword"
              name="password"
              autoComplete="current-password"
              required
              {...fieldProps("password")}
            />
            <FieldError id={errorId("password")}>{errors.password}</FieldError>
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              Endgültig löschen
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
