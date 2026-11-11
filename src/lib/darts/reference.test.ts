import { describe, expect, it } from 'vitest'
import { isBogey, minDarts } from '@/lib/darts/checkouts'
import { formatRoute, parseRoute, routeTotal } from '@/lib/darts/model'
import {
  REFERENCE,
  REFERENCE_ALTERNATIVES,
  referenceAlternatives,
  referenceRoute,
} from '@/lib/darts/reference'

describe('REFERENCE', () => {
  it('hat für jeden Rest von 2 bis 170 einen gültigen Weg mit den wenigsten Darts', () => {
    for (let rest = 2; rest <= 170; rest++) {
      if (isBogey(rest)) {
        expect(REFERENCE[rest]).toBeUndefined()
        expect(referenceRoute(rest)).toBeUndefined()
        continue
      }
      const route = referenceRoute(rest)!
      expect(routeTotal(route)).toBe(rest)
      expect(route.at(-1)!.ring).toBe('D')
      expect(route.length).toBe(minDarts(rest))
    }
  })

  it('enthält bekannte Standardwege', () => {
    expect(REFERENCE[170]).toBe('T20 T20 Bull')
    expect(REFERENCE[121]).toBe('T20 T11 D14')
    expect(REFERENCE[100]).toBe('T20 D20')
    expect(REFERENCE[32]).toBe('D16')
  })

  it('liefert undefined außerhalb des Bereichs', () => {
    expect(referenceRoute(1)).toBeUndefined()
    expect(referenceRoute(171)).toBeUndefined()
  })
})

describe('REFERENCE_ALTERNATIVES', () => {
  it('enthält nur gültige, andere und kurze Wege, höchstens zwei je Rest', () => {
    for (const [key, alts] of Object.entries(REFERENCE_ALTERNATIVES)) {
      const rest = Number(key)
      expect(alts.length).toBeGreaterThan(0)
      expect(alts.length).toBeLessThanOrEqual(2)
      for (const text of alts) {
        const route = parseRoute(text)
        expect(routeTotal(route)).toBe(rest)
        expect(route.at(-1)!.ring).toBe('D')
        expect(text).not.toBe(REFERENCE[rest])
        expect(route.length).toBeLessThanOrEqual(minDarts(rest)! + 1)
      }
    }
  })

  it('übernimmt die Wege der Tabelle', () => {
    expect(REFERENCE_ALTERNATIVES[121]).toContain('T17 T20 D5')
    expect(REFERENCE_ALTERNATIVES[164]).toEqual(['T19 T19 Bull'])
    expect(REFERENCE_ALTERNATIVES[61]).toEqual(['T7 D20', 'T11 D14'])
  })

  it('referenceAlternatives liefert Wege oder eine leere Liste', () => {
    expect(referenceAlternatives(132).map(formatRoute)).toEqual(['25 · T19 · Bull'])
    expect(referenceAlternatives(40)).toEqual([])
  })
})
