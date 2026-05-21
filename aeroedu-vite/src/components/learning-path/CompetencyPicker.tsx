/**
 * CompetencyPicker — UI chọn năng lực + cấp độ mục tiêu cho 1 module hoặc cả path.
 *
 * Mỗi entry = { pillarId, targetLevel }.
 * Có 2 modes:
 *   - compact: dùng trong list module (chỉ show pill summary + button mở dialog)
 *   - inline:  hiển thị full grid để pick trực tiếp (dùng trong step "Năng lực mục tiêu")
 */
import { useState } from 'react'
import { Check, X, Sparkles } from 'lucide-react'
import {
  COMPETENCY_PILLARS,
  COMPETENCY_LEVELS,
  getPillar,
  getRubricDescriptor,
  type CompetencyLevel,
} from '@/lib/competency-framework'

export interface CompetencyTarget {
  pillarId: string
  targetLevel: CompetencyLevel
}

interface Props {
  value: CompetencyTarget[]
  onChange: (next: CompetencyTarget[]) => void
  mode?: 'compact' | 'inline'
  className?: string
}

export default function CompetencyPicker({ value, onChange, mode = 'inline' }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const setLevel = (pillarId: string, level: CompetencyLevel | null) => {
    if (level === null) {
      onChange(value.filter(v => v.pillarId !== pillarId))
    } else {
      const exists = value.find(v => v.pillarId === pillarId)
      if (exists) {
        onChange(value.map(v => v.pillarId === pillarId ? { ...v, targetLevel: level } : v))
      } else {
        onChange([...value, { pillarId, targetLevel: level }])
      }
    }
  }

  const renderGrid = () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {COMPETENCY_PILLARS.map(p => {
        const selected = value.find(v => v.pillarId === p.id)
        const isSelected = !!selected
        return (
          <div
            key={p.id}
            style={{
              background: isSelected ? `${p.color}15` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isSelected ? p.color + '60' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12,
              padding: 14,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{p.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: p.color }}>{p.name}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1.5px 6px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{p.code}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{p.desc}</div>
              </div>
              {isSelected && (
                <button
                  onClick={() => setLevel(p.id, null)}
                  title="Bỏ chọn năng lực này"
                  style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', padding: 4, lineHeight: 0,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Level picker — 4 buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              {COMPETENCY_LEVELS.map(lv => {
                const active = selected?.targetLevel === lv.level
                return (
                  <button
                    key={lv.level}
                    onClick={() => setLevel(p.id, active ? null : lv.level)}
                    style={{
                      flex: 1, padding: '7px 8px', borderRadius: 8,
                      border: `1px solid ${active ? lv.color : 'rgba(255,255,255,0.1)'}`,
                      background: active ? `${lv.color}25` : 'rgba(255,255,255,0.02)',
                      color: active ? lv.color : 'rgba(255,255,255,0.6)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      transition: 'all 0.15s',
                    }}
                    title={getRubricDescriptor(p.id, lv.level)}
                  >
                    <span style={{ fontSize: 9, opacity: 0.7 }}>{lv.shortLabel}</span>
                    <span style={{ fontSize: 10.5 }}>{lv.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Rubric descriptor hiện khi chọn */}
            {selected && (
              <div style={{
                marginTop: 8, padding: '6px 10px', borderRadius: 6,
                background: 'rgba(0,0,0,0.25)', fontSize: 11, color: 'rgba(255,255,255,0.7)',
                fontStyle: 'italic',
              }}>
                <Sparkles size={10} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle', color: COMPETENCY_LEVELS.find(l => l.level === selected.targetLevel)?.color }} />
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>HS đạt {COMPETENCY_LEVELS.find(l => l.level === selected.targetLevel)?.label}:</strong>
                {' '}{getRubricDescriptor(p.id, selected.targetLevel)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  if (mode === 'inline') {
    return (
      <div>
        {renderGrid()}
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(168,139,250,0.08)', border: '1px solid rgba(168,139,250,0.25)',
          fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Sparkles size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <span>
            <strong>{value.length}</strong> năng lực đã chọn. Mỗi năng lực kèm cấp độ mục tiêu (L1→L4)
            sẽ làm cơ sở cho rubric chấm điểm từng module và đánh giá tổng hợp HS cuối lộ trình.
          </span>
        </div>
      </div>
    )
  }

  // Compact mode (cho module list) — show pill summary + button mở dialog
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {value.length === 0 ? (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
            Chưa gán năng lực nào
          </span>
        ) : value.map(v => {
          const p = getPillar(v.pillarId)
          const lv = COMPETENCY_LEVELS.find(l => l.level === v.targetLevel)
          if (!p || !lv) return null
          return (
            <span
              key={v.pillarId}
              title={`${p.name} · ${lv.label}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 999,
                background: `${p.color}20`, border: `1px solid ${p.color}50`,
                fontSize: 10.5, fontWeight: 700, color: p.color,
              }}
            >
              <span style={{ fontSize: 11 }}>{p.emoji}</span>
              <span>{p.shortName}</span>
              <span style={{
                background: lv.color, color: '#0a0612', borderRadius: 4, padding: '0 4px',
                fontSize: 9, fontWeight: 800,
              }}>L{v.targetLevel}</span>
            </span>
          )
        })}
      </div>

      <button
        onClick={() => setDialogOpen(true)}
        type="button"
        style={{
          fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
          background: 'rgba(168,139,250,0.12)', border: '1px solid rgba(168,139,250,0.3)',
          color: '#a78bfa', fontWeight: 700,
        }}
      >
        {value.length > 0 ? 'Sửa năng lực' : '+ Gán năng lực'}
      </button>

      {dialogOpen && (
        <div
          onClick={() => setDialogOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0c0816', border: '1px solid rgba(168,139,250,0.3)',
              borderRadius: 16, padding: 20, maxWidth: 640, width: '100%',
              maxHeight: '85vh', overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>
                🎯 Gán năng lực cho module
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            {renderGrid()}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDialogOpen(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(168,139,250,0.4)',
                  background: 'rgba(168,139,250,0.15)', color: '#a78bfa', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Check size={14} /> Xong ({value.length} năng lực)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
