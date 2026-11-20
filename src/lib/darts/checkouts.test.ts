import { describe, expect, it } from 'vitest'
import { allCheckouts, BOGEYS, isBogey } from '@/lib/darts/checkouts'
import { formatRoute, routeTotal } from '@/lib/darts/model'

describe('allCheckouts', () => {
  it('findet den einzigen Weg für 170', () => {
    expect(allCheckouts(170, 3).map(formatRoute)).toEqual(['T20 · T20 · Bull'])
  })

  it('findet D1 für 2 mit einem Dart', () => {
    expect(allCheckouts(2, 1).map(formatRoute)).toEqual(['D1'])
  })

  it('findet nichts für 1', () => {
    expect(allCheckouts(1, 3)).toEqual([])
  })

  it('findet nichts für Bogey-Zahlen', () => {
    for (const b of BOGEYS) expect(allCheckouts(b, 3)).toEqual([])
  })

  it('findet für 2..170 genau dann Wege, wenn keine Bogey-Zahl', () => {
    for (let r = 2; r <= 170; r++) {
      expect(allCheckouts(r, 3).length > 0).toBe(!isBogey(r))
    }
  })

  it('jeder Weg summiert zum Rest und endet auf einem Doppel', () => {
    for (const r of allCheckouts(101, 3)) {
      expect(routeTotal(r)).toBe(101)
      expect(r.at(-1)!.ring).toBe('D')
    }
  })

  it('zählt geordnete Folgen ohne Deduplizierung', () => {
    const routes = allCheckouts(100, 2).map(formatRoute)
    expect(routes).toContain('T20 · D20')
    expect(allCheckouts(40, 2).map(formatRoute)).toContain('S20 · D10')
    expect(allCheckouts(40, 2).map(formatRoute)).not.toContain('D10 · S20')
    expect(allCheckouts(60, 3).map(formatRoute)).toContain('S10 · S10 · D20')
  })

  it('beachtet maxDarts', () => {
    expect(allCheckouts(100, 1)).toEqual([])
    for (const r of allCheckouts(100, 2)) expect(r.length).toBeLessThanOrEqual(2)
  })
})

/** Kleinste Zahl Darts, mit der allCheckouts einen Weg findet. */
function minDarts(rest: number): 1 | 2 | 3 | null {
  return ([1, 2, 3] as const).find((n) => allCheckouts(rest, n).length > 0) ?? null
}

describe('minDarts', () => {
  it('liefert die minimale Anzahl Darts', () => {
    expect(minDarts(50)).toBe(1)
    expect(minDarts(100)).toBe(2)
    expect(minDarts(101)).toBe(2)
    expect(minDarts(99)).toBe(3)
  })

  it('liefert null für Bogey-Zahlen', () => {
    expect(minDarts(169)).toBeNull()
  })
})
