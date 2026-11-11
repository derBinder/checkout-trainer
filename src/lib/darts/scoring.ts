import { allCheckouts, isBogey } from '@/lib/darts/checkouts'
import { dartValue, routeTotal, type Dart, type Route } from '@/lib/darts/model'

const HALVINGS: Record<number, number> = {
  16: 4,
  8: 3,
  4: 2,
  12: 2,
  20: 2,
  2: 1,
  6: 1,
  10: 1,
  14: 1,
  18: 1,
}

/** Wie oft sich ein Doppel-Feld halbieren lässt (D16 -> 4, Bull -> 0). Nur für Doppel gedacht. */
export function halvings(d: Dart): number {
  if (d.ring !== 'D') return 0
  return HALVINGS[d.n] ?? 0
}

const finishCache = new Map<number, boolean>()

function canFinish(rest: number, darts: number): boolean {
  const key = rest * 4 + darts
  let result = finishCache.get(key)
  if (result === undefined) {
    result = allCheckouts(rest, darts as 1 | 2 | 3).length > 0
    finishCache.set(key, result)
  }
  return result
}

/** Triples im Weg, nach deren Single desselben Felds mit den übrigen Darts kein Finish mehr möglich ist. */
function unsavedTriples(route: Route): number {
  let rest = routeTotal(route)
  let unsaved = 0
  route.forEach((dart, i) => {
    if (dart.ring === 'T') {
      const afterSingle = rest - dart.n
      if (afterSingle < 2 || !canFinish(afterSingle, route.length - i - 1)) unsaved++
    }
    rest -= dartValue(dart)
  })
  return unsaved
}

function triples(route: Route): number {
  return route.filter((d) => d.ring === 'T').length
}

/** Lexikografisch: höheres Feld zuerst (negativ = a vorn). */
function compareHigherFirst(a: Route, b: Route): number {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const diff = dartValue(b[i]) - dartValue(a[i])
    if (diff !== 0) return diff
    const byField = b[i].n - a[i].n
    if (byField !== 0) return byField
  }
  return a.length - b.length
}

type Scored = {
  route: Route
  halvings: number
  finisher: number
  unsaved: number
  triples: number
}

function score(route: Route): Scored {
  const last = route[route.length - 1]
  return {
    route,
    halvings: halvings(last),
    finisher: dartValue(last),
    unsaved: unsavedTriples(route),
    triples: triples(route),
  }
}

function compareScored(a: Scored, b: Scored): number {
  return (
    a.route.length - b.route.length ||
    b.halvings - a.halvings ||
    b.finisher - a.finisher ||
    a.unsaved - b.unsaved ||
    a.triples - b.triples ||
    compareHigherFirst(a.route, b.route)
  )
}

/** Negativ = a ist besser. Regeln in der Reihenfolge der Spezifikation. */
export function compareRoutes(a: Route, b: Route): number {
  return compareScored(score(a), score(b))
}

/** Alle Checkouts mit höchstens maxDarts Darts, bester zuerst. */
export function rankCheckouts(rest: number, maxDarts: 1 | 2 | 3): Route[] {
  return allCheckouts(rest, maxDarts)
    .map(score)
    .sort(compareScored)
    .map((s) => s.route)
}

export type Setup = { throws: Route; leaves: number }

/** Erlaubte Stellwürfe: S1–S20 und T1–T20, keine Doppel, kein Bull. */
const SETUP_DARTS: Dart[] = [
  ...Array.from({ length: 20 }, (_, i): Dart => ({ ring: 'S', n: i + 1 })),
  ...Array.from({ length: 20 }, (_, i): Dart => ({ ring: 'T', n: i + 1 })),
]

/** Bevorzugte Ein-Dart-Reste, früher ist besser. */
const PREFERRED_LEAVES = [32, 40, 16, 24, 36, 8, 20, 12, 4]

function countOnTwenty(route: Route): number {
  return route.filter((d) => d.n === 20).length
}

/** Alle Wurffolgen aus erlaubten Feldern mit 1..darts Würfen (Reihenfolge: höhere Felder zuerst). */
function setupCandidates(rest: number, darts: number): Setup[] {
  const sorted = [...SETUP_DARTS].sort((a, b) => dartValue(b) - dartValue(a) || b.n - a.n)
  const result: Setup[] = []
  const walk = (prefix: Route, from: number, remaining: number) => {
    if (prefix.length > 0) {
      const leaves = remaining
      if (leaves >= 2 && !isBogey(leaves)) result.push({ throws: prefix, leaves })
    }
    if (prefix.length === darts) return
    for (let i = from; i < sorted.length; i++) {
      const next = remaining - dartValue(sorted[i])
      if (next >= 2) walk([...prefix, sorted[i]], i, next)
    }
  }
  walk([], 0, rest)
  return result
}

const isOneDartFinish = (leave: number) => leave === 50 || (leave % 2 === 0 && leave <= 40)

/**
 * Rangfolge eines Rests (kleiner ist besser), als Tupel:
 * 1. bevorzugtes Doppel nach PREFERRED_LEAVES,
 * 2. sonst irgendein Ein-Dart-Finish: mehr Halbierungen zuerst, Doppel vor Bull, höheres Doppel zuerst,
 * 3. sonst mit zwei Darts zu beenden: niedrigerer Rest zuerst,
 * 4. sonst niedrigster Rest.
 */
function leaveRank(leave: number): [number, number, number, number] {
  const preferred = PREFERRED_LEAVES.indexOf(leave)
  if (preferred !== -1) return [0, preferred, 0, 0]
  if (isOneDartFinish(leave)) {
    const finisher: Dart = leave === 50 ? { ring: 'D', n: 25 } : { ring: 'D', n: leave / 2 }
    return [1, -halvings(finisher), leave === 50 ? 1 : 0, -leave]
  }
  if (canFinish(leave, 2)) return [2, leave, 0, 0]
  return [3, leave, 0, 0]
}

function compareLeaves(a: number, b: number): number {
  const ra = leaveRank(a)
  const rb = leaveRank(b)
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
  return 0
}

/**
 * Bester Stellwurf mit bis zu `darts` Würfen. Erst der Rest (siehe leaveRank),
 * bei gleichem Rest weniger Würfe, weniger Triples, mehr Würfe auf die 20, höhere Felder.
 * Wirft, wenn kein gültiger Rest erreichbar ist.
 */
export function bestSetup(rest: number, darts: 1 | 2 | 3): Setup {
  const candidates = setupCandidates(rest, darts)
  candidates.sort(
    (a, b) =>
      compareLeaves(a.leaves, b.leaves) ||
      a.throws.length - b.throws.length ||
      triples(a.throws) - triples(b.throws) ||
      countOnTwenty(b.throws) - countOnTwenty(a.throws) ||
      compareHigherFirst(a.throws, b.throws),
  )
  const best = candidates[0]
  if (!best) throw new Error(`Kein Stellwurf für Rest ${rest} mit ${darts} Darts`)
  return best
}
