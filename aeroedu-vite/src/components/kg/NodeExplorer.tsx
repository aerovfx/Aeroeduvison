/**
 * NodeExplorer — Hiển thị liên kết của 1 node phân nhóm theo loại quan hệ,
 * giúp user khai thác tối đa thông tin + khám phá liên môn.
 *
 * Thay vì list phẳng "Liên kết (15)" như cũ, group thành 6 sections:
 *   📚 Cấu trúc môn   — HAS_CHAPTER, HAS_TOPIC, USES_FORMULA, USES_CONCEPT
 *   📐 Tiên quyết     — REQUIRES (in: bạn cần học X trước)
 *   🚀 Mở rộng        — REQUIRES (out: học xong dẫn đến Y)
 *   🌉 LIÊN MÔN       — RELATES_TO + neighbor.type là Topic/Chapter từ môn KHÁC
 *                        (highlighted vì đây là "cầu nối tri thức")
 *   🔬 Ứng dụng       — APPLIED_IN
 *   💼 Nghề liên quan — APPLIED_IN_CAREER
 *   👤 Người liên quan — RELATES_TO + neighbor.type === 'Person'
 *
 * Mỗi neighbor card: chip màu theo type + label + nút → để navigate.
 * Cross-subject neighbors có badge 🌉 "Liên môn" + glow viền tím.
 */
import { ChevronRight, Sparkles } from 'lucide-react'
import {
  type KgNeighbor,
  getNodeColor,
  NODE_TYPE_LABELS,
} from '@/services/knowledge-graph.service'

interface Props {
  neighbors: KgNeighbor[]
  /** Node hiện tại (để detect cross-subject — node neighbor không cùng prefix subject) */
  currentNodeId: string
  /** Click vào 1 neighbor → navigate (load làm tâm + mở detail) */
  onNavigate: (id: string) => void
}

/** Detect subject prefix từ node ID — fragile nhưng đủ dùng cho seed pattern.
 *  VD: 'topic-coulomb', 'chap-vatli10-...', 'subj-vatli' → subject 'vatli'
 *      'topic-csdl-rdbms' → tin học (ICT)
 *      'topic-startup' → ktpl
 *  Trả 'unknown' nếu không match. */
function detectSubjectFromId(id: string): string {
  // Direct subject match: subj-XYZ
  const subjMatch = id.match(/^subj-([a-z0-9]+)/)
  if (subjMatch) return subjMatch[1].replace(/[0-9]/g, '') // strip trailing digits (g1, g2)

  // Chapter: chap-<subject><grade>-... e.g. chap-mt10-..., chap-tin11-py-oop
  const chapMatch = id.match(/^chap-([a-z]+)\d*/)
  if (chapMatch) return chapMatch[1]

  // Topic + concept + person + app + career: phải lookup ngược, fallback unknown.
  // Heuristic: check prefix nổi tiếng
  const topicHints: Array<[RegExp, string]> = [
    [/coulomb|newton|dien-|tu-|quang-|nhiet|cung-cau-ld/, 'vatli'],
    [/dna|rna|than-kinh|mau-suc-khoe|suc-khoe|quang-hop|tieu-hoa/, 'sinh'],
    [/python|html|css|js-|react|node-|ai-|ml-|ctdl|big-o/, 'tin'],
    [/dai-viet|cm8|cmcn1|vn-hoi-nhap|vnch|hp-2013/, 'lichsu'],
    [/dbsh|dbscl|tay-nguyen|sapa|halong|dia-li|asean/, 'diali'],
    [/ham-so|menh-de|xs-tk|thong-ke|vector-/, 'toan'],
    [/polymer|axit|bazo|nguyen-tu|pin-|ion/, 'hoa'],
    [/cncn|chan-nuoi|trau-bo|ga-vit/, 'cncn'],
    [/cnci|cmcn-40|robot|co-khi/, 'cnci'],
    [/dong-ho|hang-trong|picasso|van-gogh|ve-/, 'mt'],
    [/cong-ty|csr|esg|gdp|wto|bhxh|quyen-cn/, 'ktpl'],
    [/swot|riasec|mindset|growth-mindset|gia-tri-song/, 'hdtn'],
  ]
  for (const [re, subj] of topicHints) if (re.test(id)) return subj
  return 'unknown'
}

const REL_GROUPS = {
  structure: ['HAS_CHAPTER', 'HAS_TOPIC', 'USES_FORMULA', 'USES_CONCEPT'],
  application: ['APPLIED_IN'],
  career: ['APPLIED_IN_CAREER'],
  relates: ['RELATES_TO'],  // sẽ split thành liên môn + person
  requires: ['REQUIRES'],
  exhibits: ['EXHIBITS_PHENOMENON'],
} as const

export default function NodeExplorer({ neighbors, currentNodeId, onNavigate }: Props) {
  const currentSubject = detectSubjectFromId(currentNodeId)

  // Bucket neighbors theo nhóm
  const structure: KgNeighbor[] = []
  const requiresIn: KgNeighbor[] = []   // direction=in → bạn cần học X trước
  const requiresOut: KgNeighbor[] = []  // direction=out → học xong dẫn đến Y
  const crossSubject: KgNeighbor[] = [] // RELATES_TO neighbor từ môn khác
  const persons: KgNeighbor[] = []      // RELATES_TO Person
  const sameSubject: KgNeighbor[] = []  // RELATES_TO cùng môn (không gắn ai)
  const applications: KgNeighbor[] = []
  const careers: KgNeighbor[] = []
  const phenomena: KgNeighbor[] = []

  for (const nb of neighbors) {
    if (REL_GROUPS.structure.includes(nb.relType as any)) {
      structure.push(nb)
    } else if (nb.relType === 'REQUIRES') {
      if (nb.direction === 'in') requiresIn.push(nb)
      else requiresOut.push(nb)
    } else if (nb.relType === 'RELATES_TO') {
      if (nb.type === 'Person') persons.push(nb)
      else {
        const nbSubject = detectSubjectFromId(nb.id)
        if (currentSubject !== 'unknown' && nbSubject !== 'unknown' && nbSubject !== currentSubject) {
          crossSubject.push({ ...nb, _crossSubject: nbSubject } as any)
        } else {
          sameSubject.push(nb)
        }
      }
    } else if (REL_GROUPS.application.includes(nb.relType as any)) {
      applications.push(nb)
    } else if (REL_GROUPS.career.includes(nb.relType as any)) {
      careers.push(nb)
    } else if (REL_GROUPS.exhibits.includes(nb.relType as any)) {
      phenomena.push(nb)
    } else {
      sameSubject.push(nb)  // catch-all
    }
  }

  const sections: Array<{
    key: string
    icon: string
    label: string
    items: KgNeighbor[]
    accent: string
    hint?: string
    isCross?: boolean
  }> = [
    // 🌉 Liên môn ĐẶT TRƯỚC — đây là "ngôi sao" của explorer
    { key: 'cross',   icon: '🌉', label: 'LIÊN MÔN — Cầu nối tri thức', items: crossSubject, accent: '#a78bfa', isCross: true,
      hint: 'Các node từ môn khác liên kết với khái niệm này — khám phá liên ngành' },
    { key: 'reqIn',   icon: '📐', label: 'Tiên quyết — cần học trước', items: requiresIn, accent: '#fbbf24' },
    { key: 'reqOut',  icon: '🚀', label: 'Mở rộng — học xong tiếp', items: requiresOut, accent: '#34d399' },
    { key: 'struct',  icon: '📚', label: 'Cấu trúc môn', items: structure, accent: '#22d3ee' },
    { key: 'app',     icon: '🔬', label: 'Ứng dụng thực tế', items: applications, accent: '#fb923c' },
    { key: 'career',  icon: '💼', label: 'Nghề liên quan', items: careers, accent: '#f87171' },
    { key: 'persons', icon: '👤', label: 'Người liên quan', items: persons, accent: '#e879f9' },
    { key: 'pheno',   icon: '⚡', label: 'Hiện tượng', items: phenomena, accent: '#06b6d4' },
    { key: 'same',    icon: '🔗', label: 'Liên kết khác', items: sameSubject, accent: '#94a3b8' },
  ]

  const totalCount = neighbors.length
  if (totalCount === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-white/40 italic">
        Chưa có liên kết nào — node này đang đứng riêng lẻ
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header tổng */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
          Khám phá liên kết ({totalCount})
        </h3>
        {crossSubject.length > 0 && (
          <span className="text-[9px] font-bold text-purple-300 px-1.5 py-0.5 rounded
                          bg-purple-500/15 border border-purple-400/30 inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {crossSubject.length} liên môn
          </span>
        )}
      </div>

      {sections.filter(s => s.items.length > 0).map(s => (
        <ExplorerSection
          key={s.key}
          icon={s.icon}
          label={s.label}
          accent={s.accent}
          isCross={!!s.isCross}
          hint={s.hint}
          items={s.items}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

/* ──────────────── Section ──────────────── */

function ExplorerSection({
  icon, label, items, accent, isCross, hint, onNavigate,
}: {
  icon: string
  label: string
  items: KgNeighbor[]
  accent: string
  isCross: boolean
  hint?: string
  onNavigate: (id: string) => void
}) {
  return (
    <section
      className={`rounded-lg overflow-hidden ${isCross ? 'ring-1' : ''}`}
      style={isCross
        ? { background: `${accent}10`, borderColor: `${accent}40`, boxShadow: `0 0 0 1px ${accent}30, 0 0 16px ${accent}20` }
        : { background: 'rgba(255,255,255,0.02)' }
      }
    >
      <header className="px-2.5 py-1.5 flex items-center gap-1.5 border-b" style={{ borderColor: `${accent}20` }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider flex-1 truncate"
              style={{ color: accent }}>
          {label}
        </span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40"
              style={{ color: accent, border: `1px solid ${accent}40` }}>
          {items.length}
        </span>
      </header>
      {hint && (
        <p className="px-2.5 py-1 text-[10px] text-white/60 italic border-b border-white/5">
          {hint}
        </p>
      )}
      <div className="divide-y divide-white/5">
        {items.map((nb, i) => (
          <NeighborCard
            key={`${nb.id}-${i}`}
            neighbor={nb}
            isCross={isCross}
            onNavigate={() => onNavigate(nb.id)}
          />
        ))}
      </div>
    </section>
  )
}

/* ──────────────── Neighbor card ──────────────── */

function NeighborCard({ neighbor, isCross, onNavigate }: {
  neighbor: KgNeighbor & { _crossSubject?: string }
  isCross: boolean
  onNavigate: () => void
}) {
  const c = getNodeColor(neighbor.type)
  const typeLabel = NODE_TYPE_LABELS[neighbor.type] || neighbor.type
  const arrow = neighbor.direction === 'out' ? '→' : '←'

  return (
    <button
      onClick={onNavigate}
      className="w-full text-left p-2 hover:bg-white/5 group transition flex items-start gap-2"
    >
      {/* Color chip */}
      <div
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold mt-0.5"
        style={{
          background: c.fill,
          border: `1px solid ${c.stroke}`,
          color: c.text,
        }}
      >
        {typeLabel.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white leading-tight line-clamp-2">
          {neighbor.label}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[9px] text-white/40">
            {arrow} {typeLabel}
          </span>
          {isCross && neighbor._crossSubject && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded
                           bg-purple-500/25 text-purple-200 border border-purple-400/40">
              🌉 {SUBJECT_LABELS[neighbor._crossSubject] || neighbor._crossSubject}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white shrink-0 mt-1" />
    </button>
  )
}

/** Subject prefix → tên hiển thị tiếng Việt */
const SUBJECT_LABELS: Record<string, string> = {
  vatli:   'Vật lí',
  toan:    'Toán',
  hoa:     'Hóa',
  sinh:    'Sinh',
  lichsu:  'Sử',
  diali:   'Địa',
  cncn:    'CN Chăn nuôi',
  cnci:    'CN Công nghiệp',
  mt:      'Mĩ thuật',
  ktpl:    'KT-Pháp luật',
  hdtn:    'HĐ Trải nghiệm',
  tin:     'Tin học',
}
