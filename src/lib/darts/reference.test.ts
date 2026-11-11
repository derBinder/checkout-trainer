import { describe, expect, it } from 'vitest'
import { isBogey } from '@/lib/darts/checkouts'
import { expandSteps, formatSteps, routeTotal, type Steps } from '@/lib/darts/model'
import {
  CHART,
  OWN_ROUTES,
  chartAlternative,
  chartTwoDarts,
  referenceRoute,
} from '@/lib/darts/reference'
import chartFixture from './__fixtures__/chart.json'

type FixtureEntry = { v1: string[]; v2: string[]; two: string[] }
const FIXTURE = chartFixture as unknown as Record<string, FixtureEntry>

/** Zelle der Tabelle in App-Schreibweise; leer oder "-" ist kein Dart. */
function cell(text: string): string | null {
  const t = text.trim()
  if (t === '' || t === '-') return null
  if (t === 'SB') return '25'
  if (t === 'DB') return 'Bull'
  if (/^\d+$/.test(t)) return `S${t}`
  return t
}

function chartRoute(cells: string[]): string | undefined {
  const darts = cells.map(cell).filter((c): c is string => c !== null)
  return darts.length === 0 ? undefined : darts.join(' ')
}

const text = (steps: Steps | undefined) => (steps === undefined ? undefined : formatSteps(steps))
const fromChart = (route: string | undefined) => route?.split(' ').join(' · ')

/** Jede konkrete Zerlegung summiert sich auf den Rest und endet auf Doppel oder Bull. */
function expectValidCheckout(steps: Steps, rest: number) {
  const routes = expandSteps(steps)
  expect(routes.length).toBe(steps.some((s) => 'split' in s) ? 2 : 1)
  for (const route of routes) {
    expect(routeTotal(route), `${formatSteps(steps)} für ${rest}`).toBe(rest)
    expect(route.at(-1)!.ring).toBe('D')
  }
}

const CHART_RESTS = Array.from({ length: 130 }, (_, i) => i + 41).filter((r) => !isBogey(r))

describe('Referenztabelle 41 bis 170', () => {
  it('deckt genau die checkbaren Reste von 41 bis 170 ab', () => {
    expect(CHART_RESTS).toHaveLength(123)
    expect(Object.keys(CHART).map(Number)).toEqual(CHART_RESTS)
    const fixtureRests = Object.keys(FIXTURE)
      .map(Number)
      .filter((r) => r !== 40)
      .sort((a, b) => a - b)
    expect(fixtureRests).toEqual(CHART_RESTS)
  })

  it('übernimmt Variante 1, Variante 2 und „mit 2 Darts" unverändert', () => {
    for (const rest of CHART_RESTS) {
      const entry = FIXTURE[rest]
      expect(text(referenceRoute(rest)), `bester Weg ${rest}`).toBe(fromChart(chartRoute(entry.v1)))
      expect(text(chartAlternative(rest)), `Alternative ${rest}`).toBe(fromChart(chartRoute(entry.v2)))
      expect(text(chartTwoDarts(rest)), `mit 2 Darts ${rest}`).toBe(fromChart(chartRoute(entry.two)))
    }
  })

  it('jeder Weg und jede Zerlegung ist ein gültiges Finish', () => {
    for (const rest of CHART_RESTS) {
      expectValidCheckout(referenceRoute(rest)!, rest)
      const alternative = chartAlternative(rest)
      if (alternative) expectValidCheckout(alternative, rest)
      const two = chartTwoDarts(rest)
      if (two) {
        expectValidCheckout(two, rest)
        expect(two.length).toBeLessThanOrEqual(2)
      }
    }
  })

  it('enthält die Stichwerte', () => {
    expect(CHART[110]).toEqual({ best: 'T20 T10 D10', twoDarts: 'T20 Bull' })
    expect(CHART[101]).toEqual({ best: 'T20 S9 D16', twoDarts: 'T17 Bull' })
    expect(CHART[50]).toEqual({ best: 'S10 D20', alternative: 'S18 D16' })
    expect(CHART[48]).toEqual({ best: '16/8 D16/D20' })
    expect(CHART[70]).toEqual({ best: 'T18 D8', twoDarts: 'T20 D5' })
    expect(CHART[170]).toEqual({ best: 'T20 T20 Bull' })
    expect(CHART[82]).toEqual({ best: 'Bull D16', alternative: 'T14 D20' })
    expect(CHART[135].alternative).toBe('25 T20 Bull')
    expect(CHART[121]).toEqual({ best: 'T20 T11 D14', alternative: 'T17 T20 D5' })
    expect(CHART[100]).toEqual({ best: 'T20 D20' })
  })

  it('zerlegt geteilte Wege in zwei Finishes', () => {
    expect(expandSteps(referenceRoute(108)!).map((r) => formatSteps(r))).toEqual([
      'T20 · S16 · D16',
      'T20 · S8 · D20',
    ])
  })
})

describe('eigene Wege 2 bis 40', () => {
  it('hat für jeden Rest von 2 bis 40 einen gültigen Weg mit höchstens zwei Darts', () => {
    expect(Object.keys(OWN_ROUTES).map(Number)).toEqual(Array.from({ length: 39 }, (_, i) => i + 2))
    for (let rest = 2; rest <= 40; rest++) {
      const route = referenceRoute(rest)!
      expectValidCheckout(route, rest)
      expect(route.length).toBeLessThanOrEqual(2)
      expect(chartAlternative(rest)).toBeUndefined()
      expect(chartTwoDarts(rest)).toBeUndefined()
    }
    expect(OWN_ROUTES[32]).toBe('D16')
    expect(OWN_ROUTES[7]).toBe('S3 D2')
  })
})

describe('Bogey-Zahlen und Bereich', () => {
  it('haben keinen Eintrag', () => {
    for (let rest = 2; rest <= 170; rest++) {
      if (!isBogey(rest)) continue
      expect(CHART[rest]).toBeUndefined()
      expect(referenceRoute(rest)).toBeUndefined()
    }
  })

  it('liefert undefined außerhalb des Bereichs', () => {
    expect(referenceRoute(1)).toBeUndefined()
    expect(referenceRoute(171)).toBeUndefined()
  })
})
