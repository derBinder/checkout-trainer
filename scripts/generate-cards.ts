import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildCards } from '@/lib/darts/cards'

const target = fileURLToPath(new URL('../src/data/cards.generated.json', import.meta.url))
const cards = buildCards()
writeFileSync(target, JSON.stringify(cards, null, 2) + '\n')
console.log(`${cards.length} Karten nach ${target} geschrieben`)
