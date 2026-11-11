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

/**
 * Ziel zwischen zwei Feldern (Schreibweise der Tabelle): "16/8" sind die Singles 16 und 8,
 * "D16/D20" die Doppel danach, D16 nach dem ersten Feld, D20 nach dem zweiten.
 */
export type Split = { split: [Dart, Dart] }
/** Ein Schritt eines Wegs: ein Feld oder ein Ziel zwischen zwei Feldern. */
export type Step = Dart | Split
/** Ein Weg in der Schreibweise der Tabelle, eventuell mit Ziel zwischen zwei Feldern. */
export type Steps = Step[]

export function isSplit(step: Step): step is Split {
  return 'split' in step
}

const SPLIT_SINGLE = /^(\d{1,2})\/(\d{1,2})$/
const SPLIT_DOUBLE = /^D(\d{1,2})\/D(\d{1,2})$/

function splitFields(a: string, b: string, s: string): [number, number] {
  const fields = [a, b].map(Number)
  const valid = fields.every((n, i) => n >= 1 && n <= 20 && String(n) === [a, b][i])
  if (!valid || fields[0] === fields[1]) throw new Error(`Ungültige Teilung: "${s}"`)
  return fields as [number, number]
}

/** Ein Anzeige-Text: ein Feld ("T20", "25", "Bull") oder eine Teilung ("16/8", "D16/D20"). */
export function parseStep(s: string): Step {
  const text = s.trim()
  if (!text.includes('/')) return parseDart(text)
  const single = SPLIT_SINGLE.exec(text)
  if (single) {
    const [a, b] = splitFields(single[1], single[2], s)
    return { split: [{ ring: 'S', n: a }, { ring: 'S', n: b }] }
  }
  const double = SPLIT_DOUBLE.exec(text)
  if (double) {
    const [a, b] = splitFields(double[1], double[2], s)
    return { split: [{ ring: 'D', n: a }, { ring: 'D', n: b }] }
  }
  throw new Error(`Ungültige Teilung: "${s}"`)
}

export function formatStep(step: Step): string {
  if (!isSplit(step)) return formatDart(step)
  const [a, b] = step.split
  return a.ring === 'S' ? `${a.n}/${b.n}` : `D${a.n}/D${b.n}`
}

/**
 * Parst einen Weg in der Schreibweise der Tabelle. Auf eine geteilte Single folgt
 * unmittelbar das geteilte Doppel, ein geteiltes Doppel steht nie allein.
 */
export function parseSteps(s: string): Steps {
  const steps = s.trim().split(/\s+/).map(parseStep)
  steps.forEach((step, i) => {
    if (!isSplit(step)) return
    const splitSingle = step.split[0].ring === 'S'
    const next = steps[i + 1]
    const prev = steps[i - 1]
    const ok = splitSingle
      ? next !== undefined && isSplit(next) && next.split[0].ring === 'D'
      : prev !== undefined && isSplit(prev) && prev.split[0].ring === 'S'
    if (!ok) throw new Error(`Teilung ohne passendes Gegenstück: "${s}"`)
  })
  return steps
}

export function formatSteps(steps: Steps): string {
  return steps.map(formatStep).join(' · ')
}

/** Die konkreten Wege: ohne Teilung der Weg selbst, sonst die ersten und die zweiten Felder. */
export function expandSteps(steps: Steps): Route[] {
  if (!steps.some(isSplit)) return [steps as Route]
  return [0, 1].map((i) => steps.map((step) => (isSplit(step) ? step.split[i] : step)))
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
