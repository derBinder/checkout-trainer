"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { SessionCard } from "@/components/study/session-screen";
import { drawRound, matchesFilter, type PracticeGroup } from "@/lib/practice/filter";
import { mathRound, type MathSolution, type MathTask } from "@/lib/practice/math";
import { DEFAULT_SELECTION } from "@/lib/practice/selection";
import { MathRound } from "./math-round";
import { PracticeRoutesRound } from "./practice-routes-round";
import { useMarkRoundActive } from "./practice-round-store";
import { PracticeSelect } from "./practice-select";
import { readPracticeSelection, savePracticeSelection, subscribePracticeSelection } from "./selection-store";

/** Eine Karte für die Übung: Anzeige und Prüfung wie beim Lernen, dazu Rest und Gruppen für den Filter. */
export type PracticeCard = SessionCard & { rest: number; groups: PracticeGroup[] };

type Phase =
  | { kind: "select" }
  | { kind: "routes"; items: SessionCard[]; round: number }
  | { kind: "math"; tasks: MathTask[]; round: number };

const serverSelection = () => DEFAULT_SELECTION;

/**
 * Übungsseite im Browser. Wie die Lernsitzung beginnt jeder Aufruf über die App
 * frisch (bfcacheId als Schlüssel); Zurück/Vor stellt eine laufende Runde wieder her.
 */
export function PracticeHost(props: { cards: PracticeCard[]; solutions: Record<number, MathSolution> }) {
  const { bfcacheId } = useRouter();
  return <PracticeView key={bfcacheId} {...props} />;
}

function PracticeView({ cards, solutions }: { cards: PracticeCard[]; solutions: Record<number, MathSolution> }) {
  const selection = useSyncExternalStore(subscribePracticeSelection, readPracticeSelection, serverSelection);
  const [phase, setPhase] = useState<Phase>({ kind: "select" });
  useMarkRoundActive(phase.kind !== "select");

  // Jede Runde zieht neu; der Zähler gibt ihr einen eigenen Schlüssel, damit sie frisch beginnt.
  function start() {
    const round = phase.kind === "select" ? 1 : phase.round + 1;
    if (selection.exercise === "math") {
      setPhase({ kind: "math", tasks: mathRound(Math.random), round });
      return;
    }
    const items = drawRound(
      cards.filter((card) => matchesFilter(card, selection)),
      Math.random,
    );
    if (items.length > 0) setPhase({ kind: "routes", items, round });
  }
  const close = () => setPhase({ kind: "select" });

  switch (phase.kind) {
    case "select":
      return <PracticeSelect cards={cards} selection={selection} onChange={savePracticeSelection} onStart={start} />;
    case "routes":
      return <PracticeRoutesRound key={phase.round} items={phase.items} onClose={close} onRestart={start} />;
    case "math":
      return (
        <MathRound key={phase.round} tasks={phase.tasks} solutions={solutions} onClose={close} onRestart={start} />
      );
  }
}
