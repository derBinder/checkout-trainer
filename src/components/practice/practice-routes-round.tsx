"use client";

import { useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import { SessionScreen, type SessionCard } from "@/components/study/session-screen";
import { StudyCloseButton } from "@/components/study/study-close-link";
import { initStudy, studyReducer } from "@/components/study/study-state";
import { useDictionary } from "@/i18n/client";
import type { Answer } from "@/lib/darts/judge";
import { PracticeEnd } from "./practice-end";

/**
 * Übungsrunde „Wege“: der Lernbildschirm ohne Speichern. Statt der Bewertungen
 * „Nochmal“ (die Karte kommt in dieser Runde wieder) und „Weiter“.
 */
export function PracticeRoutesRound({
  items,
  onClose,
  onRestart,
}: {
  items: SessionCard[];
  onClose: () => void;
  onRestart: () => void;
}) {
  const t = useDictionary().practice;
  const [byId] = useState(() => new Map(items.map((item) => [item.id, item])));
  const [state, dispatch] = useReducer(studyReducer, items, (list) =>
    initStudy(
      list.map((item) => item.id),
      {},
      { save: false },
    ),
  );
  const { session } = state;
  const current = session.queue[0] ? byId.get(session.queue[0]) : undefined;

  if (!current) {
    return (
      <PracticeEnd title={t.roundDone} result={t.cardsPracticed(session.done)} onClose={onClose} onRestart={onRestart} />
    );
  }

  const rate = (rating: 1 | 3) => dispatch({ type: "rate", rating, at: performance.now() });
  return (
    <SessionScreen
      current={current}
      session={session}
      answer={state.answer}
      close={<StudyCloseButton label={t.closeLabel} onClick={onClose} />}
      progressText={t.progressText}
      onReveal={(answer?: Answer) => dispatch({ type: "reveal", at: performance.now(), answer })}
      revealedFooter={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="xl" className="w-full" onClick={() => rate(1)}>
            {t.again}
          </Button>
          <Button size="xl" className="w-full" onClick={() => rate(3)}>
            {t.next}
          </Button>
        </div>
      }
    />
  );
}
