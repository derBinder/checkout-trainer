import { describe, expect, it } from 'vitest'
import {
  ALL_DARTS,
  dartValue,
  expandSteps,
  formatDart,
  formatRoute,
  formatStep,
  formatSteps,
  isSplit,
  parseDart,
  parseRoute,
  parseStep,
  parseSteps,
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

describe('Wege mit Ziel zwischen zwei Feldern', () => {
  it('parst und formatiert einen geteilten Weg in der Schreibweise der Tabelle', () => {
    const steps = parseSteps('T20 16/8 D16/D20')
    expect(steps).toEqual([
      { ring: 'T', n: 20 },
      { split: [{ ring: 'S', n: 16 }, { ring: 'S', n: 8 }] },
      { split: [{ ring: 'D', n: 16 }, { ring: 'D', n: 20 }] },
    ])
    expect(steps.map(formatStep)).toEqual(['T20', '16/8', 'D16/D20'])
    expect(formatSteps(steps)).toBe('T20 · 16/8 · D16/D20')
    expect(steps.some(isSplit)).toBe(true)
  })

  it('zerlegt einen geteilten Weg in genau zwei Wege', () => {
    expect(expandSteps(parseSteps('16/8 D16/D20')).map(formatRoute)).toEqual([
      'S16 · D16',
      'S8 · D20',
    ])
    expect(expandSteps(parseSteps('T20 16/8 D16/D20')).map(formatRoute)).toEqual([
      'T20 · S16 · D16',
      'T20 · S8 · D20',
    ])
  })

  it('lässt einfache Wege unverändert', () => {
    expect(parseSteps('T20 T10 D10')).toEqual(parseRoute('T20 T10 D10'))
    expect(expandSteps(parseSteps('T20 T10 D10'))).toEqual([parseRoute('T20 T10 D10')])
    expect(formatSteps(parseSteps('25 T20 Bull'))).toBe('25 · T20 · Bull')
  })

  it('parseStep liest einzelne Anzeige-Texte zurück', () => {
    expect(parseStep('D16/D20')).toEqual({ split: [{ ring: 'D', n: 16 }, { ring: 'D', n: 20 }] })
    expect(parseStep('16/8')).toEqual({ split: [{ ring: 'S', n: 16 }, { ring: 'S', n: 8 }] })
    expect(parseStep('Bull')).toEqual({ ring: 'D', n: 25 })
  })

  it('verlangt nach dem geteilten Single das geteilte Doppel', () => {
    expect(() => parseSteps('16/8 D16')).toThrow()
    expect(() => parseSteps('16/8')).toThrow()
    expect(() => parseSteps('16/8 T20 D16/D20')).toThrow()
    expect(() => parseSteps('S16 D16/D20')).toThrow()
    expect(() => parseSteps('D16/D20 16/8')).toThrow()
  })

  it('wirft bei falsch geschriebenen Teilungen', () => {
    for (const bad of ['16/', '/8', '16/8/4', '16/16', 'T16/8', 'S16/S8', '21/8', '16/8 D16/T20', '16/8 D16/D16', '16/8 D16/Bull', '16/8 D16/20']) {
      expect(() => parseSteps(bad.includes(' ') ? bad : `${bad} D16/D20`)).toThrow()
    }
  })
})
