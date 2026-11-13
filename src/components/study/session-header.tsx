"use client";

import { useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { useDictionary } from "@/i18n/client";
import { STUDY_COUNTER, STUDY_HEADER, STUDY_HEADER_ROW } from "./study-parts";

/**
 * Kopfzeile einer laufenden Sitzung oder Übungsrunde: Schließen, Zähler „3 / 10“
 * und die Fortschrittslinie. Lernen, „Wege“ und „Rechnen“ nutzen dieselbe.
 */
export function SessionHeader({
  close,
  done,
  total,
  progressText,
}: {
  close: React.ReactNode;
  done: number;
  total: number;
  /** Fortschritt für Screenreader, etwa „3 von 10 Karten gelernt“. */
  progressText: (done: number, total: number) => string;
}) {
  const t = useDictionary().study;
  return (
    <header className={STUDY_HEADER}>
      <div className={STUDY_HEADER_ROW}>
        {close}
        <p className={STUDY_COUNTER}>
          {Math.min(done + 1, total)} / {total}
        </p>
      </div>
      <Progress
        value={done}
        max={total}
        aria-label={t.session.progress}
        getAriaValueText={() => progressText(done, total)}
      />
    </header>
  );
}

/**
 * Fokus auf die Inhaltsfläche, sobald sich `step` ändert (neue Frage, Auflösung):
 * Der gedrückte Knopf verschwindet, Tastatur und Screenreader folgen dem Inhalt.
 * Beim ersten Anzeigen bleibt der Fokus, wo er ist.
 */
export function useContentFocus(step: string) {
  const ref = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollTo({ top: 0 });
  }, [step]);
  return ref;
}
