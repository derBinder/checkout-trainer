import { describe, expect, it } from 'vitest'
import { cardById } from '@/lib/cards'
import { checkFor, judge, offersNotCheckable, type Answer } from './judge'

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
