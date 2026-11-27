import type { Card } from '@/lib/darts/cards'
import { isBogey } from '@/lib/darts/checkouts'
import { dartValue, expandSteps, formatDart, parseDart, parseSteps, routeTotal, type Dart } from '@/lib/darts/model'
import { compareRoutesBy, compareSetups, halvings, leaveTier, type Setup } from '@/lib/darts/scoring'

/**
 * Wogegen eine eingegebene Antwort geprüft wird. Wege stehen ausgeschrieben in
 * Feldschreibweise ("T20", "25", "Bull"); ein Ziel zwischen zwei Feldern ist
 * schon in beide Wege aufgelöst. Serialisierbar, damit der Server es mitgeben kann.
 */
export type Check =
  | { kind: 'rest'; rest: number; best: string[][]; good: string[][] }
  | { kind: 'bogey'; rest: number }
  /** Fehlwurf-Karte mit Finish (rest ist der neue Rest) oder Zwei-Dart-Karte mit Weg. */
  | { kind: 'follow'; rest: number; maxDarts: 1 | 2; best: string[][] }
  /** Fehlwurf- oder Zwei-Dart-Karte ohne Finish oder Rest über 170: der empfohlene Stellwurf. */
  | { kind: 'setup'; rest: number; maxDarts: 1 | 2 | 3; throws: string[] }

export type Answer = { kind: 'darts'; darts: string[] } | { kind: 'notCheckable' }

export type VerdictCode =
  | 'best'
  | 'alternative'
  | 'notRecommended'
  | 'noCheckout'
  | 'checkable'
  | 'bogeyRight'
  | 'setupRight'
  | 'setupOther'
  | 'setupBogey'
  | 'setupBust'

/** Warum ein Weg nicht aufgeht, als Daten; den Text liefert das Wörterbuch (`study.verdict.detail`). */
export type VerdictDetail =
  | { kind: 'total'; total: number; rest: number }
  | { kind: 'notDouble' }
  | { kind: 'notCheckable' }
  | { kind: 'leavesBogey'; leaves: number }
  | { kind: 'bust'; total: number; rest: number }
  /** Geht, aber nicht empfohlen: der Grund, die Dartzahl des besten Wegs und die Doppel beider Wege. */
  | { kind: 'notRecommended'; reason: RouteReason; darts: number; double: string; bestDouble: string }
  /** Anderer Stellwurf: beide Reste, ihr Doppel ("D16", "Bull"; null ohne Ein-Dart-Finish) und der Grund. */
  | {
      kind: 'setupOther'
      leaves: number
      bestLeaves: number
      double: string | null
      bestDouble: string | null
      reason: SetupReason
    }

/**
 * Warum der beste Weg vor dem eingegebenen steht. `bull`: der eingegebene Weg endet auf dem Bull. `order`: dieselben Darts, nur die Reihenfolge der
 * Felder entscheidet. `reference`: die Rangfolge sieht keinen Nachteil, der beste Weg stammt aus der Referenztabelle.
 */
export type RouteReason = 'darts' | 'halvings' | 'bull' | 'finisher' | 'unsaved' | 'triples' | 'order' | 'reference'

/** Warum der empfohlene Stellwurf vor dem eingegebenen steht. */
export type SetupReason =
  | 'fewerDarts'
  | 'noTwoDartFinish'
  | 'preferred'
  | 'halvings'
  | 'preferredOrder'
  | 'doubleOverBull'
  | 'lowerLeave'
  | 'triples'
  | 'onTwenty'
  | 'moreDarts'
  | 'equal'
  | 'bigFields'

export type Verdict = { code: VerdictCode; detail?: VerdictDetail }

/** Ein Weg der Karte, eventuell mit Teilung, als ein oder zwei ausgeschriebene Wege. */
function expand(route: string[]): string[][] {
  return expandSteps(parseSteps(route.join(' '))).map((r) => r.map(formatDart))
}

const key = (route: string[]) => route.map((d) => formatDart(parseDart(d))).join(' ')

function unique(routes: string[][], without: string[][] = []): string[][] {
  const seen = new Set(without.map(key))
  return routes.filter((r) => {
    const k = key(r)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function checkFor(card: Card): Check {
  switch (card.kind) {
    case 'rest': {
      const best = expand(card.best)
      const others = [...card.alternatives, ...(card.twoDarts ? [card.twoDarts] : [])].flatMap(expand)
      return { kind: 'rest', rest: card.rest, best, good: unique(others, best) }
    }
    case 'bogey':
      return { kind: 'bogey', rest: card.rest }
    case 'miss':
      return card.follow.kind === 'finish'
        ? { kind: 'follow', rest: card.newRest, maxDarts: card.dartsLeft, best: expand(card.follow.route) }
        : { kind: 'setup', rest: card.newRest, maxDarts: card.dartsLeft, throws: card.follow.throws }
    case 'two':
      return card.follow.kind === 'finish'
        ? { kind: 'follow', rest: card.rest, maxDarts: 2, best: expand(card.follow.route) }
        : { kind: 'setup', rest: card.rest, maxDarts: 2, throws: card.follow.throws }
    case 'over':
      return { kind: 'setup', rest: card.rest, maxDarts: 3, throws: card.setup.throws }
  }
}

/** Wie viele Darts eingegeben werden dürfen. */
export function maxDarts(check: Check): 1 | 2 | 3 {
  return check.kind === 'follow' || check.kind === 'setup' ? check.maxDarts : 3
}

/** Die Taste „Nicht checkbar“ gibt es auf Rest- und Bogey-Karten, damit sich keine verrät. */
export function offersNotCheckable(check: Check): boolean {
  return check.kind === 'rest' || check.kind === 'bogey'
}

function judgeRoute(rest: number, best: string[][], good: string[][], darts: string[]): Verdict {
  const k = key(darts)
  if (best.some((r) => key(r) === k)) return { code: 'best' }
  if (good.some((r) => key(r) === k)) return { code: 'alternative' }
  const parsed = darts.map(parseDart)
  const total = parsed.reduce((sum, d) => sum + dartValue(d), 0)
  if (total !== rest) return { code: 'noCheckout', detail: { kind: 'total', total, rest } }
  if (parsed.at(-1)?.ring !== 'D') return { code: 'noCheckout', detail: { kind: 'notDouble' } }
  // Bei geteiltem Ziel gibt es zwei beste Wege: verglichen wird mit dem auf dasselbe Doppel.
  const last = formatDart(parsed[parsed.length - 1])
  const top = (best.find((r) => formatDart(parseDart(r[r.length - 1])) === last) ?? best[0]).map(parseDart)
  return {
    code: 'notRecommended',
    detail: {
      kind: 'notRecommended',
      reason: routeReason(parsed, top),
      darts: top.length,
      double: last,
      bestDouble: formatDart(top[top.length - 1]),
    },
  }
}

/** Übersetzt das entscheidende Kriterium der Rangfolge in den Grund für die Anzeige. */
function routeReason(entered: Dart[], best: Dart[]): RouteReason {
  const { order, by } = compareRoutesBy(entered, best)
  // Ab Rest 41 nennt die Referenztabelle den besten Weg; die Rangfolge kann die Eingabe gleich oder besser einordnen.
  if (order <= 0 || by === null) return 'reference'
  // Das Bull lässt sich gar nicht halbieren, das sagt der Text dann auch so.
  if (by === 'halvings' && entered[entered.length - 1].n === 25) return 'bull'
  if (by !== 'fields') return by
  const sorted = (route: Dart[]) => route.map(formatDart).sort().join(' ')
  return sorted(entered) === sorted(best) ? 'order' : 'reference'
}

/** Das Doppel, mit dem ein Rest in einem Dart fällt, sonst null. */
function finisher(leave: number): Dart | null {
  if (leave === 50) return { ring: 'D', n: 25 }
  return leaveTier(leave) <= 1 ? { ring: 'D', n: leave / 2 } : null
}

/** Übersetzt das entscheidende Kriterium der Rangfolge in den Grund für die Anzeige. */
function setupReason(entered: Setup, best: Setup): SetupReason {
  const { order, by } = compareSetups(entered, best)
  // Die Empfehlung kennt nur Single und Triple: über Doppel, Bull oder 25 kann die Eingabe gleich gut oder besser sein.
  if (order <= 0 || by === 'fields' || by === null) {
    return entered.throws.some((d) => d.ring === 'D' || d.n === 25) ? 'bigFields' : 'equal'
  }
  switch (by) {
    case 'tier': {
      const tier = leaveTier(entered.leaves)
      return tier === 3 ? 'noTwoDartFinish' : tier === 2 ? 'fewerDarts' : 'preferred'
    }
    case 'preferred':
      return halvings(finisher(best.leaves)!) > halvings(finisher(entered.leaves)!) ? 'halvings' : 'preferredOrder'
    case 'halvings':
      return 'halvings'
    case 'bull':
      return 'doubleOverBull'
    case 'leave':
      // Unter den übrigen Ein-Dart-Resten steht das höhere Doppel vorn, sonst der niedrigere Rest.
      return leaveTier(entered.leaves) === 1 ? 'preferredOrder' : 'lowerLeave'
    case 'darts':
      return 'moreDarts'
    case 'triples':
      return 'triples'
    case 'onTwenty':
      return 'onTwenty'
  }
}

/**
 * Stellwurf: der der Karte (die Reihenfolge der Darts zählt nicht), sonst überworfen
 * (Rest unter 2; ein Finish gibt es auf Stellwurf-Karten nicht), sonst einer, der eine
 * Bogey-Zahl lässt, sonst ein anderer mit dem Grund, warum der der Karte davor steht.
 */
function judgeSetup(rest: number, throws: string[], darts: string[]): Verdict {
  const sorted = (route: string[]) => route.map((d) => formatDart(parseDart(d))).sort().join(' ')
  if (sorted(darts) === sorted(throws)) return { code: 'setupRight' }
  const entered = darts.map(parseDart)
  const total = routeTotal(entered)
  const leaves = rest - total
  if (leaves < 2) return { code: 'setupBust', detail: { kind: 'bust', total, rest } }
  if (isBogey(leaves)) return { code: 'setupBogey', detail: { kind: 'leavesBogey', leaves } }
  const best = throws.map(parseDart)
  const bestLeaves = rest - routeTotal(best)
  const double = (leave: number) => {
    const d = finisher(leave)
    return d ? formatDart(d) : null
  }
  return {
    code: 'setupOther',
    detail: {
      kind: 'setupOther',
      leaves,
      bestLeaves,
      double: double(leaves),
      bestDouble: double(bestLeaves),
      reason: setupReason({ throws: entered, leaves }, { throws: best, leaves: bestLeaves }),
    },
  }
}

export function judge(check: Check, answer: Answer): Verdict {
  if (answer.kind === 'notCheckable') {
    if (check.kind === 'bogey') return { code: 'bogeyRight' }
    if (check.kind === 'rest') return { code: 'checkable' }
    throw new Error('„Nicht checkbar“ gibt es nur auf Rest- und Bogey-Karten')
  }
  const { darts } = answer
  switch (check.kind) {
    case 'bogey':
      return { code: 'noCheckout', detail: { kind: 'notCheckable' } }
    case 'rest':
      return judgeRoute(check.rest, check.best, check.good, darts)
    case 'follow':
      return judgeRoute(check.rest, check.best, [], darts)
    case 'setup':
      return judgeSetup(check.rest, check.throws, darts)
  }
}
