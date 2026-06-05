/** Kiểm tra điện cơ bản (ERC) bằng luật + xuất BOM. */
import type { PcbComponent, PcbNet } from '@/types/pcb'
import { TEMPLATES } from './pcbSymbols'
import { csvField } from './fab'

export function ercCheck(comps: PcbComponent[], nets: PcbNet[]): string[] {
  const out: string[] = []
  // ref trùng
  const seen = new Set<string>(); const dup = new Set<string>()
  comps.forEach((c) => { if (seen.has(c.ref)) dup.add(c.ref); seen.add(c.ref) })
  if (dup.size) out.push(`⚠ Mã linh kiện trùng: ${[...dup].join(', ')}`)
  // net rỗng/1 chân
  const lonely = nets.filter((n) => n.nodes.length < 2)
  if (lonely.length) out.push(`⚠ ${lonely.length} net chỉ có ≤1 chân (chưa nối): ${lonely.map((n) => n.name).join(', ')}`)
  // chân chưa nối
  const connected = new Set<string>(); nets.forEach((n) => n.nodes.forEach((nd) => connected.add(nd.comp + '|' + nd.pin)))
  let free = 0; const freeRefs = new Set<string>()
  comps.forEach((c) => c.pins.forEach((p) => { if (!connected.has(c.ref + '|' + p)) { free++; freeRefs.add(c.ref) } }))
  if (free) out.push(`⚠ ${free} chân chưa nối (ở: ${[...freeRefs].slice(0, 8).join(', ')}${freeRefs.size > 8 ? '…' : ''})`)
  // MCU/IC thiếu nguồn/GND
  const netOfPin = new Map<string, string>(); nets.forEach((n) => n.nodes.forEach((nd) => netOfPin.set(nd.comp + '|' + nd.pin, n.name)))
  const isGnd = (s?: string) => !!s && /gnd|mass/i.test(s); const isPwr = (s?: string) => !!s && /(vcc|3v3|5v|vdd|vbat|\+)/i.test(s)
  comps.filter((c) => c.type === 'MCU' || c.type === 'IC' || c.type === 'SENSOR').forEach((c) => {
    const conns = c.pins.map((p) => netOfPin.get(c.ref + '|' + p))
    if (!conns.some(isGnd)) out.push(`⚠ ${c.ref} (${c.value}) chưa nối GND`)
    if (!conns.some(isPwr)) out.push(`⚠ ${c.ref} (${c.value}) chưa nối nguồn (VCC/3V3)`)
  })
  if (!out.length) out.push('✓ Không phát hiện lỗi ERC theo luật cơ bản.')
  return out
}

export function bomCsv(comps: PcbComponent[]): string {
  const map = new Map<string, { type: string; value: string; refs: string[] }>()
  comps.forEach((c) => {
    const key = c.type + '|' + c.value
    if (!map.has(key)) map.set(key, { type: c.type, value: c.value, refs: [] })
    map.get(key)!.refs.push(c.ref)
  })
  let csv = 'STT,Loại,Linh kiện,Giá trị,Số lượng,Mã (refs)\n'
  let i = 1
  for (const v of map.values()) csv += [i++, csvField(TEMPLATES[v.type as keyof typeof TEMPLATES]?.label || v.type), csvField(v.type), csvField(v.value), v.refs.length, csvField(v.refs.join(' '))].join(',') + '\n'
  return csv
}
