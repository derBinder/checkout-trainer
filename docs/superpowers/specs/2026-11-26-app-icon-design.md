# App-Icon

Refs #80

## Ziel

Der Checkout-Trainer bekommt ein eigenes Icon. Es erscheint im Browser-Tab und als App-Icon, wenn die App zum Homescreen oder Desktop hinzugefügt ist. Bisher liegt nur das Standard-Favicon von Next.js mit 16 und 32 Pixeln im Projekt, und das Manifest verweist allein darauf. Ein Apple-Touch-Icon fehlt.

## Aussehen

Ein gelber Ring mit gelbem Mittelpunkt auf schwarzem Grund, gewählt vom Auftraggeber.

| Teil | Wert im Raster 100 × 100 |
|---|---|
| Grund | `#0b0b0c`, Eckenradius 22 |
| Ring | Mitte 50/50, Radius 30, Strichstärke 7, `#ffd400` |
| Mittelpunkt | Mitte 50/50, Radius 9, `#ffd400` |

- Die Farben sind `--foreground` und `--accent` der App.
- Die Strichstärke 7 ist bei 16 Pixeln gut einen Pixel breit.
- Randlose Varianten haben keinen Eckenradius, sonst sind sie gleich.

## Dateien

| Datei | Größe | Form | Zweck |
|---|---|---|---|
| `src/app/icon.svg` | beliebig | runde Ecken | Browser-Tab, Quelle aller anderen |
| `src/app/favicon.ico` | 16, 32, 48 | runde Ecken | ältere Browser |
| `src/app/apple-icon.png` | 180 | randlos | iOS-Homescreen, iOS rundet selbst |
| `public/icon-192.png` | 192 | runde Ecken | Manifest, `any` |
| `public/icon-512.png` | 512 | runde Ecken | Manifest, `any` |
| `public/icon-maskable-512.png` | 512 | randlos | Manifest, `maskable` |

- Der Ring reicht bis 33,5 % vom Mittelpunkt und liegt damit in der sicheren Zone von 40 % für maskierbare Icons.
- `background_color` im Manifest wird `THEME_COLORS.dark`, damit der Startbildschirm der installierten App zum Icon passt. `theme_color` bleibt.

## Wege

1. **Feste Bilddateien nach der Datei-Konvention von Next.js.** Gewählt. Die Adressen behalten ihre Dateiendung, `proxy.ts` lässt sie deshalb durch.
2. **Zur Laufzeit erzeugtes Icon mit `icon.tsx` und `ImageResponse`.** Die Adresse `/icon` hat keine Endung, `proxy.ts` würde sie nach `/<lang>/icon` umleiten. Der Matcher müsste dafür geändert werden.
3. **Nur `metadata.icons` im Layout mit Dateien unter `public/`.** Das ist der Rückfall, falls Next.js die Dateien in `src/app/` nicht verlinkt, weil das Root-Layout unter `[lang]` liegt.

## Erzeugung

`npm run generate:icons` startet `scripts/generate-icons.ts`. Das Skript rechnet alle PNGs und die ICO-Datei aus `src/app/icon.svg`, jede Größe eigens aus der Vektorquelle. Es nutzt `sharp`, das mit Next.js installiert ist. Die erzeugten Dateien sind committet.

## Prüfung

- `manifest.test.ts` prüft die Einträge und dass jede genannte Datei mit der genannten Größe unter `public/` liegt.
- Im Browser: Der Seitenkopf enthält die Verweise auf `icon` und `apple-touch-icon`, und jede Icon-Adresse antwortet mit 200 ohne Umleitung.

## Nicht Teil der Änderung

- Ein eigenes helles Icon für helle Systeme
- Splash-Bilder für iOS
- Ein Vorschaubild für geteilte Links
