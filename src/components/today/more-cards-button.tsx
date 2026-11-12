"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import { learnMoreCards, type MoreCardsState } from "@/app/[lang]/(app)/today/actions";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<NonNullable<MoreCardsState>["reason"] | "offline", string> = {
  offline: "Keine Verbindung. Versuche es erneut.",
  auth: "Bitte melde dich erneut an.",
  inactive: "Dein Konto ist nicht freigeschaltet.",
  "not-done": "Es warten noch Karten auf dich. Lade die Seite neu.",
  "all-introduced": "Du hast alle Karten begonnen.",
  cap: "Für heute sind keine weiteren Karten möglich. Morgen geht es weiter.",
};

export function MoreCardsButton() {
  const [state, formAction, pending] = useActionState(async () => {
    try {
      return await learnMoreCards();
    } catch (error) {
      // Die Weiterleitung nach /lernen ist kein Fehler.
      unstable_rethrow(error);
      return { ok: false, reason: "offline" } as const;
    }
  }, null);

  const message = state ? MESSAGES[state.reason] : null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Button
        type="submit"
        variant="secondary"
        size="xl"
        disabled={pending}
        className="w-full sm:w-auto sm:self-start sm:px-10"
      >
        {pending ? "Karten werden vorbereitet …" : "Weitere 5 Karten lernen"}
      </Button>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </form>
  );
}
