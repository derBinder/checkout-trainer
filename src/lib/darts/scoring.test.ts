import { describe, expect, it } from 'vitest'
import { BOGEYS, isBogey } from '@/lib/darts/checkouts'
import { formatRoute, parseDart, parseRoute, routeTotal } from '@/lib/darts/model'
import { bestSetup, compareRoutes, compareSetups, halvings, leaveTier, rankCheckouts, type Setup } from '@/lib/darts/scoring'

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
  it('bei gleichem Doppel gewinnt der Weg mit weniger ungeretteten Triples', () => {
    // Nach S20 bleiben 80 mit zwei Darts (T20 D10): T20 ist gerettet.
    // Nach S16 bleiben 64 mit einem Dart: T16 ist nicht gerettet.
    expect(compareRoutes(parseRoute('T20 S8 D16'), parseRoute('S20 T16 D16'))).toBeLessThan(0)
    expect(compareRoutes(parseRoute('S20 T16 D16'), parseRoute('T20 S8 D16'))).toBeGreaterThan(0)
  })
  it('bestraft ungerettete Triples, statt gerettete zu belohnen', () => {
    expect(formatRoute(rankCheckouts(7, 3)[0])).toBe('S3 · D2')
    expect(compareRoutes(parseRoute('S3 D2'), parseRoute('T1 D2'))).toBeLessThan(0)
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

describe('bestSetup', () => {
  it('trifft bevorzugte Reste', () => {
    expect(bestSetup(169, 3).leaves).toBe(32)
    expect(bestSetup(159, 3)).toEqual({ throws: parseRoute('T20 T20 S7'), leaves: 32 })
  })
  it('stellt mit einem Dart auf ein bevorzugtes Doppel', () => {
    expect(bestSetup(88, 1)).toEqual({ throws: parseRoute('T16'), leaves: 40 })
    expect(bestSetup(62, 1)).toEqual({ throws: parseRoute('T10'), leaves: 32 })
    // 64 und 68: Die Rangfolge der Reste (32, 40, 16, …) wählt T8 -> 40 und T12 -> 32,
    // nicht die Tabellenwege T16 -> 16 und T20 -> 8. Geprüft wird nur das bevorzugte Doppel.
    expect([32, 40, 16, 8]).toContain(bestSetup(64, 1).leaves)
    expect([32, 40, 16, 8]).toContain(bestSetup(68, 1).leaves)
    expect(bestSetup(72, 1)).toEqual({ throws: parseRoute('T16'), leaves: 24 })
  })
  it('lässt bei 61 mit einem Dart ein Ein-Dart-Finish', () => {
    const s = bestSetup(61, 1)
    expect(s.leaves === 50 || (s.leaves % 2 === 0 && s.leaves <= 40)).toBe(true)
  })
  it('lässt bei 123 mit zwei Darts keinen Rest über 40', () => {
    expect(bestSetup(123, 2).leaves).toBeLessThanOrEqual(40)
  })
  it('nimmt keine Doppel und kein Bull als Stellwurf', () => {
    for (let rest = 3; rest <= 170; rest++) {
      for (const darts of [1, 2, 3] as const) {
        let s
        try {
          s = bestSetup(rest, darts)
        } catch {
          continue
        }
        for (const d of s.throws) expect((d.ring === 'S' || d.ring === 'T') && d.n <= 20).toBe(true)
        expect(rest - routeTotal(s.throws)).toBe(s.leaves)
      }
    }
  }, 30_000) // Alle Reste mit 1 bis 3 Darts: parallel und mit Coverage über 5 Sekunden.
  it('lässt bei Bogey-Zahlen einen gültigen Rest', () => {
    for (const b of BOGEYS) {
      const s = bestSetup(b, 3)
      expect(b - routeTotal(s.throws)).toBe(s.leaves)
      expect(isBogey(s.leaves)).toBe(false)
      expect(s.leaves).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('compareSetups', () => {
  const s = (route: string, rest: number): Setup => {
    const throws = parseRoute(route)
    return { throws, leaves: rest - routeTotal(throws) }
  }

  it.each([
    ['T20 S7', 'S1', 99, 'tier'], // 32 gegen 98
    ['T20 S7', 'S1 T16', 99, 'tier'], // 32 gegen 50
    ['T20 S7', 'S2 T19', 99, 'preferred'], // 32 gegen 40
    ['T20 T19', 'T15 T20', 155, 'bull'], // 38 gegen 50
    ['T20 T20', 'S1 T16', 159, 'leave'], // 39 gegen 110
    ['T20 S15', 'T5 T20', 115, 'triples'], // beide 40
    ['T20 S7', 'S10 T19', 99, 'onTwenty'], // beide 32
    ['T20 S11', 'S20 T17', 103, 'fields'], // beide 32
  ])('%s schlägt %s bei Rest %i über %s', (a, b, rest, by) => {
    const result = compareSetups(s(a, rest), s(b, rest))
    expect(result.by).toBe(by)
    expect(result.order).toBeLessThan(0)
    expect(compareSetups(s(b, rest), s(a, rest)).order).toBeGreaterThan(0)
  })

  it('meldet Gleichstand ohne Kriterium', () => {
    expect(compareSetups(s('T20 S7', 99), s('T20 S7', 99))).toEqual({ order: 0, by: null })
  })

  it('ordnet Reste in Stufen', () => {
    expect([32, 50, 98, 99].map(leaveTier)).toEqual([0, 1, 2, 3])
  })
})
