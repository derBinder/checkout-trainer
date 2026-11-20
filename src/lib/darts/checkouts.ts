import { ALL_DARTS, dartValue, type Route } from '@/lib/darts/model'

/** Kleinster und größter Rest mit eigener Karte; darüber gibt es nur Stellwurf-Karten. */
export const MIN_REST = 2
export const MAX_REST = 170

export const BOGEYS: readonly number[] = [159, 162, 163, 165, 166, 168, 169]

export function isBogey(rest: number): boolean {
  return BOGEYS.includes(rest)
}

const FINISHERS = ALL_DARTS.filter((d) => d.ring === 'D')

/**
 * Alle geordneten Folgen mit höchstens maxDarts Darts, die genau auf rest
 * auschecken. Der letzte Dart ist ein Doppel (D1..D20) oder Bull.
 */
export function allCheckouts(rest: number, maxDarts: 1 | 2 | 3): Route[] {
  const routes: Route[] = []
  const extend = (prefix: Route, remaining: number, dartsLeft: number) => {
    for (const finisher of FINISHERS) {
      if (dartValue(finisher) === remaining) routes.push([...prefix, finisher])
    }
    if (dartsLeft <= 1) return
    for (const dart of ALL_DARTS) {
      const next = remaining - dartValue(dart)
      // Nach einem Setup-Dart muss noch mindestens 2 (D1) übrig bleiben.
      if (next >= 2) extend([...prefix, dart], next, dartsLeft - 1)
    }
  }
  if (rest >= 2) extend([], rest, maxDarts)
  return routes
}

export function minDarts(rest: number): 1 | 2 | 3 | null {
  for (const n of [1, 2, 3] as const) {
    if (allCheckouts(rest, n).length > 0) return n
  }
  return null
}
