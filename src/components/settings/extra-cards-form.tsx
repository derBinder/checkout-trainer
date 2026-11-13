"use client";

import { useId, useLayoutEffect, useState, useTransition } from "react";
import { updateExtraCards } from "@/app/[lang]/(app)/settings/actions";
import { Switch } from "@/components/ui/switch";
import { useDictionary } from "@/i18n/client";
import { EXTRA_CARD_COUNTS, EXTRA_KINDS, type ExtraCards, type ExtraKind } from "@/lib/extra-cards";
import { EXTRA_HINT, EXTRA_LABEL, EXTRA_LIST, EXTRA_ROW, EXTRA_TEXT } from "./settings-parts";

/**
 * Die drei Schalter der Zusatzkarten. Jeder speichert beim Umlegen; solange
 * gespeichert wird, sind alle gesperrt. Klappt es nicht, springt der Schalter zurück.
 */
export function ExtraCardsSwitches({ initial }: { initial: ExtraCards }) {
  const t = useDictionary();
  const id = useId();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Wie beim Formular „Neue Karten pro Tag“: Die Rückmeldung bleibt beim Zurückkehren nicht stehen.
  useLayoutEffect(() => () => setMessage(null), []);

  function change(kind: ExtraKind, on: boolean) {
    if (pending) return;
    setMessage(null);
    setValues((v) => ({ ...v, [kind]: on }));
    const revert = () => setValues((v) => ({ ...v, [kind]: !on }));
    startTransition(async () => {
      try {
        const result = await updateExtraCards(kind, on);
        if (result.ok) {
          setMessage({ text: t.settings.extraCards.saved, ok: true });
        } else {
          revert();
          setMessage({ text: t.auth.fallback, ok: false });
        }
      } catch {
        revert();
        setMessage({ text: t.auth.noConnection, ok: false });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={EXTRA_LIST}>
        {EXTRA_KINDS.map((kind) => {
          const copy = t.settings.extraCards.kinds[kind];
          return (
            <label key={kind} className={EXTRA_ROW}>
              <span className={EXTRA_TEXT}>
                <span id={`${id}-${kind}`} className={EXTRA_LABEL}>
                  {copy.label}
                </span>
                <span id={`${id}-${kind}-hint`} className={EXTRA_HINT}>
                  {copy.hint(EXTRA_CARD_COUNTS[kind])}
                </span>
              </span>
              <Switch
                checked={values[kind]}
                disabled={pending}
                onCheckedChange={(on) => change(kind, on)}
                aria-labelledby={`${id}-${kind}`}
                aria-describedby={`${id}-${kind}-hint`}
              />
            </label>
          );
        })}
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
