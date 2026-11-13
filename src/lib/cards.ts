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
const FILTERED = new Map<string, Card[]>()
const ORDERS = new Map<string, string[]>()

const keyOf = (extras: ExtraCards) => EXTRA_KINDS.map((kind) => (extras[kind] ? 1 : 0)).join('')

/**
 * Die Karten eines Nutzers in Lernreihenfolge: alle Grundkarten und die Zusatzkarten
 * der eingeschalteten Schalter. Die eine Stelle, an der nach Schaltern gefiltert wird.
 */
export function cardsFor(extras: ExtraCards): Card[] {
  const key = keyOf(extras)
  let cards = FILTERED.get(key)
  if (!cards) {
    cards = CARDS.filter((c) => isCardOn(c, extras))
    FILTERED.set(key, cards)
  }
  return cards
}

export function cardOrderFor(extras: ExtraCards): string[] {
  const key = keyOf(extras)
  let order = ORDERS.get(key)
  if (!order) {
    order = cardsFor(extras).map((c) => c.id)
    ORDERS.set(key, order)
  }
  return order
}
