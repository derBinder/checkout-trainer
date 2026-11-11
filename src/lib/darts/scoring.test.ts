import { describe, expect, it } from 'vitest'
import { BOGEYS, isBogey } from '@/lib/darts/checkouts'
import { formatRoute, parseDart, parseRoute, routeTotal } from '@/lib/darts/model'
import { bestSetup, compareRoutes, followUp, halvings, rankCheckouts } from '@/lib/darts/scoring'

describe('halvings', () => {
  it('zählt die Halbierungen des Doppels', () => {
    expect(halvings(parseDart('D16'))).toBe(4)
    expect(halvings(parseDart('D8'))).toBe(3)
    expect(halvings(parseDart('D4'))).toBe(2)
    expect(halvings(parseDart('D12'))).toBe(2)
    expect(halvings(parseDart('D20'))).toBe(2)
    for (const f of ['D2', 'D6', 'D10', 'D14', 'D18']) expect(halvings(parseDart(f))).toBe(1)
    expect(halvings(parseDart('D1'))).toBe(0)
    expect(halvings(parseDart('Bull'))).toBe(0)
  })
})

describe('compareRoutes und rankCheckouts', () => {
  it('weniger Darts schlägt besseres Doppel', () => {
    expect(formatRoute(rankCheckouts(100, 3)[0])).toBe('T20 · D20')
    expect(compareRoutes(parseRoute('T20 D20'), parseRoute('T20 S8 D16'))).toBeLessThan(0)
  })
  it('bei gleicher Dartzahl gewinnt das besser teilbare Doppel', () => {
    expect(compareRoutes(parseRoute('S8 D16'), parseRoute('S20 D10'))).toBeLessThan(0)
    expect(formatRoute(rankCheckouts(32, 3)[0])).toBe('D16')
  })
  it('bei gleichem Doppel gewinnt der Weg mit gerettetem Triple', () => {
    // Nach S20 bleiben 80 mit zwei Darts (T20 D10): T20 ist gerettet.
    // Nach S16 bleiben 64 mit einem Dart: T16 ist nicht gerettet.
    expect(compareRoutes(parseRoute('T20 S8 D16'), parseRoute('S20 T16 D16'))).toBeLessThan(0)
    expect(compareRoutes(parseRoute('S20 T16 D16'), parseRoute('T20 S8 D16'))).toBeGreaterThan(0)
  })
  it('bei sonstigem Gleichstand gewinnen höhere Felder zuerst', () => {
    expect(compareRoutes(parseRoute('S20 S12 D16'), parseRoute('S12 S20 D16'))).toBeLessThan(0)
  })
  it('ist antisymmetrisch und liefert 0 nur für gleiche Wege', () => {
    const r = parseRoute('T20 T20 D20')
    expect(compareRoutes(r, parseRoute('T20 T20 D20'))).toBe(0)
  })
  it('sortiert bester zuerst', () => {
    const ranked = rankCheckouts(170, 3)
    expect(formatRoute(ranked[0])).toBe('T20 · T20 · Bull')
    for (let i = 1; i < ranked.length; i++) {
      expect(compareRoutes(ranked[i - 1], ranked[i])).toBeLessThanOrEqual(0)
    }
  })
})

describe('followUp', () => {
  it('liefert Finish oder Stellwurf', () => {
    expect(followUp(101, 2)).toEqual({ kind: 'finish', route: parseRoute('T17 Bull') })
    expect(followUp(50, 1)).toEqual({ kind: 'finish', route: parseRoute('Bull') })
    expect(followUp(61, 1)).toEqual({
      kind: 'setup',
      setup: { throws: parseRoute('S20'), leaves: 41 },
    })
  })
  it('nimmt den bevorzugten Weg, wenn er in die Dartzahl passt', () => {
    const preferred = (rest: number) => (rest === 40 ? parseRoute('S8 D16') : undefined)
    expect(followUp(40, 2, preferred)).toEqual({ kind: 'finish', route: parseRoute('S8 D16') })
    expect(followUp(40, 1, preferred)).toEqual({ kind: 'finish', route: parseRoute('D20') })
  })
})

describe('bestSetup', () => {
  it('trifft bevorzugte Reste', () => {
    expect(bestSetup(169, 3).leaves).toBe(32)
    expect(bestSetup(159, 3)).toEqual({ throws: parseRoute('T20 T20 S7'), leaves: 32 })
  })
  it('lässt bei Bogey-Zahlen einen gültigen Rest', () => {
    for (const b of BOGEYS) {
      const s = bestSetup(b, 3)
      expect(b - routeTotal(s.throws)).toBe(s.leaves)
      expect(isBogey(s.leaves)).toBe(false)
      expect(s.leaves).toBeGreaterThanOrEqual(2)
    }
  })
})
