import type { Card } from '@/lib/darts/cards'
import generated from '@/data/cards.generated.json'
import { EXTRA_KINDS, isCardOn, type ExtraCards } from '@/lib/extra-cards'

/** Die erzeugten Karten (npm run generate:cards) in Lernreihenfolge, mit allen Zusatzkarten. */
export const CARDS = generated as Card[]
export const CARD_ORDER: string[] = CARDS.map((c) => c.id)

const BY_ID = new Map(CARDS.map((c) => [c.id, c]))

export function cardById(id: string): Card | undefined {
  return BY_ID.get(id)
}

/** Je Kombination der Schalter einmal gefiltert; es gibt nur acht. */
const FILTERED = new Map<string, { cards: Card[]; order: string[] }>()

const keyOf = (extras: ExtraCards) => EXTRA_KINDS.map((kind) => (extras[kind] ? 1 : 0)).join('')

function filtered(extras: ExtraCards) {
  const key = keyOf(extras)
  let entry = FILTERED.get(key)
  if (!entry) {
    const cards = CARDS.filter((c) => isCardOn(c, extras))
    entry = { cards, order: cards.map((c) => c.id) }
    FILTERED.set(key, entry)
  }
  return entry
}

/**
 * Die Karten eines Nutzers in Lernreihenfolge: alle Grundkarten und die Zusatzkarten
 * der eingeschalteten Schalter. Die eine Stelle, an der nach Schaltern gefiltert wird.
 */
export function cardsFor(extras: ExtraCards): Card[] {
  return filtered(extras).cards
}

export function cardOrderFor(extras: ExtraCards): string[] {
  return filtered(extras).order
}
