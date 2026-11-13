import { cardView } from "@/components/study/card-view";
import { getDictionary } from "@/i18n/server";
import { requireActiveUser } from "@/lib/auth/guard";
import { CARDS, cardsFor } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";
import { db } from "@/lib/db";
import { loadExtraCards } from "@/lib/extra-cards-db";
import { availableRanges, practiceGroups } from "@/lib/practice/filter";
import { mathSolutions } from "@/lib/practice/math";
import { PracticeHost, type PracticeCard } from "./practice-host";

/**
 * Prüft zuerst den Zugriff, dann gibt er die Karten fertig für die Anzeige an den
 * Browser, der filtert und zieht. Freies Üben umfasst auch Karten, die im Lernplan
 * noch nicht freigeschaltet sind, aber nur Zusatzkarten eingeschalteter Arten.
 */
export async function PracticeData() {
  const user = await requireActiveUser();
  const [t, extras] = await Promise.all([getDictionary().then((d) => d.study), loadExtraCards(db, user.id)]);
  const cards: PracticeCard[] = cardsFor(extras).map((card) => ({
    id: card.id,
    rest: card.rest,
    groups: practiceGroups(card),
    view: cardView(card, t),
    check: checkFor(card),
  }));
  return <PracticeHost cards={cards} solutions={mathSolutions(CARDS)} ranges={availableRanges(extras)} />;
}
