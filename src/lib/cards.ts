import type { Card } from '@/lib/darts/cards'
import generated from '@/data/cards.generated.json'

/** Die erzeugten Karten (npm run generate:cards) in Lernreihenfolge. */
export const CARDS = generated as Card[]
export const CARD_ORDER: string[] = CARDS.map((c) => c.id)

const BY_ID = new Map(CARDS.map((c) => [c.id, c]))

export function cardById(id: string): Card | undefined {
  return BY_ID.get(id)
}
