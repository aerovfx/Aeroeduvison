const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ROOT = '/Users/pixidev/Aeroeduvison/.claude/worktrees/elated-khayyam-41c9ed/aeroedu-vite'
const SRC = path.join(ROOT, 'public/logo.svg')
const OUT = path.join(ROOT, 'public/icons')

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const BG = '#0a0f1e'
  const svg = fs.readFileSync(SRC)

  await sharp(svg, { density: 600 }).resize(192, 192, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(OUT, 'icon-192.png'))
  await sharp(svg, { density: 600 }).resize(512, 512, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(OUT, 'icon-512.png'))

  // Maskable — inner 307×307 (60%) on 512×512 BG
  const inner = await sharp(svg, { density: 600 }).resize(307, 307, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toBuffer()
  await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
    .composite([{ input: inner, gravity: 'center' }])
    .png().toFile(path.join(OUT, 'icon-maskable-512.png'))

  await sharp(svg, { density: 600 }).resize(180, 180, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(OUT, 'apple-touch-icon.png'))
  await sharp(svg, { density: 600 }).resize(192, 192, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(OUT, 'safari-pinned-tab.png'))

  for (const size of [16, 32, 48, 64, 96, 128]) {
    await sharp(svg, { density: 600 }).resize(size, size, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(OUT, `favicon-${size}.png`))
  }
  console.log('[gen-pwa-icons] Generated', fs.readdirSync(OUT).length, 'icons in', OUT)
}
main().catch(e => { console.error(e); process.exit(1) })
