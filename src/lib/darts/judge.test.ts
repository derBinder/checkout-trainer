import { describe, expect, it } from 'vitest'
import { CARDS, cardById } from '@/lib/cards'
import { BOGEYS } from './checkouts'
import { checkFor, judge, maxDarts, offersNotCheckable, type Answer, type Check } from './judge'

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
    expect(judge(check('m-125-1'), darts('S12'))).toEqual({ code: 'setupOther' })
    expect(judge(check('m-125-1'), darts('T20'))).toEqual({ code: 'setupOther' })
  })
})

describe('two-dart cards', () => {
  it('checks a way card like a follow-up with two darts', () => {
    expect(check('t-61')).toEqual({ kind: 'follow', rest: 61, maxDarts: 2, best: [['T11', 'D14']] })
    expect(judge(check('t-61'), darts('T11', 'D14'))).toEqual({ code: 'best' })
    expect(judge(check('t-61'), darts('T15', 'D8'))).toEqual({ code: 'notRecommended' })
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
    expect(judge(check('t-125'), darts('T20', 'T15'))).toEqual({ code: 'setupOther' })
    expect(judge(check('t-125'), darts('T20', 'Bull'))).toEqual({ code: 'setupOther' })
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

  it('counts the order of the darts', () => {
    expect(judge(setup, darts('T20', 'T20', 'S19'))).toEqual({ code: 'setupRight' })
    expect(judge(setup, darts('S19', 'T20', 'T20'))).toEqual({ code: 'setupOther' })
  })

  it('calls an overshoot or a short setup a different setup', () => {
    expect(judge(setup, darts('T20', 'T20', 'T20'))).toEqual({ code: 'setupOther' })
    expect(judge(setup, darts('T20', 'T20'))).toEqual({ code: 'setupOther' })
  })

  it('allows three darts', () => {
    expect(maxDarts(setup)).toBe(3)
  })
})
