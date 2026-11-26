import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// shortcut: sharp kommt nur als Abhängigkeit von Next.js mit, bei Bedarf als devDependency eintragen.
import sharp from 'sharp'

const path = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url))

const rounded = readFileSync(path('src/app/icon.svg'), 'utf8')
// Randlos für iOS und maskierbare Icons: Das System schneidet die Form selbst zu.
const fullBleed = rounded.replace(' rx="22"', '')
if (fullBleed === rounded) throw new Error('icon.svg: rx="22" am Grund nicht gefunden')

// Jede Größe eigens aus der Vektorquelle: Die SVG ist 100 Einheiten breit, 72 dpi ergeben 100 Pixel.
const png = (svg: string, size: number) =>
  sharp(Buffer.from(svg), { density: (72 * size) / 100 }).resize(size, size).png().toBuffer()

/** ICO mit eingebetteten PNGs: 6 Bytes Kopf, 16 Bytes je Eintrag, dann die Bilddaten. */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map((image) => image.data)])
}

async function main() {
  mkdirSync(path('public'), { recursive: true })
  writeFileSync(path('src/app/apple-icon.png'), await png(fullBleed, 180))
  writeFileSync(path('public/icon-192.png'), await png(rounded, 192))
  writeFileSync(path('public/icon-512.png'), await png(rounded, 512))
  writeFileSync(path('public/icon-maskable-512.png'), await png(fullBleed, 512))
  const sizes = [16, 32, 48]
  const images = await Promise.all(sizes.map(async (size) => ({ size, data: await png(rounded, size) })))
  writeFileSync(path('src/app/favicon.ico'), ico(images))
  console.log('Icons aus src/app/icon.svg erzeugt')
}

void main()
