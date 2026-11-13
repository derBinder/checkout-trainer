"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { EndHeading } from "@/components/study/end-heading";
import { StudySurface } from "@/components/study/study-parts";
import { TAP_GUARD_MS } from "@/components/study/study-state";
import { useDictionary } from "@/i18n/client";

/** Ende einer Übungsrunde, wie das Ende der Lernsitzung: Ergebnis, neue Runde oder fertig. */
export function PracticeEnd({
  title,
  result,
  onClose,
  onRestart,
}: {
  title: string;
  result: string;
  onClose: () => void;
  onRestart: () => void;
}) {
  const t = useDictionary().practice;
  // „Weiter“ der letzten Aufgabe liegt dort, wo jetzt „Fertig“ steht: Ein Doppeltipp
  // darf das Ergebnis nicht gleich wieder wegklicken.
  const shownAt = useRef<number | null>(null);
  useEffect(() => {
    shownAt.current = performance.now();
  }, []);
  const guarded = (action: () => void) => () => {
    if (shownAt.current === null || performance.now() - shownAt.current < TAP_GUARD_MS) return;
    action();
  };
  return (
    <StudySurface className="px-page pt-screen-top pb-inset-bottom">
      <div className="flex flex-1 flex-col gap-5">
        <EndHeading>{title}</EndHeading>
        <p className="text-lg font-medium text-muted-foreground">{result}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button size="xl" className="w-full" onClick={guarded(onRestart)}>
          {t.anotherRound}
        </Button>
        <Button variant="secondary" size="xl" className="w-full" onClick={guarded(onClose)}>
          {t.finish}
        </Button>
      </div>
    </StudySurface>
  );
}
