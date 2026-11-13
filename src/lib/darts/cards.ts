import { allCheckouts, isBogey } from '@/lib/darts/checkouts'
import {
  dartValue,
  formatDart,
  formatStep,
  isSplit,
  parseDart,
  type Dart,
  type Steps,
} from '@/lib/darts/model'
import {
  chartAlternative,
  chartTwoDarts,
  isChartRest,
  referenceRoute,
} from '@/lib/darts/reference'
import { bestSetup, rankCheckouts } from '@/lib/darts/scoring'

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

/**
 * Warum dieser Weg, wo es keine Zerlegung gibt (Ein-Dart-Weg, geteilter erster Dart):
 * strukturierter Fall, den das Wörterbuch je Sprache in einen Satz fasst.
 */
export type Reason = { kind: 'only' } | { kind: 'direct' } | { kind: 'split'; a: number; b: number }

/**
 * Der beste Weg als erster Dart plus der Rest, der dann bleibt, mit den übrigen Darts.
 * `route` ist der Weg, den dieser Rest mit den übrigen Darts lehrt; er fehlt, wenn der
 * beste Weg danach anders weitergeht (verkürzte Zerlegung).
 */
export type Breakdown = {
  first: string
  after: number
  dartsLeft: 1 | 2
  route?: string[]
}

export type RestCard = {
  id: string
  kind: 'rest'
  rest: number
  best: string[]
  /** Genau eins von beiden: die Zerlegung, sonst (Ein-Dart-Weg, geteilter erster Dart) die Begründung. */
  breakdown?: Breakdown
  reason?: Reason
  alternatives: string[][]
  /** Der Weg der Tabellenspalte „mit 2 Darts“, wenn sie einen nennt (nur 41 bis 170). */
  twoDarts?: string[]
  singleCases: SingleCase[]
}

export type MissCard = {
  id: string
  kind: 'miss'
  /**
   * Zusatzkarten, die wie Fehlwurf-Karten gefragt werden: Nachbarfeld statt Triple
   * (`neighbour`) oder Single statt Doppel (`singleDouble`). Ohne Angabe Single statt Triple.
   */
  variant?: 'neighbour' | 'singleDouble'
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

/** Rest mit noch zwei Darts in der Hand: der Weg der Spalte „mit 2 Darts“ oder der Stellwurf. */
export type TwoDartCard = {
  id: string
  kind: 'two'
  rest: number
  follow: FollowText
}

/** Rest über 170: der Stellwurf mit bis zu drei Darts. */
export type OverCard = {
  id: string
  kind: 'over'
  rest: number
  setup: { throws: string[]; leaves: number }
}

export type Card = RestCard | MissCard | BogeyCard | TwoDartCard | OverCard

const MIN_REST = 2
const MAX_REST = 170
const MAX_ALTERNATIVES = 2
const MAX_OVER = 230
const MIN_DOUBLE = 2
const MAX_DOUBLE = 20

/** Nachbarfelder der Triples, auf die Nachbarfeld-Karten zielen, in Lernreihenfolge. */
const NEIGHBOURS: Record<number, [number, number]> = { 20: [1, 5], 19: [7, 3] }

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

/** Begründung für Wege ohne Zerlegung: Ein-Dart-Weg oder geteilter erster Dart. */
function reasonFor(rest: number, best: Steps): Reason {
  if (distinctRoutes(rest) === 1) return { kind: 'only' }
  const [first] = best
  if (isSplit(first)) return { kind: 'split', a: first.split[0].n, b: first.split[1].n }
  return { kind: 'direct' }
}

function breakdownFor(rest: number, best: Steps): Breakdown | undefined {
  const [first, ...tail] = best
  if (tail.length === 0 || isSplit(first)) return undefined
  const after = rest - dartValue(first)
  const dartsLeft = tail.length as 1 | 2
  const taught = followAfterSingle(after, dartsLeft)
  const same = taught.kind === 'finish' && taught.route.join(' ') === fmt(tail).join(' ')
  return { first: formatDart(first), after, dartsLeft, ...(same ? { route: taught.route } : {}) }
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
  const breakdown = breakdownFor(rest, best)
  return {
    id: `r-${rest}`,
    kind: 'rest',
    rest,
    best: bestText,
    ...(breakdown ? { breakdown } : { reason: reasonFor(rest, best) }),
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

/** Je Fehlwurf-Fall auf T20 oder T19 zwei Karten: statt des Singles fällt ein Nachbarfeld. */
function neighbourCards(rest: number, best: Steps, cases: SingleCase[]): MissCard[] {
  return cases.flatMap((c) => {
    const aimed = parseDart(c.aimed)
    const fields = NEIGHBOURS[aimed.n]
    if (!fields) return []
    return fields.flatMap((n): MissCard[] => {
      const newRest = c.newRest + aimed.n - n
      if (newRest < MIN_REST) return []
      const hit = formatDart({ ring: 'S', n })
      return [
        {
          id: `n-${rest}-${c.dartIndex}-${hit}`,
          kind: 'miss',
          variant: 'neighbour',
          rest,
          thrown: [...fmt(best.slice(0, c.dartIndex)), hit],
          aimed: c.aimed,
          hit,
          newRest,
          dartsLeft: c.dartsLeft,
          follow: followAfterSingle(newRest, c.dartsLeft),
        },
      ]
    })
  })
}

/** Man steht auf dem Rest eines Doppels, zielt mit drei Darts darauf und trifft das Single. */
function singleDoubleCard(n: number): MissCard {
  const hit = formatDart({ ring: 'S', n })
  return {
    id: `d-${n}`,
    kind: 'miss',
    variant: 'singleDouble',
    rest: 2 * n,
    thrown: [hit],
    aimed: formatDart({ ring: 'D', n }),
    hit,
    newRest: n,
    dartsLeft: 2,
    follow: followAfterSingle(n, 2),
  }
}

function overCard(rest: number): OverCard {
  const setup = bestSetup(rest, 3)
  return { id: `o-${rest}`, kind: 'over', rest, setup: { throws: fmt(setup.throws), leaves: setup.leaves } }
}

/**
 * Zwei-Dart-Karte, wenn man mit zwei Darts etwas anderes tun muss, als die Rest-Karte lehrt:
 * die Tabelle nennt einen Weg „mit 2 Darts“, oder es bleibt nur ein Stellwurf.
 */
function twoDartCard(rest: number): TwoDartCard | null {
  const follow = followAfterSingle(rest, 2)
  if (!chartTwoDarts(rest) && follow.kind !== 'setup') return null
  return { id: `t-${rest}`, kind: 'two', rest, follow }
}

function cardsOfRest(rest: number): Card[] {
  if (isBogey(rest)) {
    const setup = bestSetup(rest, 3)
    return [{ id: `b-${rest}`, kind: 'bogey', rest, setup: { throws: fmt(setup.throws), leaves: setup.leaves } }]
  }
  const best = referenceRoute(rest)
  if (!best) throw new Error(`Kein Referenzweg für Rest ${rest}`)
  const card = restCard(rest, best)
  return [card, ...missCards(rest, best, card.singleCases), ...neighbourCards(rest, best, card.singleCases)]
}

/**
 * Alle Karten in Lernreihenfolge: aufsteigend nach Rest, je Rest erst die Rest- oder
 * Bogey-Karte, dann die Fehlwurf-, dann die Nachbarfeld-Karten, dann die Zwei-Dart-Karte,
 * zuletzt „Single statt Doppel“ beim Rest des Doppels. Danach die Stellwürfe über 170.
 */
export function buildCards(): Card[] {
  const cards: Card[] = []
  for (let rest = MIN_REST; rest <= MAX_REST; rest++) {
    const two = twoDartCard(rest)
    const double = rest % 2 === 0 ? rest / 2 : 0
    const singleDouble = double >= MIN_DOUBLE && double <= MAX_DOUBLE ? [singleDoubleCard(double)] : []
    cards.push(...cardsOfRest(rest), ...(two ? [two] : []), ...singleDouble)
  }
  for (let rest = MAX_REST + 1; rest <= MAX_OVER; rest++) cards.push(overCard(rest))
  return cards
}
