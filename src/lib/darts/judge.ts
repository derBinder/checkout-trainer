import type { Card } from '@/lib/darts/cards'
import { dartValue, expandSteps, formatDart, parseDart, parseSteps } from '@/lib/darts/model'

/**
 * Wogegen eine eingegebene Antwort geprüft wird. Wege stehen ausgeschrieben in
 * Feldschreibweise ("T20", "25", "Bull"); ein Ziel zwischen zwei Feldern ist
 * schon in beide Wege aufgelöst. Serialisierbar, damit der Server es mitgeben kann.
 */
export type Check =
  | { kind: 'rest'; rest: number; best: string[][]; good: string[][] }
  | { kind: 'bogey'; rest: number }
  /** Fehlwurf-Karte mit Finish: rest ist der neue Rest. */
  | { kind: 'follow'; rest: number; maxDarts: 1 | 2; best: string[][] }
  /** Fehlwurf-Karte ohne Finish: der empfohlene Stellwurf. */
  | { kind: 'setup'; rest: number; maxDarts: 1 | 2; throws: string[] }

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

export type Verdict = { code: VerdictCode; detail?: string }

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

/** Der Rest ist mit einem einzigen Doppel (oder Bull) zu checken. */
export function isDoubleOut(remaining: number): boolean {
  return remaining === 50 || (remaining % 2 === 0 && remaining >= 2 && remaining <= 40)
}

function judgeRoute(rest: number, best: string[][], good: string[][], darts: string[]): Verdict {
  const k = key(darts)
  if (best.some((r) => key(r) === k)) return { code: 'best' }
  if (good.some((r) => key(r) === k)) return { code: 'alternative' }
  const parsed = darts.map(parseDart)
  const total = parsed.reduce((sum, d) => sum + dartValue(d), 0)
  if (total !== rest) return { code: 'noCheckout', detail: `Ergibt ${total} statt ${rest}` }
  if (parsed.at(-1)?.ring !== 'D') return { code: 'noCheckout', detail: 'Letzter Dart ist kein Doppel' }
  return { code: 'notRecommended' }
}

export function judge(check: Check, answer: Answer): Verdict {
  if (answer.kind === 'notCheckable') {
    if (check.kind === 'bogey') return { code: 'bogeyRight' }
    if (check.kind === 'rest') return { code: 'checkable' }
    throw new Error('„Nicht checkbar“ gibt es auf Fehlwurf-Karten nicht')
  }
  const { darts } = answer
  switch (check.kind) {
    case 'bogey':
      return { code: 'noCheckout', detail: 'Rest ist nicht checkbar' }
    case 'rest':
      return judgeRoute(check.rest, check.best, check.good, darts)
    case 'follow':
      return judgeRoute(check.rest, check.best, [], darts)
    case 'setup':
      return key(darts) === key(check.throws) ? { code: 'setupRight' } : { code: 'setupOther' }
  }
}
