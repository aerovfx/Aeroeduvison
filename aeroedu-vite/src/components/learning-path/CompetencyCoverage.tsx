/**
 * CompetencyCoverage — Visualization tổng quan năng lực được phủ trong learning path.
 *
 * Mỗi pillar hiện 1 row với:
 *  - Bar 4 cấp (L1 → L4), tô màu khi có module nhắm đến cấp đó
 *  - Số module touch cấp này
 *  - Max level + cảnh báo gap nếu nhảy cấp (VD chỉ L1 + L4 mà thiếu L2/L3)
 */
import {
  COMPETENCY_LEVELS,
  computePathCoverage,
  type CompetencyLevel,
} from '@/lib/competency-framework'
import type { CompetencyTarget } from './CompetencyPicker'

interface ModuleLike {
  competencies?: CompetencyTarget[]
}

interface Props {
  modules: ModuleLike[]
  pathCompetencies?: CompetencyTarget[]  // path-level targets (Step 2)
}

export default function CompetencyCoverage({ modules, pathCompetencies = [] }: Props) {
  const coverage = computePathCoverage(modules)

  // Tính union path target + module-level coverage
  const pathTargetMap = new Map<string, Set<CompetencyLevel>>()
  for (const c of pathCompetencies) {
    if (!pathTargetMap.has(c.pillarId)) pathTargetMap.set(c.pillarId, new Set())
    pathTargetMap.get(c.pillarId)!.add(c.targetLevel)
  }

  if (coverage.length === 0 && pathCompetencies.length === 0) {
    return (
      <div style={{
        padding: 20, borderRadius: 12, textAlign: 'center',
        background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.15)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Chưa có năng lực nào được gán cho path hoặc module.<br />
          Quay lại Step 2 để chọn năng lực mục tiêu.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>
          📊 Độ phủ năng lực ({coverage.length}/8 trụ cột)
        </h3>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          {modules.reduce((s, m) => s + (m.competencies?.length || 0), 0)} criterion tổng
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {coverage.map(cov => {
          const pillar = cov.pillar
          const pathLevels = pathTargetMap.get(pillar.id) || new Set()
          return (
            <div key={pillar.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Pillar label */}
              <div style={{ flexShrink: 0, width: 140, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{pillar.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: pillar.color, lineHeight: 1.2 }}>
                    {pillar.shortName}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
                    {pillar.code}
                  </div>
                </div>
              </div>

              {/* Level bar — 4 segments */}
              <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                {COMPETENCY_LEVELS.map(lv => {
                  const modulesAtLevel = cov.targetLevels.includes(lv.level)
                  const pathAtLevel = pathLevels.has(lv.level)
                  // Filled = có module nhắm đến hoặc path nhắm đến cấp này
                  const filled = modulesAtLevel || pathAtLevel
                  return (
                    <div
                      key={lv.level}
                      title={`${lv.label} (L${lv.level})${
                        modulesAtLevel ? ` — ${modules.filter(m => m.competencies?.some(c => c.pillarId === pillar.id && c.targetLevel === lv.level)).length} module` : ''
                      }${pathAtLevel ? ' · target path' : ''}`}
                      style={{
                        flex: 1, height: 26, borderRadius: 5,
                        background: filled ? `${lv.color}40` : 'rgba(255,255,255,0.04)',
                        border: filled ? `1.5px solid ${lv.color}` : '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800,
                        color: filled ? lv.color : 'rgba(255,255,255,0.25)',
                        position: 'relative',
                      }}
                    >
                      L{lv.level}
                      {pathAtLevel && (
                        <span style={{
                          position: 'absolute', top: -5, right: -5,
                          width: 9, height: 9, borderRadius: '50%',
                          background: '#a78bfa', border: '2px solid #0a0612',
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Count badge */}
              <div style={{
                flexShrink: 0, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', minWidth: 56, textAlign: 'center',
              }}>
                {cov.moduleCount} mod
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        fontSize: 10.5, color: 'rgba(255,255,255,0.55)',
      }}>
        <span>
          <span style={{
            display: 'inline-block', width: 9, height: 9, borderRadius: 2, marginRight: 4,
            background: 'rgba(168,139,250,0.5)', border: '1px solid #a78bfa', verticalAlign: 'middle',
          }} />
          Có module nhắm đến
        </span>
        <span>
          <span style={{
            display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 4,
            background: '#a78bfa', verticalAlign: 'middle',
          }} />
          Path-level target
        </span>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
          {COMPETENCY_LEVELS.map(lv => (
            <span key={lv.level} style={{ color: lv.color, marginRight: 8, fontWeight: 700 }}>
              L{lv.level}={lv.label}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}
