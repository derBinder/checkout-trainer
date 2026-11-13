import type { RestDetail } from "@/components/study/card-view";
import type { Card } from "@/lib/darts/cards";

/**
 * Inhalte der Detailansicht je Rest: nur was das Sheet zeigt, ohne Fehlwurf-Karten
 * und -Fälle. Lerninhalt, deshalb nur im Datenbaustein nach der Zugriffsprüfung aufrufen.
 */
export function restDetails(cards: readonly Card[]): Record<number, RestDetail> {
  return Object.fromEntries(
    cards.flatMap((card): [number, RestDetail][] => {
      if (card.kind === "rest") {
        const { kind, rest, best, reason, breakdown, alternatives, twoDarts } = card;
        return [[rest, { kind, rest, best, reason, breakdown, alternatives, twoDarts }]];
      }
      if (card.kind === "bogey") {
        const { kind, rest, setup } = card;
        return [[rest, { kind, rest, setup }]];
      }
      return [];
    }),
  );
}
