/**
 * osm-buildings.ts — Lấy footprint công trình từ OpenStreetMap (Overpass API)
 * và quy đổi ra TOẠ ĐỘ MÉT cục bộ quanh 1 tâm (lat0, lon0) để dựng "box" mô phỏng.
 *
 * Dùng cho mô phỏng bay drone trên địa hình thật:
 *   const boxes = await fetchOsmBuildings(21.0285, 105.8542, 700) // Hồ Gươm, HN
 *   → mỗi box: { cx, cz, w, d, h } (mét, tâm gốc = (lat0,lon0))
 *
 * Tối ưu: kết quả cache theo key (lat,lon,radius) trong memory + localStorage.
 * Chỉ lấy `way["building"]` (bỏ qua relation multipolygon cho nhẹ), giới hạn số box.
 */
export interface OsmBox {
  cx: number; cz: number   // tâm (mét) — x đông, z nam
  w: number; d: number     // bề rộng / sâu (mét) — bbox footprint
  h: number                // chiều cao (mét)
}

const CACHE = new Map<string, OsmBox[]>()
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const MAX_BOXES = 6000

function projKey(lat: number, lon: number, radius: number) {
  return `${lat.toFixed(4)},${lon.toFixed(4)},${radius}`
}

function parseHeight(tags: Record<string, string> | undefined, id = 0): number {
  if (!tags) return 9
  if (tags.height) {
    const m = parseFloat(tags.height)
    if (Number.isFinite(m) && m > 0) return Math.min(m, 400)
  }
  const lv = tags['building:levels']
  if (lv) {
    const n = parseFloat(lv)
    if (Number.isFinite(n) && n > 0) return Math.min(n * 3.2, 400)
  }
  // mặc định theo loại
  const b = tags.building
  if (b === 'house' || b === 'detached' || b === 'garage') return 6
  if (b === 'apartments' || b === 'commercial' || b === 'office') return 18
  // Pseudo-random DETERMINISTIC theo id (đồng bộ giữa người chơi cùng phòng)
  const r = ((Math.imul(id || 1, 2654435761) >>> 0) % 1000) / 1000
  return 9 + r * 6
}

/** Lat/lon → mét cục bộ quanh tâm (equirectangular). x: đông(+), z: nam(+). */
function toLocal(lat: number, lon: number, lat0: number, lon0: number): [number, number] {
  const x = (lon - lon0) * 111320 * Math.cos((lat0 * Math.PI) / 180)
  const z = -(lat - lat0) * 110540
  return [x, z]
}

function buildQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:25];(way["building"](around:${radius},${lat},${lon}););out body;>;out skel qt;`
}

/** Lấy + parse + project. Trả mảng box (mét). Cache lại. */
export async function fetchOsmBuildings(lat: number, lon: number, radius = 700): Promise<OsmBox[]> {
  const key = projKey(lat, lon, radius)
  if (CACHE.has(key)) return CACHE.get(key)!
  try {
    const ls = localStorage.getItem('osm_b_' + key)
    if (ls) { const arr = JSON.parse(ls) as OsmBox[]; CACHE.set(key, arr); return arr }
  } catch { /* */ }

  const query = buildQuery(lat, lon, radius)
  let data: any = null
  for (const url of MIRRORS) {
    // Timeout client ~14s/mirror → không kẹt 'loading' nếu Overpass treo
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 14000)
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      data = await res.json()
      break
    } catch { clearTimeout(timer) /* thử mirror kế */ }
  }
  if (!data || !Array.isArray(data.elements)) return []

  const nodes = new Map<number, [number, number]>()
  for (const el of data.elements) if (el.type === 'node') nodes.set(el.id, [el.lat, el.lon])

  const boxes: OsmBox[] = []
  for (const el of data.elements) {
    if (el.type !== 'way' || !Array.isArray(el.nodes) || el.nodes.length < 3) continue
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    let ok = false
    for (const nid of el.nodes) {
      const ll = nodes.get(nid)
      if (!ll) continue
      const [x, z] = toLocal(ll[0], ll[1], lat, lon)
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z)
      ok = true
    }
    if (!ok) continue
    const w = maxX - minX, d = maxZ - minZ
    if (w < 1.5 || d < 1.5 || w > 400 || d > 400) continue // bỏ footprint lỗi/quá to
    boxes.push({ cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, w, d, h: parseHeight(el.tags, el.id) })
    if (boxes.length >= MAX_BOXES) break
  }

  CACHE.set(key, boxes)
  try { localStorage.setItem('osm_b_' + key, JSON.stringify(boxes)) } catch { /* quá lớn → bỏ */ }
  return boxes
}

/** Một vài địa điểm mẫu (lat, lon). */
export const OSM_PLACES: { id: string; name: string; lat: number; lon: number }[] = [
  { id: 'hoankiem', name: 'Hồ Gươm — Hà Nội', lat: 21.0285, lon: 105.8542 },
  { id: 'q1hcm', name: 'Quận 1 — TP.HCM', lat: 10.7769, lon: 106.7009 },
  { id: 'danang', name: 'Sông Hàn — Đà Nẵng', lat: 16.0678, lon: 108.2208 },
  { id: 'manhattan', name: 'Manhattan — NYC', lat: 40.7549, lon: -73.984 },
]
