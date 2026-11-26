import { useRef } from "react";
import { recordPractice } from "@/app/[lang]/(app)/practice/actions";
import { dayKey } from "@/lib/time";

/**
 * Meldet die erste geübte Karte einer Runde als Übungstag für die Serie, danach nichts mehr.
 * Läuft die Runde über Mitternacht, meldet die nächste Karte den neuen Berliner Tag. Still wie
 * die Serie beim Lernen: Scheitert das Speichern, läuft die Runde weiter und die nächste Karte
 * versucht es erneut.
 */
export function usePracticeDay(): () => void {
  const sent = useRef<string | null>(null);
  return () => {
    const today = dayKey(new Date());
    if (sent.current === today) return;
    sent.current = today;
    void recordPractice().catch(() => {
      if (sent.current === today) sent.current = null;
    });
  };
}
