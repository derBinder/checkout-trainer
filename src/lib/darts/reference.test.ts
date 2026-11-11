import { describe, expect, it } from 'vitest'
import { isBogey, minDarts } from '@/lib/darts/checkouts'
import { routeTotal } from '@/lib/darts/model'
import { REFERENCE, referenceRoute } from '@/lib/darts/reference'

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
