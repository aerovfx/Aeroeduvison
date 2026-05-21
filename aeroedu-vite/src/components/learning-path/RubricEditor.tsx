/**
 * RubricEditor — Soạn rubric đánh giá module dựa theo competency targets.
 *
 * Mỗi module có { evaluation: { passingScore, weight, evidenceType, criteria[] } }.
 * Mỗi criterion mapping với 1 competency target:
 *   { pillarId, targetLevel, descriptor, weight (0-100) }
 *
 * Tổng weight của criteria = 100. UI auto-distribute đều và cho phép GV chỉnh tay.
 */
import { Trash2, Plus, Scale, Sparkles, Target } from 'lucide-react'
import {
  COMPETENCY_LEVELS,
  getPillar,
  getRubricDescriptor,
  type CompetencyLevel,
} from '@/lib/competency-framework'
import type { CompetencyTarget } from './CompetencyPicker'

export interface RubricCriterion {
  id: string
  pillarId: string
  targetLevel: CompetencyLevel
  descriptor: string         // câu mô tả "đạt khi..."
  weight: number             // 0-100 tỷ trọng trong tổng điểm module
}

export interface ModuleEvaluation {
  passingScore: number        // % điểm đạt (0-100)
  weight: number              // tỷ trọng module trong path (0-100, mặc định 100/N)
  evidenceType: 'auto' | 'manual' | 'rubric' | 'mixed'
  criteria: RubricCriterion[]
}

interface Props {
  evaluation: ModuleEvaluation
  competencies: CompetencyTarget[]   // năng lực đã gán cho module này
  onChange: (next: ModuleEvaluation) => void
}

const EVIDENCE_OPTIONS: { value: ModuleEvaluation['evidenceType']; label: string; desc: string; icon: string }[] = [
  { value: 'auto',   label: 'Tự động',         desc: 'Hệ thống chấm (quiz, lab challenge)',          icon: '🤖' },
  { value: 'manual', label: 'GV chấm',         desc: 'GV xem và cho điểm thủ công (bài viết, dự án)', icon: '👨‍🏫' },
  { value: 'rubric', label: 'Rubric năng lực', desc: 'Chấm theo từng tiêu chí năng lực bên dưới',     icon: '📊' },
  { value: 'mixed',  label: 'Kết hợp',         desc: 'Vừa auto (quiz) vừa rubric (sản phẩm)',         icon: '⚖️' },
]

const newCriterionId = () => Math.random().toString(36).slice(2, 9)

export default function RubricEditor({ evaluation, competencies, onChange }: Props) {
  // Auto-sync criteria with competencies — thêm mới khi chưa có, xoá khi mất
  const syncedCriteria = (() => {
    const map = new Map(evaluation.criteria.map(c => [`${c.pillarId}:${c.targetLevel}`, c]))
    return competencies.map(comp => {
      const key = `${comp.pillarId}:${comp.targetLevel}`
      const existing = map.get(key)
      if (existing) return existing
      return {
        id: newCriterionId(),
        pillarId: comp.pillarId,
        targetLevel: comp.targetLevel,
        descriptor: getRubricDescriptor(comp.pillarId, comp.targetLevel),
        weight: 0,  // tính lại bên dưới
      } as RubricCriterion
    })
  })()

  // Auto-distribute weight đều khi competencies thay đổi (chỉ áp dụng nếu chưa custom)
  const sumWeight = syncedCriteria.reduce((s, c) => s + c.weight, 0)
  const finalCriteria = syncedCriteria.length > 0 && sumWeight === 0
    ? syncedCriteria.map(c => ({ ...c, weight: Math.round(100 / syncedCriteria.length) }))
    : syncedCriteria

  // Push synced criteria back if differ
  const syncedJson = JSON.stringify(finalCriteria)
  const evalJson = JSON.stringify(evaluation.criteria)
  if (syncedJson !== evalJson) {
    // Defer to next tick để tránh setState trong render
    setTimeout(() => onChange({ ...evaluation, criteria: finalCriteria }), 0)
  }

  const updateCriterion = (id: string, patch: Partial<RubricCriterion>) => {
    onChange({
      ...evaluation,
      criteria: evaluation.criteria.map(c => c.id === id ? { ...c, ...patch } : c),
    })
  }

  const removeCriterion = (id: string) => {
    onChange({
      ...evaluation,
      criteria: evaluation.criteria.filter(c => c.id !== id),
    })
  }

  const addManualCriterion = () => {
    // GV thêm tiêu chí ngoài competency framework (VD: "Thuyết trình rõ ràng")
    onChange({
      ...evaluation,
      criteria: [...evaluation.criteria, {
        id: newCriterionId(),
        pillarId: '__manual__',
        targetLevel: 2,
        descriptor: 'Tiêu chí tự đặt',
        weight: 10,
      }],
    })
  }

  const totalWeight = evaluation.criteria.reduce((s, c) => s + (c.weight || 0), 0)
  const weightValid = totalWeight === 100 || evaluation.criteria.length === 0
  const showRubricSection = evaluation.evidenceType === 'rubric' || evaluation.evidenceType === 'mixed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── Quick settings ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
            Điểm đạt (%)
          </label>
          <input
            type="number" min={0} max={100}
            value={evaluation.passingScore}
            onChange={e => onChange({ ...evaluation, passingScore: Number(e.target.value) || 0 })}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 14, outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
            Trọng số trong path (%)
          </label>
          <input
            type="number" min={0} max={100}
            value={evaluation.weight}
            onChange={e => onChange({ ...evaluation, weight: Number(e.target.value) || 0 })}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 14, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ─── Evidence type picker ─── */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
          Hình thức đánh giá
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {EVIDENCE_OPTIONS.map(opt => {
            const active = evaluation.evidenceType === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ ...evaluation, evidenceType: opt.value })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  background: active ? 'rgba(168,139,250,0.15)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? '#a78bfa' : 'rgba(255,255,255,0.08)'}`,
                  color: '#fff', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 20 }}>{opt.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? '#a78bfa' : '#fff' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>{opt.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Rubric criteria (chỉ show khi evidenceType có rubric) ─── */}
      {showRubricSection && (
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'rgba(168,139,250,0.05)',
          border: '1px solid rgba(168,139,250,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={16} style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
                Tiêu chí rubric ({evaluation.criteria.length})
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: weightValid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: weightValid ? '#4ade80' : '#f87171',
              border: `1px solid ${weightValid ? '#22c55e' : '#ef4444'}50`,
            }}>
              Tổng: {totalWeight}%
            </span>
          </div>

          {evaluation.criteria.length === 0 ? (
            <div style={{
              padding: '16px 12px', textAlign: 'center', fontSize: 12,
              color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
            }}>
              Chưa có tiêu chí. Hãy gán năng lực ở phần trên để tự sinh tiêu chí từ rubric chuẩn,
              hoặc bấm "+ Thêm tiêu chí tự đặt" bên dưới.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {evaluation.criteria.map(c => {
                const pillar = c.pillarId === '__manual__' ? null : getPillar(c.pillarId)
                const lv = COMPETENCY_LEVELS.find(l => l.level === c.targetLevel)
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: 10, borderRadius: 8,
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {/* Pillar badge */}
                    <div style={{ flexShrink: 0, minWidth: 100 }}>
                      {pillar ? (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 999,
                          background: `${pillar.color}25`, border: `1px solid ${pillar.color}55`,
                        }}>
                          <span style={{ fontSize: 12 }}>{pillar.emoji}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: pillar.color }}>
                            {pillar.shortName}
                          </span>
                          {lv && (
                            <span style={{
                              background: lv.color, color: '#0a0612', borderRadius: 4,
                              padding: '0 4px', fontSize: 9, fontWeight: 800,
                            }}>L{c.targetLevel}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 999,
                          background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.4)',
                          fontSize: 10.5, fontWeight: 700, color: '#60a5fa',
                        }}>
                          ✏️ Tự đặt
                        </span>
                      )}
                    </div>

                    {/* Descriptor */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        value={c.descriptor}
                        onChange={e => updateCriterion(c.id, { descriptor: e.target.value })}
                        placeholder="HS đạt khi..."
                        style={{
                          width: '100%', padding: '4px 8px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                          color: '#fff', fontSize: 12, outline: 'none',
                        }}
                      />
                    </div>

                    {/* Weight input */}
                    <div style={{ flexShrink: 0, width: 80 }}>
                      <input
                        type="number" min={0} max={100}
                        value={c.weight}
                        onChange={e => updateCriterion(c.id, { weight: Number(e.target.value) || 0 })}
                        style={{
                          width: '100%', padding: '4px 6px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                          color: '#fff', fontSize: 12, outline: 'none', textAlign: 'right',
                        }}
                      />
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: 2 }}>
                        % trọng số
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeCriterion(c.id)}
                      style={{
                        flexShrink: 0, padding: 4, borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', lineHeight: 0,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={addManualCriterion}
            style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)',
              color: '#60a5fa', fontSize: 11.5, fontWeight: 700,
            }}
          >
            <Plus size={12} /> Thêm tiêu chí tự đặt
          </button>

          {!weightValid && evaluation.criteria.length > 0 && (
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 11, color: '#f87171',
            }}>
              ⚠ Tổng trọng số phải = 100%. Hiện tại: {totalWeight}%
            </div>
          )}
        </div>
      )}

      {/* ─── Tip ─── */}
      <div style={{
        padding: '8px 12px', borderRadius: 8,
        background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)',
        fontSize: 11, color: 'rgba(255,255,255,0.7)',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <Target size={14} style={{ color: '#22d3ee', flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Gợi ý:</strong>
          {evaluation.evidenceType === 'auto'   && ' Dùng cho quiz/lab challenge — hệ thống chấm điểm và đối chiếu passingScore tự động.'}
          {evaluation.evidenceType === 'manual' && ' GV xem bài và cho điểm. Phù hợp với bài luận, dự án sáng tạo.'}
          {evaluation.evidenceType === 'rubric' && ' Chấm theo từng năng lực mục tiêu — minh bạch, công bằng. Tổng trọng số tiêu chí phải = 100%.'}
          {evaluation.evidenceType === 'mixed'  && ' Vừa auto (đáp án đúng/sai) vừa rubric (lập luận, trình bày). Phù hợp với bài kiểm tra tổng hợp.'}
        </div>
      </div>
    </div>
  )
}

export function defaultEvaluation(): ModuleEvaluation {
  return {
    passingScore: 60,
    weight: 10,
    evidenceType: 'rubric',
    criteria: [],
  }
}
