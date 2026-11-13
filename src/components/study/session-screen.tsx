"use client";

import { useState } from "react";
import { judge, type Answer, type Check } from "@/lib/darts/judge";
import type { SessionState } from "@/lib/srs/session";
import type { CardView } from "./card-view";
import { initInput, inputReducer, type InputAction, type InputState } from "./route-input";
import { StudyCard } from "./study-card";
import { SessionHeader, useContentFocus } from "./session-header";
import { STUDY_CONTENT, STUDY_FOOTER, StudySurface as Surface } from "./study-parts";
import { QuestionFooter, StudyQuestion, fixedDarts } from "./study-question";
import { useWakeLock } from "./use-wake-lock";

/** Eine Karte einer Sitzung, fertig für die Anzeige, und wogegen eine Antwort geprüft wird. */
export type SessionCard = { id: string; view: CardView; check: Check };

/**
 * Der Lernbildschirm einer laufenden Sitzung, ohne Speichern: Kopfzeile, Frage mit
 * Eingabe bzw. Auflösung, Fußzeile. Lernen und Üben nutzen ihn gleich; sie reichen
 * das Schließen und die Leiste unter der Auflösung herein.
 */
export function SessionScreen({
  current,
  session,
  answer,
  close,
  progressText,
  hints,
  revealedFooter,
  onReveal,
}: {
  current: SessionCard;
  session: SessionState;
  /** Eingegebene Antwort der aufgedeckten Karte; null, wenn ohne Eingabe aufgedeckt. */
  answer: Answer | null;
  close: React.ReactNode;
  /** Fortschritt für Screenreader, etwa „3 von 10 Karten gelernt“. */
  progressText: (done: number, total: number) => string;
  /** Hinweise über der Fußzeile (Speichern). */
  hints?: React.ReactNode;
  /** Leiste unter der Auflösung (Bewertungen bzw. „Nochmal“ und „Weiter“). */
  revealedFooter: React.ReactNode;
  onReveal: (answer?: Answer) => void;
}) {
  // Am Board liegt das Handy oft eine Weile: Der Bildschirm bleibt an, solange Karten offen sind.
  useWakeLock(true);

  // Eingabe der aktuellen Runde. Jede Runde einer Karte (auch nach „Nochmal“) beginnt leer:
  // Wechselt der Rundenschlüssel, wird der Zustand noch während des Renderns neu gesetzt.
  const round = `${current.id}:${session.done}:${session.total}`;
  const [inputRound, setInputRound] = useState(round);
  const [input, setInput] = useState<InputState>(() => initInput(current.check));
  if (inputRound !== round) {
    setInputRound(round);
    setInput(initInput(current.check));
  }
  const onInput = (a: InputAction) => setInput((s) => inputReducer(s, a));

  // Fokus auf den neuen Inhalt, damit Tastatur und Screenreader folgen.
  const contentRef = useContentFocus(`${current.id}:${session.revealed}:${session.total}`);

  return (
    <Surface>
      <SessionHeader close={close} done={session.done} total={session.total} progressText={progressText} />

      <div ref={contentRef} tabIndex={-1} className={STUDY_CONTENT}>
        {/* my-auto statt justify-center: mittig in der freien Fläche, bei Überlänge oben beginnend. */}
        <div className="my-auto">
          {session.revealed ? (
            <StudyCard
              view={current.view}
              result={
                answer
                  ? { verdict: judge(current.check, answer), answer, fixed: fixedDarts(current.view) }
                  : undefined
              }
            />
          ) : (
            <StudyQuestion view={current.view} input={input} onAction={onInput} />
          )}
        </div>
      </div>

      <footer className={STUDY_FOOTER}>
        {hints}
        {session.revealed ? (
          revealedFooter
        ) : (
          <QuestionFooter check={current.check} input={input} onReveal={onReveal} />
        )}
      </footer>
    </Surface>
  );
}
