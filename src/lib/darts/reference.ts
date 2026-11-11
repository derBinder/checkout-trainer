import { parseSteps, type Steps } from '@/lib/darts/model'

/**
 * Referenztabelle der Checkout-Wege von 2 bis 170 (Bogey-Zahlen haben keinen Eintrag).
 *
 * 41 bis 170: Checkout-Tabelle von Guido Wessendorf, Universität Münster,
 * https://www.uni-muenster.de/IT.GuidoWessendorf/checkout.html. Alle drei Spalten sind
 * unverändert übernommen: Variante 1 als bester Weg, Variante 2 als Alternative und
 * „mit 2 Darts" als Weg mit zwei Darts in der Hand. Umgeschrieben ist nur die Schreibweise:
 * Single "20" als S20, "SB" als 25, "DB" als Bull. Ziel zwischen zwei Feldern bleibt wie
 * in der Tabelle ("16/8", danach "D16/D20"; siehe Split in model.ts).
 *
 * 2 bis 40: Die Tabelle nennt diese Reste nicht. Hier gilt das eigene Regelwerk
 * (rankCheckouts(rest, 3)[0], mit Single-Feld statt Triple bei 7, 11, 19, 25, 31, 35).
 */

export type ChartEntry = { best: string; alternative?: string; twoDarts?: string }

/** Die Tabelle für 41 bis 170 in App-Schreibweise. */
export const CHART: Record<number, ChartEntry> = {
  41: { best: 'S9 D16' },
  42: { best: '10/6 D16/D18' },
  43: { best: 'S3 D20', alternative: 'S11 D16' },
  44: { best: 'S12 D16', alternative: 'S4 D20' },
  45: { best: 'S13 D16', alternative: 'S19 D13' },
  46: { best: '6/10 D20/D18' },
  47: { best: 'S7 D20', alternative: 'S15 D16' },
  48: { best: '16/8 D16/D20' },
  49: { best: 'S9 D20', alternative: 'S17 D16' },
  50: { best: 'S10 D20', alternative: 'S18 D16' },
  51: { best: 'S11 D20', alternative: 'S19 D16' },
  52: { best: 'S12 D20', alternative: 'S20 D16' },
  53: { best: 'S13 D20' },
  54: { best: 'S14 D20' },
  55: { best: 'S15 D20' },
  56: { best: 'T16 D4' },
  57: { best: 'S17 D20' },
  58: { best: 'S18 D20' },
  59: { best: 'S19 D20' },
  60: { best: 'S20 D20' },
  61: { best: 'T15 D8', alternative: 'T7 D20', twoDarts: 'T11 D14' },
  62: { best: 'T10 D16', twoDarts: 'T12 D13' },
  63: { best: 'T13 D12', alternative: 'T17 D6', twoDarts: 'T13 D12' },
  64: { best: 'T16 D8', twoDarts: 'T14 D11' },
  65: { best: 'T11 D16', alternative: 'T19 D4', twoDarts: 'T15 D10' },
  66: { best: 'T10 D18', alternative: 'T18 D6', twoDarts: 'T16 D9' },
  67: { best: 'T9 D20', twoDarts: 'T17 D8' },
  68: { best: 'T20 D4', alternative: 'T16 D10', twoDarts: 'T18 D7' },
  69: { best: 'T19 D6', twoDarts: 'T19 D6' },
  70: { best: 'T18 D8', twoDarts: 'T20 D5' },
  71: { best: 'T13 D16' },
  72: { best: 'T16 D12', alternative: 'T20 D6' },
  73: { best: 'T19 D8' },
  74: { best: 'T14 D16' },
  75: { best: 'T17 D12' },
  76: { best: 'T20 D8', alternative: 'T16 D14' },
  77: { best: 'T19 D10' },
  78: { best: 'T18 D12' },
  79: { best: 'T19 D11', alternative: 'T13 D20' },
  80: { best: 'T20 D10', alternative: 'D20 D20' },
  81: { best: 'T19 D12', alternative: 'T15 D18' },
  82: { best: 'Bull D16', alternative: 'T14 D20' },
  83: { best: 'T17 D16' },
  84: { best: 'T20 D12' },
  85: { best: 'T15 D20', alternative: 'T19 D14' },
  86: { best: 'T18 D16' },
  87: { best: 'T17 D18' },
  88: { best: 'T20 D14' },
  89: { best: 'T19 D16' },
  90: { best: 'T20 D15', twoDarts: 'T18 D18' },
  91: { best: 'T17 D20', alternative: '25 T16 D9' },
  92: { best: 'T20 D16', alternative: '25 T17 D8' },
  93: { best: 'T19 D18', alternative: '25 T18 D7' },
  94: { best: 'T18 D20', alternative: '25 T19 D6' },
  95: { best: 'T19 D19', alternative: '25 T20 D5' },
  96: { best: 'T20 D18' },
  97: { best: 'T19 D20' },
  98: { best: 'T20 D19' },
  99: { best: 'T19 10/6 D16/D18' },
  100: { best: 'T20 D20' },
  101: { best: 'T20 S9 D16', twoDarts: 'T17 Bull' },
  102: { best: 'T20 10/6 D16/D18' },
  103: { best: 'T19 6/10 D20/D18' },
  104: { best: 'T19 S15 D16', twoDarts: 'T18 Bull' },
  105: { best: 'T20 S13 D16' },
  106: { best: 'T20 T10 D8' },
  107: { best: 'T19 T10 D10', twoDarts: 'T19 Bull' },
  108: { best: 'T20 16/8 D16/D20' },
  109: { best: 'T20 S9 D20' },
  110: { best: 'T20 T10 D10', twoDarts: 'T20 Bull' },
  111: { best: 'T19 S14 D20', alternative: 'T20 S11 D20' },
  112: { best: 'T20 T12 D8' },
  113: { best: 'T19 S16 D20' },
  114: { best: 'T19 S17 D20', alternative: 'T20 S14 D20' },
  115: { best: 'T20 S15 D20', alternative: 'T19 S18 D20' },
  116: { best: 'T19 S19 D20', alternative: 'T20 S16 D20' },
  117: { best: 'T19 S20 D20', alternative: 'T20 S17 D20' },
  118: { best: 'T20 S18 D20' },
  119: { best: 'T19 T12 D13' },
  120: { best: 'T20 S20 D20' },
  121: { best: 'T20 T11 D14', alternative: 'T17 T20 D5' },
  122: { best: 'T18 T18 D7' },
  123: { best: 'T19 T16 D9' },
  124: { best: 'T20 T14 D11' },
  125: { best: 'T18 T19 D7', alternative: 'T20 T15 D10' },
  126: { best: 'T19 T19 D6' },
  127: { best: 'T20 T17 D8' },
  128: { best: 'T18 T14 D16', alternative: 'T20 T18 D7' },
  129: { best: 'T19 T16 D12', alternative: 'T20 T19 D6' },
  130: { best: 'T20 T20 D5' },
  131: { best: 'T19 T14 D16', alternative: 'T20 T13 D16' },
  132: { best: 'T20 T16 D12', alternative: '25 T19 Bull' },
  133: { best: 'T20 T19 D8' },
  134: { best: 'T20 T16 D13' },
  135: { best: 'T20 T17 D12', alternative: '25 T20 Bull' },
  136: { best: 'T20 T20 D8' },
  137: { best: 'T20 T19 D10' },
  138: { best: 'T20 T18 D12', alternative: 'T19 T19 D12' },
  139: { best: 'T20 T13 D20', alternative: 'T20 T19 D11' },
  140: { best: 'T20 T20 D10' },
  141: { best: 'T20 T19 D12' },
  142: { best: 'T20 T14 D20', alternative: 'T19 T19 D14' },
  143: { best: 'T20 T17 D16', alternative: 'T19 T18 D16' },
  144: { best: 'T20 T20 D12' },
  145: { best: 'T20 T19 D14' },
  146: { best: 'T20 T18 D16', alternative: 'T19 T19 D16' },
  147: { best: 'T20 T17 D18', alternative: 'T19 T18 D18' },
  148: { best: 'T20 T20 D14', alternative: 'T19 T17 D20' },
  149: { best: 'T20 T19 D16' },
  150: { best: 'T20 T18 D18', alternative: 'T19 T19 D18' },
  151: { best: 'T20 T17 D20', alternative: 'T19 T18 D20' },
  152: { best: 'T20 T20 D16' },
  153: { best: 'T20 T19 D18' },
  154: { best: 'T20 T18 D20' },
  155: { best: 'T20 T19 D19' },
  156: { best: 'T20 T20 D18' },
  157: { best: 'T20 T19 D20' },
  158: { best: 'T20 T20 D19' },
  160: { best: 'T20 T20 D20' },
  161: { best: 'T20 T17 Bull' },
  164: { best: 'T20 T18 Bull', alternative: 'T19 T19 Bull' },
  167: { best: 'T20 T19 Bull' },
  170: { best: 'T20 T20 Bull' },
}

/** Eigene Wege für 2 bis 40. */
export const OWN_ROUTES: Record<number, string> = {
  2: 'D1',
  3: 'S1 D1',
  4: 'D2',
  5: 'S1 D2',
  6: 'D3',
  7: 'S3 D2',
  8: 'D4',
  9: 'S1 D4',
  10: 'D5',
  11: 'S3 D4',
  12: 'D6',
  13: 'S5 D4',
  14: 'D7',
  15: 'S7 D4',
  16: 'D8',
  17: 'S1 D8',
  18: 'D9',
  19: 'S3 D8',
  20: 'D10',
  21: 'S5 D8',
  22: 'D11',
  23: 'S7 D8',
  24: 'D12',
  25: 'S9 D8',
  26: 'D13',
  27: 'S11 D8',
  28: 'D14',
  29: 'S13 D8',
  30: 'D15',
  31: 'S15 D8',
  32: 'D16',
  33: 'S1 D16',
  34: 'D17',
  35: 'S3 D16',
  36: 'D18',
  37: 'S5 D16',
  38: 'D19',
  39: 'S7 D16',
  40: 'D20',
}

/** Der beste Weg für einen Rest, oder undefined (Bogey-Zahl oder außerhalb von 2 bis 170). */
export function referenceRoute(rest: number): Steps | undefined {
  const route = CHART[rest]?.best ?? OWN_ROUTES[rest]
  return route === undefined ? undefined : parseSteps(route)
}

/** Variante 2 der Tabelle, oder undefined, wenn die Tabelle keine nennt. */
export function chartAlternative(rest: number): Steps | undefined {
  const route = CHART[rest]?.alternative
  return route === undefined ? undefined : parseSteps(route)
}

/** Der Weg der Spalte „mit 2 Darts", oder undefined, wenn die Tabelle keinen nennt. */
export function chartTwoDarts(rest: number): Steps | undefined {
  const route = CHART[rest]?.twoDarts
  return route === undefined ? undefined : parseSteps(route)
}

/** Ob der Rest in der Tabelle steht (41 bis 170 ohne Bogey-Zahlen). */
export function isChartRest(rest: number): boolean {
  return CHART[rest] !== undefined
}
