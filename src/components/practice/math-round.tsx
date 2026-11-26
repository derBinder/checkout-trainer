"use client";

import { useReducer } from "react";
import { DartSlots } from "@/components/dart-slots";
import { BIG_NUMERAL, EYEBROW, NoteList } from "@/components/study/study-card";
import { StudyCloseButton } from "@/components/study/study-close-link";
import { SessionHeader, useContentFocus } from "@/components/study/session-header";
import { STUDY_CONTENT, STUDY_FOOTER, StudySurface } from "@/components/study/study-parts";
import { useWakeLock } from "@/components/study/use-wake-lock";
import { ResultLine } from "@/components/study/verdict";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/client";
import type { MathSolution, MathTask } from "@/lib/practice/math";
import { initMath, mathReducer } from "./math-state";
import { MathPad } from "./math-pad";
import { PracticeEnd } from "./practice-end";
import { usePracticeDay } from "./use-practice-day";

const MAX_DIGITS = 3;

/**
 * Übungsrunde „Rechnen“: Rest vor der Aufnahme und drei Würfe, der Nutzer tippt den
 * neuen Rest. Die Auflösung sagt, ob er checkbar ist (bester Weg) oder eine
 * Bogey-Zahl (Stellwurf). Kopfzeile und Maße wie im Lernbildschirm.
 */
export function MathRound({
  tasks,
  solutions,
  onClose,
  onRestart,
}: {
  tasks: MathTask[];
  solutions: Record<number, MathSolution>;
  onClose: () => void;
  onRestart: () => void;
}) {
  const t = useDictionary();
  const tm = t.practice.math;
  const [state, dispatch] = useReducer(mathReducer, tasks, initMath);
  const task = tasks[state.index];
  const markPracticed = usePracticeDay();

  // Wie beim Lernen: Der Bildschirm bleibt an, solange Aufgaben offen sind.
  useWakeLock(task !== undefined);

  // Fokus auf den neuen Inhalt, wie im Lernbildschirm: Der gedrückte Knopf verschwindet.
  const contentRef = useContentFocus(`${state.index}:${state.revealed}`);

  if (!task) {
    return (
      <PracticeEnd
        title={t.practice.roundDone}
        result={tm.score(state.correct, tasks.length)}
        onClose={onClose}
        onRestart={onRestart}
      />
    );
  }

  const solution = solutions[task.rest];

  return (
    <StudySurface>
      <SessionHeader
        close={<StudyCloseButton label={t.practice.closeLabel} onClick={onClose} />}
        done={state.index}
        total={tasks.length}
        progressText={t.practice.progressText}
      />

      <div ref={contentRef} tabIndex={-1} className={STUDY_CONTENT}>
        <div className="my-auto flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className={EYEBROW}>{t.study.card.score}</p>
              <p className={BIG_NUMERAL}>{task.start}</p>
            </div>
            <DartSlots slots={task.throws} />
          </div>

          {state.revealed ? (
            <div className="flex flex-col gap-3">
              {state.right ? (
                <ResultLine tone="strong" title={tm.right} note={tm.rightNote(task.rest)} />
              ) : (
                <ResultLine tone="bad" title={tm.wrong(task.rest)} note={tm.wrongNote(Number(state.input))} />
              )}
              {solution?.kind === "finish" && (
                <div className="flex flex-col gap-1.5">
                  <p className="type-label">{tm.checkable}</p>
                  <DartSlots slots={solution.route} tone="best" size="sm" label={tm.checkable} />
                </div>
              )}
              {solution?.kind === "bogey" && (
                <div className="flex flex-col gap-1.5">
                  <p className="type-label">{tm.bogey}</p>
                  <DartSlots slots={solution.throws} tone="none" size="sm" label={t.study.card.setupShot} />
                  <NoteList
                    compact
                    notes={[{ title: t.study.card.setupShot, text: t.study.card.afterwards(solution.leaves) }]}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="type-label">{tm.question}</p>
              <output
                aria-label={tm.answer}
                aria-live="polite"
                className="flex h-14 w-36 items-center justify-center rounded-pill border-2 border-foreground font-heading text-4xl font-extrabold tabular-nums"
              >
                {state.input}
              </output>
            </div>
          )}
        </div>
      </div>

      <footer className={STUDY_FOOTER}>
        {state.revealed ? (
          <Button size="xl" className="w-full" onClick={() => dispatch({ type: "next", at: performance.now() })}>
            {t.practice.next}
          </Button>
        ) : (
          <MathPad
            digitsDisabled={state.input.length >= MAX_DIGITS}
            zeroDisabled={state.input === "" || state.input.length >= MAX_DIGITS}
            deleteDisabled={state.input === ""}
            checkDisabled={state.input === ""}
            onDigit={(d) => dispatch({ type: "digit", d })}
            onDelete={() => dispatch({ type: "delete" })}
            onCheck={() => {
              markPracticed();
              dispatch({ type: "check", at: performance.now() });
            }}
          />
        )}
      </footer>
    </StudySurface>
  );
}
