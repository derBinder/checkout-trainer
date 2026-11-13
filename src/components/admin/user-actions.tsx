"use client";

import { unstable_rethrow } from "next/navigation";
import { useLayoutEffect, useState, useTransition } from "react";
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
import { PasswordStrength } from "@/components/form/password-strength";
import { useFieldErrors } from "@/components/form/use-field-errors";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { USER_ACTIONS_ROW } from "@/components/admin/admin-parts";
import { useDictionary } from "@/i18n/client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import { newPasswordSchema } from "@/lib/validation/schemas";
import {
  changeUserPassword,
  changeUserStatus,
} from "@/app/[lang]/(app)/admin/actions";

type Props = { userId: string; name: string; status: string };

const FIELDS: FieldSpec[] = [{ name: "password", schema: newPasswordSchema }];

export function UserActions({ userId, name, status }: Props) {
  const t = useDictionary();
  const text = t.admin;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [dialogKey, setDialogKey] = useState(0);
  const { errors, fieldProps, errorId, validateForm, reset } =
    useFieldErrors(FIELDS);
  const passwordId = `pw-${userId}`;
  const passwordProps = fieldProps("password", `${passwordId}-hint`);

  // Next.js hält die Seite beim Verlassen mit ihrem Zustand vor (Activity). Ein
  // eingetipptes Passwort soll beim Zurückkehren weder im Feld stehen noch sichtbar
  // geschaltet sein: Rückfrage schließen und neu einhängen, alte Hinweise weg.
  useLayoutEffect(() => {
    return () => {
      setOpen(false);
      setDialogError(null);
      setPassword("");
      reset();
      setDialogKey((key) => key + 1);
      setMessage(null);
    };
  }, [reset]);

  function changeStatus(next: "active" | "blocked") {
    setMessage(null);
    startTransition(async () => {
      try {
        const { ok } = await changeUserStatus(userId, next);
        if (!ok) setMessage({ text: text.failed, ok: false });
      } catch (error) {
        // Eine Weiterleitung aus der Action (etwa zur Anmeldung) ist kein Fehler.
        unstable_rethrow(error);
        setMessage({ text: t.auth.noConnection, ok: false });
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setDialogError(null);
      setPassword("");
      reset();
    }
  }

  function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const value = String(new FormData(event.currentTarget).get("password"));
    setDialogError(null);
    startTransition(async () => {
      try {
        const { ok } = await changeUserPassword(userId, value);
        if (!ok) {
          setDialogError(text.notSet);
          return;
        }
        setOpen(false);
        setPassword("");
        reset();
        setMessage({ text: text.passwordSet, ok: true });
      } catch (error) {
        unstable_rethrow(error);
        setDialogError(text.notSetNoConnection);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={USER_ACTIONS_ROW}>
        {status !== "active" ? (
          <Button variant="secondary" size="lg" disabled={pending} onClick={() => changeStatus("active")}>
            {status === "blocked" ? text.unblock : text.approve}
          </Button>
        ) : null}
        {/* Auch eine wartende Registrierung lässt sich so ablehnen. */}
        {status !== "blocked" ? (
          <Button variant="destructive" size="lg" disabled={pending} onClick={() => changeStatus("blocked")}>
            {text.block}
          </Button>
        ) : null}
        {/* Neu eingehängt nach dem Verbergen: kommt geschlossen zurück, ohne Schließ-Animation. */}
        <AlertDialog key={dialogKey} open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger render={<Button variant="outline" size="lg" disabled={pending} />}>
            {text.setPassword}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form
              method="post"
              noValidate
              onSubmit={handlePassword}
              className="grid gap-4"
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{text.passwordFor(name)}</AlertDialogTitle>
                <AlertDialogDescription>
                  {text.passwordDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Field>
                <FieldLabel htmlFor={passwordId}>{text.newPassword}</FieldLabel>
                <PasswordInput
                  id={passwordId}
                  name="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                  {...passwordProps}
                  onChange={(event) => {
                    passwordProps.onChange(event);
                    setPassword(event.currentTarget.value);
                  }}
                />
                <PasswordStrength id={`${passwordId}-hint`} value={password} />
                <FieldError id={errorId("password")}>{errors.password}</FieldError>
              </Field>
              {dialogError ? (
                <p role="alert" className="text-sm text-destructive">
                  {dialogError}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>{t.common.cancel}</AlertDialogCancel>
                <Button type="submit" disabled={pending}>
                  {text.setPassword}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
