"use client";

import { useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import {
  changeUserPassword,
  changeUserStatus,
} from "@/app/(app)/verwaltung/actions";

type Props = { userId: string; name: string; status: string };

const FAILED = "Das hat nicht geklappt. Lade die Seite neu und versuche es erneut.";

export function UserActions({ userId, name, status }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function changeStatus(next: "active" | "blocked") {
    setMessage(null);
    startTransition(async () => {
      try {
        const { ok } = await changeUserStatus(userId, next);
        if (!ok) setMessage({ text: FAILED, ok: false });
      } catch {
        setMessage({ text: "Keine Verbindung. Versuche es erneut.", ok: false });
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) setDialogError(null);
  }

  function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setDialogError(null);
    startTransition(async () => {
      try {
        const { ok } = await changeUserPassword(userId, password);
        if (!ok) {
          setDialogError(
            `Das Passwort wurde nicht gesetzt. Es braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
          );
          return;
        }
        setOpen(false);
        setMessage({ text: "Passwort gesetzt. Alle Sitzungen des Nutzers sind beendet.", ok: true });
      } catch {
        setDialogError("Keine Verbindung. Das Passwort wurde nicht gesetzt.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "active" ? (
          <Button variant="destructive" size="lg" disabled={pending} onClick={() => changeStatus("blocked")}>
            Sperren
          </Button>
        ) : (
          <Button size="lg" disabled={pending} onClick={() => changeStatus("active")}>
            {status === "blocked" ? "Entsperren" : "Freischalten"}
          </Button>
        )}
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger render={<Button variant="outline" size="lg" disabled={pending} />}>
            Passwort setzen
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form method="post" onSubmit={handlePassword} className="grid gap-4">
              <AlertDialogHeader>
                <AlertDialogTitle>Passwort für {name} setzen</AlertDialogTitle>
                <AlertDialogDescription>
                  Alle Sitzungen des Nutzers werden beendet. Gib das neue
                  Passwort dem Nutzer persönlich weiter.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Field>
                <FieldLabel htmlFor={`pw-${userId}`}>Neues Passwort</FieldLabel>
                <Input
                  id={`pw-${userId}`}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
                <FieldDescription>Mindestens {MIN_PASSWORD_LENGTH} Zeichen.</FieldDescription>
              </Field>
              {dialogError ? (
                <p role="alert" className="text-sm text-destructive">
                  {dialogError}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
                <Button type="submit" disabled={pending}>
                  Passwort setzen
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
