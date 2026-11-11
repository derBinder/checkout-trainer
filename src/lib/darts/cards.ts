import { allCheckouts, isBogey } from '@/lib/darts/checkouts'
import {
  dartValue,
  formatDart,
  formatStep,
  isSplit,
  type Dart,
  type Steps,
} from '@/lib/darts/model'
import {
  chartAlternative,
  chartTwoDarts,
  isChartRest,
  referenceRoute,
} from '@/lib/darts/reference'
import { bestSetup, halvings, rankCheckouts } from '@/lib/darts/scoring'

/** Folgeweg; route kann ein geteilter Weg sein ("16/8", "D16/D20"). */
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
  /** Der Weg der Tabellenspalte „mit 2 Darts“, wenn sie einen nennt (nur 41 bis 170). */
  twoDarts?: string[]
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
const TIMES = ['', 'einmal', 'zweimal', 'dreimal', 'viermal']
const FALLBACK_REASON = 'Der übliche Weg nach Tabelle.'

const fmt = (route: Steps): string[] => route.map(formatStep)

function setupFollow(rest: number, darts: 1 | 2): FollowText {
  const setup = bestSetup(rest, darts)
  return { kind: 'setup', throws: fmt(setup.throws), leaves: setup.leaves }
}

/**
 * Weg nach einem Single statt Triple, mit `darts` Darts in der Hand.
 * Zwei Darts: Spalte „mit 2 Darts“ der Tabelle, sonst Variante 1, wenn sie höchstens
 * zwei Schritte hat, bis 40 der eigene Weg, sonst Stellwurf.
 * Ein Dart: das Ein-Dart-Finish (Doppel oder Bull), sonst Stellwurf.
 */
function followAfterSingle(rest: number, darts: 1 | 2): FollowText {
  if (darts === 1) {
    if (rest === 50) return { kind: 'finish', route: ['Bull'] }
    if (rest % 2 === 0 && rest <= 40) return { kind: 'finish', route: [`D${rest / 2}`] }
    return setupFollow(rest, 1)
  }
  const two = chartTwoDarts(rest)
  if (two) return { kind: 'finish', route: fmt(two) }
  // 41 bis 170: Variante 1; 2 bis 40: der eigene Weg (dort immer höchstens zwei Darts).
  const best = referenceRoute(rest)
  if (best && best.length <= 2) return { kind: 'finish', route: fmt(best) }
  return setupFollow(rest, 2)
}

/** Ein Fall je Triple an Stelle 0 oder 1 des besten Wegs; geteilte Schritte ergeben keinen Fall. */
function singleCases(rest: number, best: Steps): SingleCase[] {
  const cases: SingleCase[] = []
  let remaining = rest
  for (const [i, step] of best.slice(0, 2).entries()) {
    if (isSplit(step)) break
    if (step.ring === 'T') {
      const newRest = remaining - step.n
      const dartsLeft = (2 - i) as 1 | 2
      cases.push({
        dartIndex: i as 0 | 1,
        aimed: formatDart(step),
        hit: formatDart({ ring: 'S', n: step.n }),
        newRest,
        dartsLeft,
        follow: followAfterSingle(newRest, dartsLeft),
      })
    }
    remaining -= dartValue(step)
  }
  return cases
}

/** Anzahl verschiedener Wege; Vertauschungen derselben Darts zählen als einer. */
function distinctRoutes(rest: number): number {
  const keys = allCheckouts(rest, 3).map((route) => route.map(formatDart).sort().join(' '))
  return new Set(keys).size
}

function reasonFor(rest: number, best: Steps, cases: SingleCase[]): string {
  if (distinctRoutes(rest) === 1) return 'Der einzige Weg.'
  const split = best.find(isSplit)
  if (split) {
    const [a, b] = split.split
    return `Zwischen ${a.n} und ${b.n} gezielt lässt jedes der beiden Felder ein Doppel.`
  }
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
  const last = best[best.length - 1] as Dart
  const count = halvings(last)
  if (count === 0) return FALLBACK_REASON
  return `Endet auf ${formatDart(last)}, das sich ${TIMES[count]} halbieren lässt.`
}

const isPlainSingle = (d: Dart) => d.ring === 'S' && d.n <= 20

/** 41 bis 170: Variante 2 der Tabelle oder keine. Darunter bis zu zwei gleich kurze Wege aus lauter einfachen Singles vor dem Doppel. */
function alternativesFor(rest: number, best: Steps): Steps[] {
  if (isChartRest(rest)) {
    const alternative = chartAlternative(rest)
    return alternative ? [alternative] : []
  }
  const key = fmt(best).join(' ')
  return rankCheckouts(rest, 3)
    .filter(
      (r) =>
        r.length === best.length &&
        r.slice(0, -1).every(isPlainSingle) &&
        r.map(formatDart).join(' ') !== key,
    )
    .slice(0, MAX_ALTERNATIVES)
}

function restCard(rest: number, best: Steps): RestCard {
  const bestText = fmt(best)
  const alternatives = alternativesFor(rest, best).map(fmt)
  const two = chartTwoDarts(rest)
  const cases = singleCases(rest, best)
  return {
    id: `r-${rest}`,
    kind: 'rest',
    rest,
    best: bestText,
    reason: reasonFor(rest, best, cases),
    alternatives,
    ...(two ? { twoDarts: fmt(two) } : {}),
    singleCases: cases,
  }
}

function missCards(rest: number, best: Steps, cases: SingleCase[]): MissCard[] {
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
