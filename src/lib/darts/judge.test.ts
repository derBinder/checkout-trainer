import { describe, expect, it } from 'vitest'
import { CARDS, cardById } from '@/lib/cards'
import { allCheckouts, BOGEYS } from './checkouts'
import { checkFor, judge, maxDarts, offersNotCheckable, type Answer, type Check } from './judge'
import { dartValue, formatDart, parseDart, type Dart } from './model'
import { compareRoutesBy, compareSetups, leaveTier } from './scoring'

const check = (id: string) => checkFor(cardById(id)!)
const darts = (...d: string[]): Answer => ({ kind: 'darts', darts: d })
const notCheckable: Answer = { kind: 'notCheckable' }

describe('checkFor', () => {
  it('builds a rest check from best, alternatives and twoDarts', () => {
    expect(check('r-121')).toEqual({
      kind: 'rest',
      rest: 121,
      best: [['T20', 'T11', 'D14']],
      good: [['T17', 'T20', 'D5']],
    })
  })

  it('expands a split best route into both routes', () => {
    // r-42: best "10/6 · D16/D18"
    expect(check('r-42')).toEqual({ kind: 'rest', rest: 42, best: [['S10', 'D16'], ['S6', 'D18']], good: [] })
  })

  it('builds a follow check from a miss card with finish', () => {
    expect(check('m-121-0')).toEqual({ kind: 'follow', rest: 101, maxDarts: 2, best: [['T17', 'Bull']] })
  })

  it('builds a setup check from a miss card without finish', () => {
    // m-125-1: neuer Rest 52, 1 Dart, Stellwurf S20 → Rest 32
    expect(check('m-125-1')).toEqual({ kind: 'setup', rest: 52, maxDarts: 1, throws: ['S20'] })
  })

  it('offers Nicht checkbar only on rest and bogey cards', () => {
    expect(offersNotCheckable(check('r-121'))).toBe(true)
    expect(offersNotCheckable(check('b-169'))).toBe(true)
    expect(offersNotCheckable(check('m-121-0'))).toBe(false)
  })
})

describe('judge', () => {
  it('judges the best route as best', () => {
    expect(judge(check('r-121'), darts('T20', 'T11', 'D14'))).toEqual({ code: 'best' })
  })

  it('judges either expanded route of a split best route as best', () => {
    expect(judge(check('r-42'), darts('S10', 'D16')).code).toBe('best')
    expect(judge(check('r-42'), darts('S6', 'D18')).code).toBe('best')
  })

  it('judges an alternative as alternative', () => {
    expect(judge(check('r-121'), darts('T17', 'T20', 'D5')).code).toBe('alternative')
  })

  it('counts the two-dart column as alternative', () => {
    // r-61: best T15 · D8, Alternative T7 · D20, mit 2 Darts T11 · D14
    expect(check('r-61')).toMatchObject({ good: [['T7', 'D20'], ['T11', 'D14']] })
    expect(judge(check('r-61'), darts('T11', 'D14')).code).toBe('alternative')
  })

  it('order matters: a reordered best route is not recommended', () => {
    expect(judge(check('r-121'), darts('T11', 'T20', 'D14')).code).toBe('notRecommended')
  })

  it('a wrong total does not check out', () => {
    expect(judge(check('r-121'), darts('T20', 'T20', 'D14'))).toEqual({
      code: 'noCheckout',
      detail: { kind: 'total', total: 148, rest: 121 },
    })
  })

  it('a last dart that is no double does not check out', () => {
    expect(judge(check('r-100'), darts('T20', 'S20', 'S20'))).toEqual({
      code: 'noCheckout',
      detail: { kind: 'notDouble' },
    })
  })

  it('Bull counts as double', () => {
    expect(judge(check('r-100'), darts('S20', 'T10', 'Bull')).code).toBe('notRecommended')
  })

  it('Nicht checkbar on a rest card is wrong', () => {
    expect(judge(check('r-121'), notCheckable).code).toBe('checkable')
  })

  it('Nicht checkbar on a bogey is right', () => {
    expect(judge(check('b-169'), notCheckable).code).toBe('bogeyRight')
  })

  it('any route on a bogey does not check out', () => {
    expect(judge(check('b-169'), darts('T20', 'T19', 'Bull'))).toEqual({
      code: 'noCheckout',
      detail: { kind: 'notCheckable' },
    })
  })

  it('judges a miss follow-up against the new rest', () => {
    expect(judge(check('m-121-0'), darts('T17', 'Bull')).code).toBe('best')
    // m-100-0: neuer Rest 80, 2 Darts, empfohlen T20 · D10
    expect(judge(check('m-100-0'), darts('T16', 'D16')).code).toBe('notRecommended')
    expect(judge(check('m-100-0'), darts('T20', 'S10')).code).toBe('noCheckout')
  })

  it('judges a miss setup without ever saying noCheckout', () => {
    expect(judge(check('m-125-1'), darts('S20'))).toEqual({ code: 'setupRight' })
    expect(judge(check('m-125-1'), darts('S12')).code).toBe('setupOther')
  })

  it('calls a miss setup that overshoots the new rest a bust', () => {
    // m-125-1: neuer Rest 52, 1 Dart
    expect(judge(check('m-125-1'), darts('T20'))).toEqual({
      code: 'setupBust',
      detail: { kind: 'bust', total: 60, rest: 52 },
    })
  })
})

describe('two-dart cards', () => {
  it('checks a way card like a follow-up with two darts', () => {
    expect(check('t-61')).toEqual({ kind: 'follow', rest: 61, maxDarts: 2, best: [['T11', 'D14']] })
    expect(judge(check('t-61'), darts('T11', 'D14'))).toEqual({ code: 'best' })
    expect(judge(check('t-61'), darts('T15', 'D8')).code).toBe('notRecommended')
    expect(judge(check('t-61'), darts('T20', 'S1')).code).toBe('noCheckout')
  })

  it('has no split way, so no expanded routes are needed', () => {
    for (const card of CARDS) {
      if (card.kind !== 'two' || card.follow.kind !== 'finish') continue
      expect(card.follow.route.join(' '), card.id).not.toContain('/')
    }
  })

  it('checks a setup card like a miss setup and never says noCheckout', () => {
    expect(check('t-125')).toEqual({ kind: 'setup', rest: 125, maxDarts: 2, throws: ['T20', 'T11'] })
    expect(judge(check('t-125'), darts('T20', 'T11'))).toEqual({ code: 'setupRight' })
    expect(judge(check('t-125'), darts('T20', 'T15')).code).toBe('setupOther')
    expect(judge(check('t-125'), darts('T20', 'Bull')).code).toBe('setupOther')
  })

  it('allows two darts and no Nicht checkbar on both kinds', () => {
    for (const id of ['t-61', 't-125']) {
      expect(maxDarts(check(id))).toBe(2)
      expect(offersNotCheckable(check(id))).toBe(false)
    }
  })
})

describe('setup that leaves a bogey number', () => {
  it.each(BOGEYS)('says the setup leaves %i', (b) => {
    const setup: Check = { kind: 'setup', rest: b + 60, maxDarts: 2, throws: ['T20', 'S1'] }
    expect(judge(setup, darts('T20'))).toEqual({ code: 'setupBogey', detail: { kind: 'leavesBogey', leaves: b } })
  })

  it('keeps the card setup right even if it would leave a bogey number', () => {
    const setup: Check = { kind: 'setup', rest: 219, maxDarts: 3, throws: ['T20'] }
    expect(judge(setup, darts('T20'))).toEqual({ code: 'setupRight' })
  })

  it('applies with a single dart in hand', () => {
    expect(judge({ kind: 'setup', rest: 166 + 3, maxDarts: 1, throws: ['S1'] }, darts('S3'))).toEqual({
      code: 'setupBogey',
      detail: { kind: 'leavesBogey', leaves: 166 },
    })
  })
})

describe('three-dart setups above 170', () => {
  it('builds a three-dart setup check without Nicht checkbar', () => {
    expect(check('o-199')).toEqual({ kind: 'setup', rest: 199, maxDarts: 3, throws: ['T20', 'T20', 'T13'] })
    expect(offersNotCheckable(check('o-199'))).toBe(false)
  })

  const setup: Check = { kind: 'setup', rest: 171, maxDarts: 3, throws: ['T20', 'T20', 'S19'] }

  it('accepts the darts in any order', () => {
    expect(judge(setup, darts('T20', 'T20', 'S19'))).toEqual({ code: 'setupRight' })
    expect(judge(setup, darts('S19', 'T20', 'T20'))).toEqual({ code: 'setupRight' })
  })

  it('calls a short setup a different setup', () => {
    expect(judge(setup, darts('T20', 'T20')).code).toBe('setupOther')
  })

  it('calls a setup that leaves less than 2 a bust', () => {
    expect(judge(setup, darts('T20', 'T20', 'T20'))).toEqual({
      code: 'setupBust',
      detail: { kind: 'bust', total: 180, rest: 171 },
    })
    // Rest 0 ohne Doppel und Rest 1 sind ebenfalls überworfen, Rest 3 nicht.
    expect(judge(setup, darts('T20', 'T20', 'T17')).code).toBe('setupBust')
    expect(judge(setup, darts('T20', 'T20', 'Bull')).code).toBe('setupBust')
    expect(judge(setup, darts('T20', 'T20', 'T16')).code).toBe('setupOther')
  })

  it('has no setup card that a dart could check out, so rest 0 is always a bust', () => {
    for (const card of CARDS) {
      const c = checkFor(card)
      if (c.kind !== 'setup') continue
      expect(allCheckouts(c.rest, c.maxDarts), card.id).toEqual([])
    }
  })

  it('allows three darts', () => {
    expect(maxDarts(setup)).toBe(3)
  })
})

describe('another setup shot', () => {
  const setup = (rest: number, maxDarts: 1 | 2 | 3, ...throws: string[]): Check => ({ kind: 'setup', rest, maxDarts, throws })
  const why = (c: Check, ...d: string[]) => judge(c, darts(...d)).detail

  it('counts the same darts in another order as right', () => {
    expect(judge(setup(99, 2, 'T20', 'S7'), darts('S7', 'T20'))).toEqual({ code: 'setupRight' })
  })

  it('gives both leaves and doubles with the reason', () => {
    expect(judge(setup(99, 2, 'T20', 'S7'), darts('S2', 'T19'))).toEqual({
      code: 'setupOther',
      detail: { kind: 'setupOther', leaves: 40, bestLeaves: 32, double: 'D20', bestDouble: 'D16', reason: 'halvings' },
    })
    expect(why(setup(99, 2, 'T20', 'S7'), 'S1')).toMatchObject({ leaves: 98, double: null })
    expect(why(setup(99, 2, 'T20', 'S7'), 'S1', 'T16')).toMatchObject({ leaves: 50, double: 'Bull' })
  })

  it.each([
    [99, ['T20', 'S7'], ['S1'], 'fewerDarts'],
    [102, ['T20', 'S10'], ['S1', 'S2'], 'noTwoDartFinish'],
    [99, ['T20', 'S7'], ['S1', 'T16'], 'preferred'],
    [114, ['T20', 'S14'], ['T20', 'T10'], 'preferredOrder'], // 24 statt 40
    [155, ['T20', 'T19'], ['T15', 'T20'], 'doubleOverBull'],
    [159, ['T20', 'T20'], ['S1', 'T16'], 'lowerLeave'],
    [115, ['T20', 'S15'], ['T5', 'T20'], 'triples'],
    [99, ['T20', 'S7'], ['S10', 'T19'], 'onTwenty'],
    [103, ['T20', 'S11'], ['S20', 'T17'], 'equal'],
    [114, ['T20', 'S14'], ['D11', 'T20'], 'bigFields'], // Eingabe lässt 32, Empfehlung 40
    [99, ['T20', 'S7'], ['S17', 'Bull'], 'bigFields'], // gleicher Rest, ein Triple weniger
    [99, ['T20', 'S7'], ['D20', 'T9'], 'bigFields'], // sonst nur andere Felder
  ] as const)('rest %i: %j entered as %j is %s', (rest, best, entered, reason) => {
    expect(why(setup(rest, 2, ...best), ...entered)).toMatchObject({ reason })
  })

  it('names more darts for the same leave instead of calling the shots equal', () => {
    expect(why(setup(92, 3, 'T20'), 'S20', 'S20', 'S20')).toMatchObject({ leaves: 32, bestLeaves: 32, reason: 'moreDarts' })
  })

  it('ranks two one-dart leaves outside the preferred doubles by the higher double', () => {
    // 38 (D19) gegen 22 (D11): beide ohne Halbierung, das höhere Doppel steht vorn
    expect(why(setup(98, 2, 'T20'), 'T20', 'S16')).toMatchObject({ leaves: 22, bestLeaves: 38, reason: 'preferredOrder' })
  })

  it('compares the darts after normalising their notation', () => {
    expect(judge(setup(99, 2, ' T20', 'S7'), darts('S7', 'T20'))).toEqual({ code: 'setupRight' })
  })

  // Je Aufgabe ein Test: zusammen rund 2,6 Millionen Eingaben, einzeln bleibt jeder weit unter dem Zeitlimit.
  const setupChecks = [
    ...new Map(
      CARDS.map(checkFor)
        .filter((c) => c.kind === 'setup')
        .map((c) => [`${c.rest}/${c.maxDarts}`, c] as const),
    ),
  ]
  const fields: Dart[] = [
    ...(['S', 'D', 'T'] as const).flatMap((ring) => Array.from({ length: 20 }, (_, i): Dart => ({ ring, n: i + 1 }))),
    parseDart('25'),
    parseDart('Bull'),
  ]

  it('covers every setup task of the cards', () => {
    expect(setupChecks.length).toBeGreaterThan(100)
  })

  it.each(setupChecks)('gives every other setup shot for %s a reason that agrees with the ranking', (id, c) => {
    const violations: string[] = []
    const bestThrows = c.throws.map(parseDart)
    const best = { throws: bestThrows, leaves: c.rest - bestThrows.reduce((sum, d) => sum + dartValue(d), 0) }
    const walk = (entered: Dart[], from: number, remaining: number) => {
      if (entered.length > 0) {
        const verdict = judge(c, darts(...entered.map(formatDart)))
        if (verdict.code === 'setupOther') {
          const detail = verdict.detail
          const fail = (what: string) => violations.push(`${id} ${entered.map(formatDart).join(' ')}: ${what}`)
          if (detail?.kind !== 'setupOther') fail('no detail')
          else {
            const r = compareSetups({ throws: entered, leaves: remaining }, best)
            const usesBig = entered.some((d) => d.ring === 'D' || d.n === 25)
            const soft = detail.reason === 'equal' || detail.reason === 'bigFields'
            if (r.order <= 0 && detail.reason !== (usesBig ? 'bigFields' : 'equal')) fail(`ranks ${r.order} but ${detail.reason}`)
            if (!usesBig && r.order <= 0) fail('beats the recommendation without double or bull')
            if (r.by === 'darts') fail('decided by the number of darts')
            if (r.order > 0 && r.by !== 'fields' && soft) fail(`worse by ${r.by} but ${detail.reason}`)
            if (r.by === 'leave' && leaveTier(detail.leaves) !== 2) fail('lower leave outside two-dart leaves')
            if (['halvings', 'preferred', 'preferredOrder'].includes(detail.reason) && !(detail.double && detail.bestDouble))
              fail(`${detail.reason} without doubles`)
          }
        }
      }
      if (entered.length === c.maxDarts) return
      for (let i = from; i < fields.length; i++) {
        const next = remaining - dartValue(fields[i])
        if (next >= 2) walk([...entered, fields[i]], i, next)
      }
    }
    walk([], 0, c.rest)
    expect(violations.slice(0, 10)).toEqual([])
  })
})

describe('a route that is not recommended', () => {
  const why = (id: string, ...d: string[]) => judge(check(id), darts(...d))

  it.each([
    // r-41: bester Weg S9 · D16
    ['r-41', ['S1', 'S2', 'D19'], { reason: 'darts', darts: 2 }],
    ['r-41', ['S1', 'D20'], { reason: 'halvings', double: 'D20', bestDouble: 'D16' }],
    ['r-41', ['T3', 'D16'], { reason: 'triples' }],
    // r-43: bester Weg S3 · D20
    ['r-43', ['S19', 'D12'], { reason: 'finisher', double: 'D12', bestDouble: 'D20' }],
    ['r-43', ['T1', 'D20'], { reason: 'unsaved' }],
    // r-99: bester Weg T19 · S10 · D16, hier in anderer Reihenfolge
    ['r-99', ['S10', 'T19', 'D16'], { reason: 'unsaved' }],
    // r-82: bester Weg Bull · D16
    ['r-82', ['D16', 'Bull'], { reason: 'bull', bestDouble: 'D16' }],
    // r-42: geteiltes Ziel S10 · D16 oder S6 · D18, verglichen wird mit dem Weg auf dasselbe Doppel
    ['r-42', ['D3', 'D18'], { reason: 'reference', bestDouble: 'D18' }],
    ['r-42', ['S2', 'D20'], { reason: 'halvings', bestDouble: 'D16' }],
    // r-56: die Tabelle nennt T16 · D4, die Rangfolge sieht S16 · D20 vorn
    ['r-56', ['S16', 'D20'], { reason: 'reference' }],
    // r-42: nur die Felder unterscheiden sich
    ['r-42', ['D5', 'D16'], { reason: 'reference' }],
  ] as const)('%s entered as %j: %j', (id, entered, detail) => {
    const verdict = why(id, ...entered)
    expect(verdict.code).toBe('notRecommended')
    expect(verdict.detail).toMatchObject({ kind: 'notRecommended', ...detail })
  })

  it('names the order when the same darts only differ in it', () => {
    const c: Check = { kind: 'rest', rest: 26, best: [['S10', 'S8', 'D4']], good: [] }
    expect(judge(c, darts('S8', 'S10', 'D4')).detail).toMatchObject({ reason: 'order' })
  })

  it('gives a reason on follow-up cards too', () => {
    expect(why('t-61', 'T15', 'D8').detail).toMatchObject({ kind: 'notRecommended' })
  })

  const routeChecks = CARDS.map((card) => [card.id, checkFor(card)] as const).filter(
    ([, c]) => c.kind === 'rest' || c.kind === 'follow',
  )

  it.each(routeChecks)('gives every other checkout of %s a reason that agrees with the ranking', (id, c) => {
    if (c.kind !== 'rest' && c.kind !== 'follow') throw new Error('kein Weg')
    const violations: string[] = []
    for (const route of allCheckouts(c.rest, maxDarts(c))) {
      const verdict = judge(c, darts(...route.map(formatDart)))
      if (verdict.code !== 'notRecommended') continue
      const fail = (what: string) => violations.push(`${id} ${route.map(formatDart).join(' ')}: ${what}`)
      const detail = verdict.detail
      if (detail?.kind !== 'notRecommended') {
        fail('no detail')
        continue
      }
      // Bei geteiltem Ziel zählt der beste Weg auf dasselbe Doppel.
      const last = formatDart(route[route.length - 1])
      const best = (c.best.find((b) => b[b.length - 1] === last) ?? c.best[0]).map(parseDart)
      const r = compareRoutesBy(route, best)
      if (r.order <= 0 && detail.reason !== 'reference') fail(`ranks ${r.order} but ${detail.reason}`)
      const expected = r.by === 'halvings' && last === 'Bull' ? 'bull' : r.by
      if (r.order > 0 && r.by !== 'fields' && detail.reason !== expected) fail(`worse by ${r.by} but ${detail.reason}`)
      if (detail.bestDouble !== formatDart(best[best.length - 1])) fail('wrong best double')
      if (r.by === 'fields' && !['order', 'reference'].includes(detail.reason)) fail(`fields but ${detail.reason}`)
      if (c.rest <= 40 && detail.reason === 'reference') fail('no reason below 41')
      if (['halvings', 'finisher'].includes(detail.reason) && detail.double === detail.bestDouble) fail('same double')
    }
    expect(violations.slice(0, 10)).toEqual([])
  })
})
