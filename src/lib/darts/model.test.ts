import { describe, expect, it } from 'vitest'
import {
  ALL_DARTS,
  dartValue,
  formatDart,
  formatRoute,
  parseDart,
  parseRoute,
  routeTotal,
} from '@/lib/darts/model'

describe('dartValue', () => {
  it('multipliziert Feld und Ring', () => {
    expect(dartValue({ ring: 'T', n: 20 })).toBe(60)
    expect(dartValue({ ring: 'D', n: 25 })).toBe(50)
    expect(dartValue({ ring: 'S', n: 25 })).toBe(25)
  })
})

describe('formatDart / parseDart', () => {
  it('formatiert Bull, Outer Bull und Felder', () => {
    expect(formatDart({ ring: 'D', n: 25 })).toBe('Bull')
    expect(formatDart({ ring: 'S', n: 25 })).toBe('25')
    expect(formatDart({ ring: 'S', n: 20 })).toBe('S20')
  })

  it('parseDart ist die Umkehrung von formatDart', () => {
    for (const d of ALL_DARTS) expect(parseDart(formatDart(d))).toEqual(d)
  })

  it('wirft bei Unsinn', () => {
    expect(() => parseDart('T25')).toThrow()
    expect(() => parseDart('S21')).toThrow()
    expect(() => parseDart('D0')).toThrow()
    expect(() => parseDart('X5')).toThrow()
    expect(() => parseDart('')).toThrow()
  })
})

describe('Routen', () => {
  it('parst und formatiert Routen', () => {
    expect(formatRoute(parseRoute('T20 T11 D14'))).toBe('T20 · T11 · D14')
  })

  it('summiert eine Route', () => {
    expect(routeTotal(parseRoute('T20 T11 D14'))).toBe(121)
  })
})

describe('ALL_DARTS', () => {
  it('enthält 62 Felder', () => {
    expect(ALL_DARTS).toHaveLength(62)
  })
})
