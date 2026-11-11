import { describe, expect, it } from 'vitest'
import { buildCards, type RestCard } from '@/lib/darts/cards'
import { isBogey } from '@/lib/darts/checkouts'
import { dartValue, parseDart } from '@/lib/darts/model'
import { REFERENCE_ALTERNATIVES } from '@/lib/darts/reference'
import { CARDS } from '@/lib/cards'

describe('buildCards', () => {
  const cards = buildCards()
  const byId = new Map(cards.map((c) => [c.id, c]))

  it('erzeugt eindeutige Karten in Lernreihenfolge', () => {
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
    expect(cards.filter((c) => c.kind === 'rest')).toHaveLength(162)
    expect(cards.filter((c) => c.kind === 'bogey').map((c) => c.rest)).toEqual([
      159, 162, 163, 165, 166, 168, 169,
    ])
    expect(cards[0].id).toBe('r-2')
    const rests = cards.map((c) => c.rest)
    expect(rests).toEqual([...rests].sort((a, b) => a - b))
    expect(cards.findIndex((c) => c.id === 'r-121')).toBeLessThan(
      cards.findIndex((c) => c.id === 'm-121-0'),
    )
    expect(cards.findIndex((c) => c.id === 'm-121-0')).toBeLessThan(
      cards.findIndex((c) => c.id === 'm-121-1'),
    )
  })

  it('bildet die Spezifikationsbeispiele ab', () => {
    expect(byId.get('m-121-0')).toMatchObject({
      thrown: ['S20'],
      aimed: 'T20',
      hit: 'S20',
      newRest: 101,
      dartsLeft: 2,
      follow: { kind: 'finish', route: ['T17', 'Bull'] },
    })
    expect(byId.get('m-121-1')).toMatchObject({
      thrown: ['T20', 'S11'],
      newRest: 50,
      dartsLeft: 1,
      follow: { kind: 'finish', route: ['Bull'] },
    })
  })

  it('rechnet jede Fehlwurf-Karte richtig', () => {
    for (const c of cards) {
      if (c.kind !== 'miss') continue
      const thrown = c.thrown.map(parseDart).reduce((s, d) => s + dartValue(d), 0)
      expect(c.rest - thrown).toBe(c.newRest)
      expect(c.newRest).toBeGreaterThanOrEqual(2)
    }
  })

  it('hat keine Fehlwurf-Karten zu Bogey-Zahlen', () => {
    expect(cards.some((c) => c.kind === 'miss' && isBogey(c.rest))).toBe(false)
  })

  it('begründet jede Rest-Karte ohne Emojis', () => {
    for (const c of cards) {
      if (c.kind !== 'rest') continue
      expect(c.reason.length).toBeGreaterThan(5)
      expect(c.reason).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })

  it('wählt die Begründung nach der festgelegten Reihenfolge', () => {
    const reason = (id: string) => (byId.get(id) as { reason: string }).reason
    expect(reason('r-121')).toBe('Bleibt bei Single 20 auf Bull-Finish.')
    expect(reason('r-32')).toBe('Direkt auf das Doppel.')
    expect(reason('r-100')).toMatch(/^(Bleibt|Endet|Kürzester)/)
  })

  it('hält Alternativen kurz und verschieden vom besten Weg', () => {
    for (const c of cards) {
      if (c.kind !== 'rest') continue
      expect(c.alternatives.length).toBeLessThanOrEqual(2)
      for (const alt of c.alternatives) {
        expect(alt).not.toEqual(c.best)
        expect(alt.length).toBeLessThanOrEqual(c.best.length + 1)
      }
    }
  })

  it('nimmt Alternativen aus der Tabelle, sonst nur gleich kurze Single-Wege', () => {
    const rest = (id: string) => byId.get(id) as RestCard
    expect(rest('r-121').alternatives).toEqual([['T17', 'T20', 'D5']])
    expect(rest('r-121').alternatives[0]).toEqual(['T17', 'T20', 'D5'])
    expect(rest('r-40').alternatives).toEqual([])
    expect(rest('r-32').alternatives).toEqual([])
    expect(rest('r-7').best).toEqual(['S3', 'D2'])
    for (const alt of rest('r-7').alternatives) {
      expect(alt).toHaveLength(2)
      expect(alt[0]).toMatch(/^S\d+$/)
    }
    for (const c of cards) {
      if (c.kind !== 'rest' || REFERENCE_ALTERNATIVES[c.rest]) continue
      for (const alt of c.alternatives) {
        expect(alt).toHaveLength(c.best.length)
        for (const d of alt.slice(0, -1)) expect(d).toMatch(/^S(\d|1\d|20)$/)
      }
    }
  })

  it('nennt bei genau einem möglichen Weg den einzigen Weg', () => {
    expect((byId.get('r-170') as RestCard).reason).toBe('Der einzige Weg.')
  })

  it('stimmt mit der generierten Datei überein', () => {
    expect(CARDS).toEqual(cards)
  })
})
