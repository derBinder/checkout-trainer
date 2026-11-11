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
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        <form method="post" onSubmit={handleSubmit} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Konto löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dein Konto und dein gesamter Lernstand werden endgültig gelöscht.
              Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="deletePassword">Passwort zur Bestätigung</FieldLabel>
            <Input
              id="deletePassword"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
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
