const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SRC = '/Users/pixidev/Downloads/aeroedu.png'
const PUB = 'public'
const ICONS = 'public/icons'
const APPICON = 'ios/App/App/Assets.xcassets/AppIcon.appiconset'
const BG = '#000000'  // logo nền đen — flatten đen cho khớp

async function main() {
  const src = fs.readFileSync(SRC)

  // ── Master logo (public/) ──
  await sharp(src).resize(1024, 1024, { fit: 'contain', background: BG }).png().toFile(path.join(PUB, 'logo.png'))

  // ── Web favicons ──
  await sharp(src).resize(32, 32).png().toFile(path.join(PUB, 'favicon-32x32.png'))
  // favicon.ico — multi-size (16+32+48)
  await sharp(src).resize(48, 48).png().toFile('/tmp/fav48.png')

  // ── PWA icons (public/icons/) ──
  await sharp(src).resize(192, 192, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(ICONS, 'icon-192.png'))
  await sharp(src).resize(512, 512, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(ICONS, 'icon-512.png'))
  await sharp(src).resize(180, 180, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(ICONS, 'apple-touch-icon.png'))
  await sharp(src).resize(192, 192, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(ICONS, 'safari-pinned-tab.png'))
  // Maskable — logo đã có margin, pad thêm nhẹ cho an toàn circle mask (logo 78% center)
  const inner = await sharp(src).resize(400, 400, { fit: 'contain', background: BG }).flatten({ background: BG }).toBuffer()
  await sharp({ create: { width: 512, height: 512, channels: 3, background: BG } })
    .composite([{ input: inner, gravity: 'center' }]).png().toFile(path.join(ICONS, 'icon-maskable-512.png'))
  for (const s of [16, 32, 48, 64, 96, 128]) {
    await sharp(src).resize(s, s, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile(path.join(ICONS, `favicon-${s}.png`))
  }

  // ── iOS AppIcon 1024 (no alpha) ──
  await sharp(src).resize(1024, 1024, { fit: 'contain', background: BG }).flatten({ background: BG }).removeAlpha().png().toFile(path.join(APPICON, 'AppIcon-512@2x.png'))

  console.log('[gen-logo] Done — web/PWA/iOS icons generated from aeroedu.png')
}
main().catch(e => { console.error(e); process.exit(1) })
