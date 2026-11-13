import { describe, expect, it } from 'vitest'
import { buildCards, type FollowText, type MissCard, type RestCard, type TwoDartCard } from '@/lib/darts/cards'
import { allCheckouts, isBogey } from '@/lib/darts/checkouts'
import { expandSteps, parseStep, routeTotal } from '@/lib/darts/model'
import { CHART } from '@/lib/darts/reference'
import { CARDS } from '@/lib/cards'

/** Anzeige-Texte zurück in konkrete Wege; ein geteilter Weg ergibt zwei. */
const expand = (darts: string[]) => expandSteps(darts.map(parseStep))
const chartText = (route: string | undefined) => route?.split(' ')

/** Jede Zerlegung summiert sich auf den Rest und endet auf Doppel oder Bull. */
function expectFinish(darts: string[], rest: number, label: string) {
  for (const route of expand(darts)) {
    expect(routeTotal(route), label).toBe(rest)
    expect(route.at(-1)!.ring, label).toBe('D')
  }
}

function expectFollowFits(follow: FollowText, rest: number, dartsLeft: number, label: string) {
  if (follow.kind === 'finish') {
    expect(follow.route.length, label).toBeLessThanOrEqual(dartsLeft)
    expectFinish(follow.route, rest, label)
  } else {
    expect(follow.throws.length, label).toBeLessThanOrEqual(dartsLeft)
    for (const route of expand(follow.throws)) expect(rest - routeTotal(route), label).toBe(follow.leaves)
  }
}

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
      for (const thrown of expand(c.thrown)) expect(c.rest - routeTotal(thrown)).toBe(c.newRest)
      expect(c.newRest).toBeGreaterThanOrEqual(2)
      expectFollowFits(c.follow, c.newRest, c.dartsLeft, c.id)
    }
  })

  it('hat keine Fehlwurf-Karten zu Bogey-Zahlen', () => {
    expect(cards.some((c) => c.kind === 'miss' && isBogey(c.rest))).toBe(false)
  })

  it('begründet jede Rest-Karte mit einem bekannten Fall', () => {
    for (const c of cards) {
      if (c.kind !== 'rest') continue
      expect(['only', 'direct', 'split', 'singleFinish', 'halving', 'chart']).toContain(c.reason.kind)
    }
  })

  it('wählt die Begründung nach der festgelegten Reihenfolge', () => {
    const reason = (id: string) => (byId.get(id) as RestCard).reason
    expect(reason('r-121')).toEqual({ kind: 'singleFinish', field: 20, bull: true })
    expect(reason('r-81')).toEqual({ kind: 'singleFinish', field: 19, bull: false })
    expect(reason('r-32')).toEqual({ kind: 'direct' })
    expect(['singleFinish', 'halving', 'chart']).toContain(reason('r-100').kind)
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

  it('nimmt für 41 bis 170 nur Variante 2 der Tabelle, darunter gleich kurze Single-Wege', () => {
    const rest = (id: string) => byId.get(id) as RestCard
    expect(rest('r-121').alternatives).toEqual([['T17', 'T20', 'D5']])
    expect(rest('r-40').alternatives).toEqual([])
    expect(rest('r-32').alternatives).toEqual([])
    expect(rest('r-7').best).toEqual(['S3', 'D2'])
    for (const alt of rest('r-7').alternatives) {
      expect(alt).toHaveLength(2)
      expect(alt[0]).toMatch(/^S\d+$/)
    }
    for (const c of cards) {
      if (c.kind !== 'rest') continue
      const chart = CHART[c.rest]
      if (chart) {
        expect(c.alternatives, `r-${c.rest}`).toEqual(chart.alternative ? [chartText(chart.alternative)] : [])
        continue
      }
      for (const alt of c.alternatives) {
        expect(alt).toHaveLength(c.best.length)
        for (const d of alt.slice(0, -1)) expect(d).toMatch(/^S(\d|1\d|20)$/)
      }
    }
  })

  it('folgt für 41 bis 170 der Tabelle: bester Weg, Alternative, mit 2 Darts', () => {
    for (const c of cards) {
      if (c.kind !== 'rest' || !CHART[c.rest]) continue
      const chart = CHART[c.rest]
      expect(c.best, c.id).toEqual(chartText(chart.best))
      expect(c.twoDarts, c.id).toEqual(chartText(chart.twoDarts))
      if (!chart.twoDarts) expect('twoDarts' in c, c.id).toBe(false)
    }
    for (const c of cards) {
      if (c.kind === 'rest' && c.rest <= 40) expect('twoDarts' in c, c.id).toBe(false)
    }
  })

  it('rechnet jeden Weg jeder Rest-Karte richtig, auch geteilte', () => {
    for (const c of cards) {
      if (c.kind !== 'rest') continue
      expectFinish(c.best, c.rest, `${c.id} best`)
      for (const alt of c.alternatives) expectFinish(alt, c.rest, `${c.id} alt`)
      if (c.twoDarts) {
        expect(c.twoDarts.length).toBeLessThanOrEqual(2)
        expectFinish(c.twoDarts, c.rest, `${c.id} twoDarts`)
      }
      for (const sc of c.singleCases) expectFollowFits(sc.follow, sc.newRest, sc.dartsLeft, `${c.id} ${sc.dartIndex}`)
    }
  })

  it('zeigt bei 110 den Tabellenweg, den Weg mit 2 Darts und beide Single-Fälle', () => {
    const card = byId.get('r-110') as RestCard
    expect(card.best).toEqual(['T20', 'T10', 'D10'])
    expect(card.twoDarts).toEqual(['T20', 'Bull'])
    expect(card.singleCases.map((c) => c.dartIndex)).toEqual([0, 1])
  })

  it('nimmt nach einem Single mit zwei Darts den Weg „mit 2 Darts" der Tabelle', () => {
    expect(byId.get('m-110-0')).toMatchObject({
      thrown: ['S20'],
      newRest: 90,
      dartsLeft: 2,
      follow: { kind: 'finish', route: ['T18', 'D18'] },
    })
    expect((byId.get('m-121-0') as MissCard).follow).toEqual({ kind: 'finish', route: ['T17', 'Bull'] })
    for (const c of cards) {
      if (c.kind !== 'miss' || c.dartsLeft !== 2) continue
      const two = CHART[c.newRest]?.twoDarts
      if (two) expect(c.follow, c.id).toEqual({ kind: 'finish', route: chartText(two) })
    }
  })

  it('zeigt geteilte Wege in der Schreibweise der Tabelle, ohne Single-Fälle', () => {
    const card = byId.get('r-48') as RestCard
    expect(card.best).toEqual(['16/8', 'D16/D20'])
    expect(card.singleCases).toEqual([])
    expect((byId.get('r-108') as RestCard).best).toEqual(['T20', '16/8', 'D16/D20'])
  })

  it('begründet geteilte Wege mit dem Ziel zwischen den Feldern', () => {
    expect((byId.get('r-48') as RestCard).reason).toEqual({ kind: 'split', a: 16, b: 8 })
    expect((byId.get('r-42') as RestCard).reason).toEqual({ kind: 'split', a: 10, b: 6 })
  })

  it('nimmt nach einem Single mit zwei Darts sonst Variante 1, wenn sie in zwei Darts passt', () => {
    // 99 = T19 10/6 D16/D18: Single 19 lässt 80, Tabelle ohne Spalte „mit 2 Darts", Variante 1 T20 D10.
    expect(byId.get('m-99-0')).toMatchObject({ newRest: 80, follow: { kind: 'finish', route: ['T20', 'D10'] } })
  })

  it('nimmt mit einem Dart das Ein-Dart-Finish', () => {
    expect((byId.get('m-121-1') as MissCard).follow).toEqual({ kind: 'finish', route: ['Bull'] })
    for (const c of cards) {
      if (c.kind !== 'miss' || c.dartsLeft !== 1) continue
      const oneDart = c.newRest === 50 || (c.newRest % 2 === 0 && c.newRest <= 40)
      expect(c.follow.kind, c.id).toBe(oneDart ? 'finish' : 'setup')
    }
  })

  it('nennt bei genau einem möglichen Weg den einzigen Weg', () => {
    expect((byId.get('r-170') as RestCard).reason).toEqual({ kind: 'only' })
    expect((byId.get('r-2') as RestCard).reason).toEqual({ kind: 'only' })
  })

  it('zählt Vertauschungen derselben Darts als einen Weg', () => {
    // T20 T19 Bull und T19 T20 Bull sind derselbe Weg.
    expect((byId.get('r-167') as RestCard).reason).toEqual({ kind: 'only' })
  })

  it('nennt ohne andere Begründung den Tabellenweg', () => {
    expect((byId.get('r-134') as RestCard).reason).toEqual({ kind: 'chart' })
  })

  it('nennt Enden auf einem mehrfach halbierbaren Doppel', () => {
    expect((byId.get('r-33') as RestCard).reason).toEqual({ kind: 'halving', double: 'D16', times: 4 })
    expect((byId.get('r-4') as RestCard).reason).toEqual({ kind: 'direct' })
  })

  it('stimmt mit der generierten Datei überein', () => {
    expect(CARDS).toEqual(cards)
  })
})

describe('Zwei-Dart-Karten', () => {
  const cards = buildCards()
  const byId = new Map(cards.map((c) => [c.id, c]))
  const twos = cards.filter((c): c is TwoDartCard => c.kind === 'two')
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const indexOf = (id: string) => cards.findIndex((c) => c.id === id)

  it('erzeugt 15 Weg- und 67 Stellwurf-Karten an den richtigen Resten', () => {
    const ways = twos.filter((c) => c.follow.kind === 'finish').map((c) => c.rest)
    const setups = twos.filter((c) => c.follow.kind === 'setup').map((c) => c.rest)
    expect(ways).toEqual([...range(61, 70), 90, 101, 104, 107, 110])
    expect(setups).toEqual([99, 102, 103, 105, 106, 108, 109, ...range(111, 170)])
    expect(twos.map((c) => c.id)).toEqual(twos.map((c) => `t-${c.rest}`))
    expect(cards).toHaveLength(402)
  })

  it('nimmt für jede Weg-Karte die Tabellenspalte „mit 2 Darts" und checkt mit höchstens zwei Darts', () => {
    for (const c of twos) {
      if (c.follow.kind !== 'finish') continue
      expect(c.follow.route, c.id).toEqual(chartText(CHART[c.rest]?.twoDarts))
      expectFollowFits(c.follow, c.rest, 2, c.id)
    }
  })

  it('gibt Stellwürfe nur, wo mit zwei Darts kein Finish möglich ist', () => {
    for (const c of twos) {
      if (c.follow.kind !== 'setup') continue
      expect(allCheckouts(c.rest, 2), c.id).toEqual([])
      expect(c.follow.leaves, c.id).toBeGreaterThan(1)
      expectFollowFits(c.follow, c.rest, 2, c.id)
    }
  })

  it('stellt nach dem eigenen Regelwerk, auch bei Bogey-Zahlen', () => {
    const setup = (id: string) => (byId.get(id) as TwoDartCard).follow
    expect(setup('t-99')).toEqual({ kind: 'setup', throws: ['T20', 'S7'], leaves: 32 })
    expect(setup('t-125')).toEqual({ kind: 'setup', throws: ['T20', 'T11'], leaves: 32 })
    expect(setup('t-161')).toEqual({ kind: 'setup', throws: ['T20', 'T17'], leaves: 50 })
    expect(setup('t-170')).toEqual({ kind: 'setup', throws: ['T20', 'T20'], leaves: 50 })
    expect(setup('t-159')).toEqual({ kind: 'setup', throws: ['T20', 'T20'], leaves: 39 })
    expect(setup('t-169')).toEqual({ kind: 'setup', throws: ['T20', 'T20'], leaves: 49 })
  })

  it('lehrt dasselbe wie die Folgewege der Fehlwurf-Karten', () => {
    let compared = 0
    for (const c of cards) {
      if (c.kind !== 'miss' || c.dartsLeft !== 2) continue
      const two = byId.get(`t-${c.newRest}`) as TwoDartCard | undefined
      if (!two) continue
      expect(c.follow, c.id).toEqual(two.follow)
      compared++
    }
    expect(compared).toBeGreaterThan(0)
  })

  it('steht direkt nach den Fehlwurf-Karten ihres Rests', () => {
    expect(indexOf('t-121')).toBe(indexOf('m-121-1') + 1)
    expect(indexOf('t-159')).toBe(indexOf('b-159') + 1)
    const lastOf61 = cards.map((c) => c.rest).lastIndexOf(61)
    expect(indexOf('t-61')).toBe(lastOf61)
    expect(cards[indexOf('t-61') - 1].kind).not.toBe('two')
  })
})
