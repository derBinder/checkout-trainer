"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import { resetLearningProgress } from "@/app/[lang]/(app)/settings/actions";
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
import { useDictionary } from "@/i18n/client";

/** „Lernstand zurücksetzen“: erst Rückfrage, dann löscht die Server Action den Lernstand. */
export function ResetProgress() {
  const t = useDictionary();
  const text = t.settings.resetProgress;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Next.js hält die Seite beim Verlassen mit ihrem Zustand vor (Activity): Rückfrage
  // und Rückmeldung sollen beim Zurückkehren nicht stehen bleiben.
  useLayoutEffect(
    () => () => {
      setOpen(false);
      setMessage(null);
    },
    [],
  );

  function confirm() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await resetLearningProgress();
        setMessage(
          result.ok ? { text: text.done, ok: true } : { text: t.auth.fallback, ok: false },
        );
      } catch {
        setMessage({ text: t.auth.noConnection, ok: false });
      }
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{text.hint}</p>
      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogTrigger render={<Button variant="destructive" size="xl" />}>
          {text.title}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.question}</AlertDialogTitle>
            <AlertDialogDescription>{text.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t.common.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={confirm}>
              {text.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
