import { isBogey } from '@/lib/darts/checkouts'
import { dartValue, formatDart, type Route } from '@/lib/darts/model'
import { referenceRoute } from '@/lib/darts/reference'
import { bestSetup, followUp, halvings, rankCheckouts, type Follow } from '@/lib/darts/scoring'

export type FollowText =
  | { kind: 'finish'; route: string[] }
  | { kind: 'setup'; throws: string[]; leaves: number }

export type SingleCase = {
  dartIndex: 0 | 1
  aimed: string
  hit: string
  newRest: number
  dartsLeft: 1 | 2
  follow: FollowText
}

export type RestCard = {
  id: string
  kind: 'rest'
  rest: number
  best: string[]
  reason: string
  alternatives: string[][]
  singleCases: SingleCase[]
}

export type MissCard = {
  id: string
  kind: 'miss'
  rest: number
  thrown: string[]
  aimed: string
  hit: string
  newRest: number
  dartsLeft: 1 | 2
  follow: FollowText
}

export type BogeyCard = {
  id: string
  kind: 'bogey'
  rest: number
  setup: { throws: string[]; leaves: number }
}

export type Card = RestCard | MissCard | BogeyCard

const MIN_REST = 2
const MAX_REST = 170
const MAX_ALTERNATIVES = 2
const TIMES = ['Kürzester Weg.', 'einmal', 'zweimal', 'dreimal', 'viermal']

const fmt = (route: Route): string[] => route.map(formatDart)

function followText(follow: Follow): FollowText {
  return follow.kind === 'finish'
    ? { kind: 'finish', route: fmt(follow.route) }
    : { kind: 'setup', throws: fmt(follow.setup.throws), leaves: follow.setup.leaves }
}

function singleCases(rest: number, best: Route): SingleCase[] {
  const cases: SingleCase[] = []
  let remaining = rest
  best.forEach((dart, i) => {
    if ((i === 0 || i === 1) && dart.ring === 'T') {
      const newRest = remaining - dart.n
      const dartsLeft = (2 - i) as 1 | 2
      cases.push({
        dartIndex: i,
        aimed: formatDart(dart),
        hit: formatDart({ ring: 'S', n: dart.n }),
        newRest,
        dartsLeft,
        follow: followText(followUp(newRest, dartsLeft, referenceRoute)),
      })
    }
    remaining -= dartValue(dart)
  })
  return cases
}

function reasonFor(best: Route, cases: SingleCase[]): string {
  const first = cases[0]
  if (first) {
    const field = first.hit.slice(1)
    if (first.follow.kind === 'finish') {
      const last = first.follow.route[first.follow.route.length - 1]
      return last === 'Bull'
        ? `Bleibt bei Single ${field} auf Bull-Finish.`
        : `Bleibt bei Single ${field} auf einem Finish.`
    }
  }
  if (best.length === 1) return 'Direkt auf das Doppel.'
  const last = best[best.length - 1]
  const count = halvings(last)
  if (count === 0) return TIMES[0]
  return `Endet auf ${formatDart(last)}, das sich ${TIMES[count]} halbieren lässt.`
}

function restCard(rest: number, best: Route): RestCard {
  const bestText = fmt(best)
  const alternatives = rankCheckouts(rest, 3)
    .filter((r) => r.length <= best.length + 1)
    .map(fmt)
    .filter((r) => r.join(' ') !== bestText.join(' '))
    .slice(0, MAX_ALTERNATIVES)
  const cases = singleCases(rest, best)
  return {
    id: `r-${rest}`,
    kind: 'rest',
    rest,
    best: bestText,
    reason: reasonFor(best, cases),
    alternatives,
    singleCases: cases,
  }
}

function missCards(rest: number, best: Route, cases: SingleCase[]): MissCard[] {
  return cases.map((c) => ({
    id: `m-${rest}-${c.dartIndex}`,
    kind: 'miss',
    rest,
    thrown: [...fmt(best.slice(0, c.dartIndex)), c.hit],
    aimed: c.aimed,
    hit: c.hit,
    newRest: c.newRest,
    dartsLeft: c.dartsLeft,
    follow: c.follow,
  }))
}

/** Alle Karten in Lernreihenfolge: aufsteigend nach Rest, je Rest erst die Rest- oder Bogey-Karte, dann die Fehlwurf-Karten. */
export function buildCards(): Card[] {
  const cards: Card[] = []
  for (let rest = MIN_REST; rest <= MAX_REST; rest++) {
    if (isBogey(rest)) {
      const setup = bestSetup(rest, 3)
      cards.push({
        id: `b-${rest}`,
        kind: 'bogey',
        rest,
        setup: { throws: fmt(setup.throws), leaves: setup.leaves },
      })
      continue
    }
    const best = referenceRoute(rest)
    if (!best) throw new Error(`Kein Referenzweg für Rest ${rest}`)
    const card = restCard(rest, best)
    cards.push(card, ...missCards(rest, best, card.singleCases))
  }
  return cards
}
