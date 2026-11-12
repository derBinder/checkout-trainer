"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import { learnMoreCards, type MoreCardsState } from "@/app/[lang]/(app)/today/actions";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/client";

type Reason = NonNullable<MoreCardsState>["reason"] | "offline";

export function MoreCardsButton() {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(async () => {
    try {
      return await learnMoreCards();
    } catch (error) {
      // Die Weiterleitung zur Lernseite ist kein Fehler.
      unstable_rethrow(error);
      return { ok: false, reason: "offline" } as const;
    }
  }, null);

  const messages: Record<Reason, string> = {
    offline: t.auth.noConnection,
    auth: t.today.moreCardsErrors.auth,
    inactive: t.today.moreCardsErrors.inactive,
    "not-done": t.today.moreCardsErrors.notDone,
    "all-introduced": t.today.moreCardsErrors.allIntroduced,
    cap: t.today.moreCardsErrors.cap,
  };
  const message = state ? messages[state.reason] : null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Button
        type="submit"
        variant="secondary"
        size="xl"
        disabled={pending}
        className="w-full sm:w-auto sm:self-start sm:px-10"
      >
        {pending ? t.today.preparing : t.today.moreCards}
      </Button>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </form>
  );
}
