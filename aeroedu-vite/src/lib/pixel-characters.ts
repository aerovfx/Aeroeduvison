/**
 * MetroCity-inspired pixel art characters.
 *
 * Tham khảo: jik-a-4.itch.io/metrocity-free-topdown-character-pack (CC0)
 * Style: top-down 16×16 với head/torso/legs proportions, 4-direction facing.
 *
 * Pack gốc cung cấp 6 characters đa dạng (skin tone, hair, outfit). Vì
 * pack là image assets cần download manual, ta tự render bằng Canvas
 * 2D với cùng style 8-bit pixel art: palette swap để có nhiều variations
 * "MetroCity-style" mà không cần bundle asset.
 *
 * Mỗi character có:
 *   - skin tone (skin)
 *   - hair color + style (short/long/curly/topknot/bald)
 *   - shirt + optional accent
 *   - pants
 *   - shoes
 *   - optional accessory (glasses/tie/hat/mask/headband)
 *
 * Drawing: drawMetroCityCharacter(ctx, x, y, palette, facing, walking, frame)
 * - x, y: top-left of character (đứng trên tile size)
 * - facing: 'down' (default) | 'up' | 'left' | 'right'
 * - walking: bool — render walking leg-split + body bob
 * - frame: số frame tăng dần để animate (bobbing, blinking, ...)
 */

export type Facing = 'down' | 'up' | 'left' | 'right'
export type HairStyle = 'short' | 'long' | 'curly' | 'topknot' | 'bald' | 'cap'
export type Accessory = 'glasses' | 'tie' | 'mask' | 'headband' | null

export interface CharacterPalette {
  id: string
  name: string
  /** Vietnamese friendly label (vd "Bạn Lan", "Anh Long") */
  displayName?: string
  skin: string
  hair: string
  hairStyle: HairStyle
  shirt: string
  shirtAccent?: string
  pants: string
  shoes: string
  accessory?: Accessory
  /** Optional emoji thay cho head detail nếu muốn dùng cho NPC */
  emoji?: string
}

/** 10 MetroCity-style characters (palette swap variations). */
export const METRO_CHARACTERS: CharacterPalette[] = [
  {
    id: 'andy', name: 'Andy', displayName: 'Bạn Andy',
    skin: '#fde68a', hair: '#78350f', hairStyle: 'short',
    shirt: '#06b6d4', shirtAccent: '#0e7490',
    pants: '#1e3a8a', shoes: '#1f2937',
  },
  {
    id: 'maya', name: 'Maya', displayName: 'Bạn Maya',
    skin: '#e8b58b', hair: '#1c1917', hairStyle: 'long',
    shirt: '#ec4899', shirtAccent: '#9d174d',
    pants: '#0e7490', shoes: '#451a03',
  },
  {
    id: 'liam', name: 'Liam', displayName: 'Anh Liam',
    skin: '#fef3c7', hair: '#ca8a04', hairStyle: 'curly',
    shirt: '#22c55e', shirtAccent: '#15803d',
    pants: '#1e293b', shoes: '#fffefb',
    accessory: 'glasses',
  },
  {
    id: 'sara', name: 'Sara', displayName: 'Chị Sara',
    skin: '#c8a780', hair: '#7c2d12', hairStyle: 'topknot',
    shirt: '#f97316', shirtAccent: '#9a3412',
    pants: '#1e3a8a', shoes: '#1f2937',
  },
  {
    id: 'noah', name: 'Noah', displayName: 'Anh Noah',
    skin: '#a07a55', hair: '#0f172a', hairStyle: 'short',
    shirt: '#7c3aed', shirtAccent: '#5b21b6',
    pants: '#52525b', shoes: '#1f2937',
    accessory: 'tie',
  },
  {
    id: 'iris', name: 'Iris', displayName: 'Bạn Iris',
    skin: '#fce7d6', hair: '#dc2626', hairStyle: 'long',
    shirt: '#84cc16', shirtAccent: '#4d7c0f',
    pants: '#9333ea', shoes: '#fffefb',
  },
  {
    id: 'kai', name: 'Kai', displayName: 'Anh Kai',
    skin: '#92633c', hair: '#1c1917', hairStyle: 'cap',
    shirt: '#ef4444', shirtAccent: '#7f1d1d',
    pants: '#0f172a', shoes: '#1f2937',
    accessory: 'headband',
  },
  {
    id: 'nora', name: 'Nora', displayName: 'Cô Nora',
    skin: '#fff1d6', hair: '#a16207', hairStyle: 'short',
    shirt: '#0ea5e9', shirtAccent: '#0369a1',
    pants: '#1e293b', shoes: '#fffefb',
    accessory: 'glasses',
  },
  {
    id: 'duc', name: 'Đức', displayName: 'Anh Đức',
    skin: '#d4a574', hair: '#0f172a', hairStyle: 'short',
    shirt: '#fff', shirtAccent: '#10b981',
    pants: '#1e293b', shoes: '#fffefb',
    accessory: 'mask',
  },
  {
    id: 'linh', name: 'Linh', displayName: 'Bạn Linh',
    skin: '#f5d4b6', hair: '#0f172a', hairStyle: 'long',
    shirt: '#fbbf24', shirtAccent: '#92400e',
    pants: '#1e3a8a', shoes: '#451a03',
  },
]

/** Lookup character by id, fallback to first. */
export function getCharacter(id: string | undefined): CharacterPalette {
  return METRO_CHARACTERS.find(c => c.id === id) || METRO_CHARACTERS[0]
}

/** Pick character cho 1 career category dựa trên semantic match */
export function pickCharacterForCategory(category: string): CharacterPalette {
  const c = (category || '').toLowerCase()
  if (c.includes('y tế') || c.includes('dược') || c.includes('điều dưỡng')) return getCharacter('duc')
  if (c.includes('công nghệ') || c.includes('it') || c.includes('phần mềm')) return getCharacter('liam')
  if (c.includes('giáo dục') || c.includes('sư phạm')) return getCharacter('nora')
  if (c.includes('sáng tạo') || c.includes('thiết kế') || c.includes('truyền thông')) return getCharacter('iris')
  if (c.includes('khoa học') || c.includes('nghiên cứu') || c.includes('kỹ thuật')) return getCharacter('andy')
  if (c.includes('tài chính') || c.includes('kế toán') || c.includes('ngân hàng') || c.includes('kinh doanh')) return getCharacter('noah')
  if (c.includes('ẩm thực') || c.includes('đầu bếp') || c.includes('du lịch')) return getCharacter('sara')
  if (c.includes('pháp lý') || c.includes('luật')) return getCharacter('maya')
  if (c.includes('thể thao') || c.includes('quân sự')) return getCharacter('kai')
  return getCharacter('andy')
}

/**
 * Vẽ character pixel art tại (x, y).
 * Character size: 14×16 px (head 7×5 + body + 1 px shadow row).
 *
 * @param x left-x trên canvas (đơn vị pixel, không tile)
 * @param y top-y trên canvas
 * @param palette CharacterPalette
 * @param facing direction
 * @param walking nếu đang đi → leg-split + bob
 * @param frame frame counter cho animations
 */
export function drawMetroCityCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  palette: CharacterPalette,
  facing: Facing = 'down',
  walking = false,
  frame = 0,
) {
  ctx.save()

  // Bob animation (walking: 2-frame alternation, idle: slow sin)
  const walkBob = walking ? (Math.floor(frame / 8) % 2 === 0 ? 0 : -1) : 0
  const idleBob = walking ? 0 : Math.sin(frame / 30) * 0.3
  const bobOffset = walkBob + idleBob

  // Shadow under character (always at y+15)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(x + 2, y + 15, 10, 1)

  // Mirror for left-facing (flip horizontally)
  let drawX = x
  if (facing === 'left') {
    ctx.translate(x + 14, 0)
    ctx.scale(-1, 1)
    drawX = 0
  }

  // ── Legs / Pants ── (y+11 to y+13)
  ctx.fillStyle = palette.pants
  ctx.fillRect(drawX + 3, y + 11 + bobOffset, 8, 3)

  // Walking: leg split (dark line in middle)
  if (walking) {
    const legFrame = Math.floor(frame / 8) % 2
    ctx.fillStyle = '#0f172a'
    if (legFrame === 0) ctx.fillRect(drawX + 6, y + 12 + bobOffset, 1, 2)
    else ctx.fillRect(drawX + 7, y + 12 + bobOffset, 1, 2)
  }

  // Shoes (y+14)
  ctx.fillStyle = palette.shoes
  ctx.fillRect(drawX + 3, y + 14 + bobOffset, 3, 1)
  ctx.fillRect(drawX + 8, y + 14 + bobOffset, 3, 1)

  // ── Torso / Shirt ── (y+6 to y+10)
  ctx.fillStyle = palette.shirt
  ctx.fillRect(drawX + 3, y + 6 + bobOffset, 8, 5)

  // Shirt accent (collar / pattern)
  if (palette.shirtAccent) {
    ctx.fillStyle = palette.shirtAccent
    // Collar V
    ctx.fillRect(drawX + 6, y + 6 + bobOffset, 1, 1)
    ctx.fillRect(drawX + 7, y + 6 + bobOffset, 1, 1)
    // Side accent stripe
    ctx.fillRect(drawX + 3, y + 9 + bobOffset, 1, 2)
    ctx.fillRect(drawX + 10, y + 9 + bobOffset, 1, 2)
  }

  // Tie accessory
  if (palette.accessory === 'tie') {
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(drawX + 6, y + 7 + bobOffset, 2, 4)
  }

  // Arms (sides, palette.skin)
  ctx.fillStyle = palette.skin
  ctx.fillRect(drawX + 2, y + 7 + bobOffset, 1, 3)
  ctx.fillRect(drawX + 11, y + 7 + bobOffset, 1, 3)
  // Walking arm sway: small front offset
  if (walking) {
    const swayFrame = Math.floor(frame / 8) % 2
    ctx.fillStyle = palette.skin
    if (swayFrame === 0) {
      ctx.fillRect(drawX + 2, y + 10 + bobOffset, 1, 1)
    } else {
      ctx.fillRect(drawX + 11, y + 10 + bobOffset, 1, 1)
    }
  }

  // ── Head ── (y+1 to y+5)
  // Skin
  ctx.fillStyle = palette.skin
  ctx.fillRect(drawX + 4, y + 1 + bobOffset, 6, 5)

  // Hair styles
  ctx.fillStyle = palette.hair
  switch (palette.hairStyle) {
    case 'short':
      ctx.fillRect(drawX + 4, y + 1 + bobOffset, 6, 2)
      ctx.fillRect(drawX + 3, y + 2 + bobOffset, 1, 1)
      ctx.fillRect(drawX + 10, y + 2 + bobOffset, 1, 1)
      break
    case 'long':
      ctx.fillRect(drawX + 4, y + 1 + bobOffset, 6, 2)
      ctx.fillRect(drawX + 3, y + 2 + bobOffset, 1, 4)
      ctx.fillRect(drawX + 10, y + 2 + bobOffset, 1, 4)
      ctx.fillRect(drawX + 3, y + 5 + bobOffset, 8, 1) // shoulder length
      break
    case 'curly':
      ctx.fillRect(drawX + 4, y + 0 + bobOffset, 6, 2)
      ctx.fillRect(drawX + 3, y + 1 + bobOffset, 1, 2)
      ctx.fillRect(drawX + 10, y + 1 + bobOffset, 1, 2)
      ctx.fillRect(drawX + 5, y + 0 + bobOffset, 1, 1) // tuft
      ctx.fillRect(drawX + 8, y + 0 + bobOffset, 1, 1)
      break
    case 'topknot':
      ctx.fillRect(drawX + 4, y + 1 + bobOffset, 6, 2)
      ctx.fillRect(drawX + 6, y - 1 + bobOffset, 2, 2) // top bun
      break
    case 'bald':
      // No hair, slight head shading
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.fillRect(drawX + 4, y + 1 + bobOffset, 6, 1)
      break
    case 'cap':
      ctx.fillRect(drawX + 4, y + 1 + bobOffset, 6, 1)
      ctx.fillRect(drawX + 3, y + 2 + bobOffset, 8, 1) // cap brim
      ctx.fillRect(drawX + 4, y + 0 + bobOffset, 6, 1) // top
      break
  }

  // Headband
  if (palette.accessory === 'headband') {
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(drawX + 4, y + 2 + bobOffset, 6, 1)
  }

  // Face details — eyes (per facing)
  ctx.fillStyle = '#0f172a'
  if (facing === 'down') {
    ctx.fillRect(drawX + 5, y + 3 + bobOffset, 1, 1)
    ctx.fillRect(drawX + 8, y + 3 + bobOffset, 1, 1)
  } else if (facing === 'up') {
    // Back of head — no eyes, just hair extends
    ctx.fillStyle = palette.hair
    if (palette.hairStyle !== 'bald') {
      ctx.fillRect(drawX + 4, y + 3 + bobOffset, 6, 2)
    }
  } else {
    // facing right (mirrored handles left): 1 eye on right side
    ctx.fillRect(drawX + 8, y + 3 + bobOffset, 1, 1)
  }

  // Glasses
  if (palette.accessory === 'glasses' && facing !== 'up') {
    ctx.fillStyle = '#0f172a'
    if (facing === 'down') {
      // 2 lens outlines
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1
      ctx.strokeRect(drawX + 4.5, y + 2.5 + bobOffset, 2, 2)
      ctx.strokeRect(drawX + 7.5, y + 2.5 + bobOffset, 2, 2)
      ctx.fillRect(drawX + 6, y + 3 + bobOffset, 2, 1) // bridge
    } else {
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1
      ctx.strokeRect(drawX + 7.5, y + 2.5 + bobOffset, 2, 2)
    }
  }

  // Mask (medical)
  if (palette.accessory === 'mask' && facing !== 'up') {
    ctx.fillStyle = '#fffefb'
    ctx.fillRect(drawX + 4, y + 4 + bobOffset, 6, 2)
    // Mask straps
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(drawX + 3, y + 4 + bobOffset, 1, 1)
    ctx.fillRect(drawX + 10, y + 4 + bobOffset, 1, 1)
  }

  // Smile (only when idle + facing down)
  if (!walking && facing === 'down' && palette.accessory !== 'mask') {
    ctx.fillStyle = '#a16207'
    ctx.fillRect(drawX + 6, y + 5 + bobOffset, 2, 1)
  }

  ctx.restore()
}

/** Render small preview swatch của character (for picker UI). */
export function drawCharacterPreview(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  palette: CharacterPalette,
  scale = 2,
) {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  drawMetroCityCharacter(ctx, 0, 0, palette, 'down', false, 0)
  ctx.restore()
}
