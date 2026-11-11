export type Ring = 'S' | 'D' | 'T'
/** n ist 1..20; 25 gibt es nur mit 'S' (Outer Bull) oder 'D' (Bull). */
export type Dart = { ring: Ring; n: number }
export type Route = Dart[]

const MULTIPLIER: Record<Ring, number> = { S: 1, D: 2, T: 3 }

export function dartValue(d: Dart): number {
  return MULTIPLIER[d.ring] * d.n
}

export function formatDart(d: Dart): string {
  if (d.n === 25) return d.ring === 'D' ? 'Bull' : '25'
  return `${d.ring}${d.n}`
}

export function parseDart(s: string): Dart {
  const text = s.trim()
  if (text === 'Bull') return { ring: 'D', n: 25 }
  if (text === '25') return { ring: 'S', n: 25 }
  const match = /^([SDT])(\d{1,2})$/.exec(text)
  if (match) {
    const n = Number(match[2])
    if (n >= 1 && n <= 20 && String(n) === match[2]) {
      return { ring: match[1] as Ring, n }
    }
  }
  throw new Error(`Ungültiges Feld: "${s}"`)
}

export function parseRoute(s: string): Route {
  return s.trim().split(/\s+/).map(parseDart)
}

export function formatRoute(r: Route): string {
  return r.map(formatDart).join(' · ')
}

export function routeTotal(r: Route): number {
  return r.reduce((sum, d) => sum + dartValue(d), 0)
}

function buildAllDarts(): Dart[] {
  const darts: Dart[] = []
  for (const ring of ['S', 'D', 'T'] as const) {
    for (let n = 1; n <= 20; n++) darts.push({ ring, n })
    if (ring !== 'T') darts.push({ ring, n: 25 })
  }
  return darts
}

/** Alle 62 Felder: S1..S20, S25, D1..D20, D25, T1..T20. */
export const ALL_DARTS: Dart[] = buildAllDarts()
