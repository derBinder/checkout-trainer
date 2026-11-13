import { cardView } from "@/components/study/card-view";
import { getDictionary } from "@/i18n/server";
import { requireActiveUser } from "@/lib/auth/guard";
import { CARDS, cardsFor } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";
import { NO_EXTRA_CARDS } from "@/lib/extra-cards";
import { practiceGroups } from "@/lib/practice/filter";
import { mathSolutions } from "@/lib/practice/math";
import { PracticeHost, type PracticeCard } from "./practice-host";

/**
 * Prüft zuerst den Zugriff, dann gibt er alle Karten fertig für die Anzeige an den
 * Browser, der filtert und zieht. Freies Üben umfasst auch Karten, die im Lernplan
 * noch nicht freigeschaltet sind; Nutzerdaten braucht es dafür nicht.
 */
export async function PracticeData() {
  await requireActiveUser();
  const t = (await getDictionary()).study;
  const cards: PracticeCard[] = cardsFor(NO_EXTRA_CARDS).map((card) => ({
    id: card.id,
    rest: card.rest,
    groups: practiceGroups(card),
    view: cardView(card, t),
    check: checkFor(card),
  }));
  return <PracticeHost cards={cards} solutions={mathSolutions(CARDS)} />;
}
