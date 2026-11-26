import { useRef } from "react";
import { recordPractice } from "@/app/[lang]/(app)/practice/actions";

/**
 * Meldet die erste geübte Karte einer Runde als Übungstag für die Serie, danach nichts mehr.
 * Still wie die Serie beim Lernen: Scheitert das Speichern, läuft die Runde weiter und der
 * Tag zählt nicht.
 */
export function usePracticeDay(): () => void {
  const sent = useRef(false);
  return () => {
    if (sent.current) return;
    sent.current = true;
    void recordPractice().catch(() => {});
  };
}
