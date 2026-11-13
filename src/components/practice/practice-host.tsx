"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { SessionCard } from "@/components/study/session-screen";
import { drawRound, matchesFilter, type PracticeGroup, type RangeId } from "@/lib/practice/filter";
import { mathRound, type MathSolution, type MathTask } from "@/lib/practice/math";
import type { PracticeSelection } from "@/lib/practice/selection";
import { MathRound } from "./math-round";
import { PracticeRoutesRound } from "./practice-routes-round";
import { useMarkRoundActive } from "./practice-round-store";
import { PracticeSelect } from "./practice-select";
import { PracticeSkeleton } from "./practice-skeleton";
import { readPracticeSelection, savePracticeSelection, subscribePracticeSelection } from "./selection-store";

/** Eine Karte für die Übung: Anzeige und Prüfung wie beim Lernen, dazu Rest und Gruppen für den Filter. */
export type PracticeCard = SessionCard & { rest: number; groups: PracticeGroup[] };

type Phase =
  | { kind: "select" }
  | { kind: "routes"; items: SessionCard[]; round: number }
  | { kind: "math"; tasks: MathTask[]; round: number };

// Die gespeicherte Auswahl kennt erst der Browser; bis dahin bleibt das Skeleton stehen,
// statt kurz die Vorauswahl zu zeigen und dann umzuspringen.
const serverSelection = () => null;

/**
 * Übungsseite im Browser. Wie die Lernsitzung beginnt jeder Aufruf über die App
 * frisch (bfcacheId als Schlüssel); Zurück/Vor stellt eine laufende Runde wieder her.
 */
type PracticeProps = {
  cards: PracticeCard[];
  solutions: Record<number, MathSolution>;
  /** Die wählbaren Bereiche; 171–230 nur mit dem Schalter „Reste über 170“. */
  ranges: RangeId[];
};

/** Die gemerkte Auswahl ohne Bereiche, die nicht angeboten werden; beim nächsten Speichern fallen sie weg. */
function offered(selection: PracticeSelection | null, ranges: readonly RangeId[]): PracticeSelection | null {
  if (!selection || selection.ranges.every((r) => ranges.includes(r))) return selection;
  return { ...selection, ranges: selection.ranges.filter((r) => ranges.includes(r)) };
}

export function PracticeHost(props: PracticeProps) {
  const { bfcacheId } = useRouter();
  return <PracticeView key={bfcacheId} {...props} />;
}

function PracticeView({ cards, solutions, ranges }: PracticeProps) {
  const stored = useSyncExternalStore(subscribePracticeSelection, readPracticeSelection, serverSelection);
  const selection = offered(stored, ranges);
  const [phase, setPhase] = useState<Phase>({ kind: "select" });
  useMarkRoundActive(phase.kind !== "select");

  // Jede Runde zieht neu; der Zähler gibt ihr einen eigenen Schlüssel, damit sie frisch beginnt.
  function start() {
    if (!selection) return;
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
      if (!selection) return <PracticeSkeleton />;
      return (
        <PracticeSelect
          cards={cards}
          ranges={ranges}
          selection={selection}
          onChange={savePracticeSelection}
          onStart={start}
        />
      );
    case "routes":
      return <PracticeRoutesRound key={phase.round} items={phase.items} onClose={close} onRestart={start} />;
    case "math":
      return (
        <MathRound key={phase.round} tasks={phase.tasks} solutions={solutions} onClose={close} onRestart={start} />
      );
  }
}
