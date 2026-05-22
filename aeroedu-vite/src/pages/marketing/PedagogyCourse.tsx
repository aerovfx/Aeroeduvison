/**
 * PedagogyCourse — Khoá học miễn phí Phương pháp Sư phạm
 * /free-courses/pedagogy
 *
 * 8 phương pháp dạy học hiện đại cho GV Việt Nam, có call-to-action
 * thực hành ngay sau mỗi bài.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Clock, Award, ChevronRight, ChevronDown, Target,
  Sparkles, ArrowLeft, Layers, Users,
} from 'lucide-react'
import { PEDAGOGY_COURSE, type PedagogyMethod } from '@/data/pedagogyCourse'

const C = {
  bg:      '#0a0612',
  card:    'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.1)',
  text:    '#fff',
  muted:   '#94a3b8',
  purple:  '#a78bfa',
  cyan:    '#22d3ee',
  emerald: '#34d399',
  amber:   '#fbbf24',
  rose:    '#fb7185',
}

const LEVEL_META: Record<PedagogyMethod['level'], { label: string; color: string }> = {
  beginner:     { label: 'Cơ bản',       color: C.emerald },
  intermediate: { label: 'Trung cấp',    color: C.amber },
  advanced:     { label: 'Nâng cao',     color: C.rose },
}

const AUDIENCE_LABEL: Record<PedagogyMethod['audience'], string> = {
  all:       'Mọi cấp',
  primary:   'Tiểu học',
  secondary: 'THCS',
  high:      'THPT',
}

export default function PedagogyCourse() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([PEDAGOGY_COURSE.modules[0].id]))

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const totalLessons = PEDAGOGY_COURSE.modules.reduce((s, m) => s + m.lessons.length, 0)

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      {/* ── Header ── */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(168,139,250,0.12) 0%, rgba(34,211,238,0.08) 100%)',
        borderBottom: `1px solid ${C.border}`,
        padding: '40px 24px 56px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: C.muted, fontSize: 13, textDecoration: 'none', marginBottom: 18,
          }}>
            <ArrowLeft size={14} /> Quay lại trang chủ
          </Link>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(168,139,250,0.15)', border: '1px solid rgba(168,139,250,0.35)',
            padding: '5px 12px', borderRadius: 999, marginBottom: 14,
          }}>
            <Sparkles size={14} style={{ color: C.purple }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.purple }}>
              MIỄN PHÍ · CẨM NANG GIÁO VIÊN
            </span>
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 900, margin: '0 0 10px',
            letterSpacing: '-0.5px', lineHeight: 1.2,
          }}>
            {PEDAGOGY_COURSE.title}
          </h1>
          <p style={{ color: C.muted, fontSize: 15, margin: 0, maxWidth: 720 }}>
            {PEDAGOGY_COURSE.description}
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 18, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { icon: BookOpen, value: `${PEDAGOGY_COURSE.modules.length}`, label: 'Phương pháp' },
              { icon: Layers,   value: `${totalLessons}`, label: 'Bài học' },
              { icon: Clock,    value: `${PEDAGOGY_COURSE.totalHours}h`, label: 'Tổng thời gian' },
              { icon: Award,    value: 'Free', label: 'Hoàn toàn miễn phí' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 12,
                background: C.card, border: `1px solid ${C.border}`,
              }}>
                <s.icon size={20} style={{ color: C.cyan }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Modules ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>
            📚 8 Phương pháp dạy học hiện đại
          </h2>
          <p style={{ color: C.muted, fontSize: 13.5, margin: 0 }}>
            Đào theo lý thuyết + ví dụ cụ thể cho lớp học Việt Nam +
            checklist thực hành ngay sau mỗi bài.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PEDAGOGY_COURSE.modules.map((m) => {
            const isOpen = expanded.has(m.id)
            const lvl = LEVEL_META[m.level]
            return (
              <article
                key={m.id}
                style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 14, overflow: 'hidden',
                }}
              >
                {/* Module header */}
                <button
                  onClick={() => toggle(m.id)}
                  style={{
                    width: '100%', padding: '16px 20px', border: 'none',
                    background: 'transparent', color: C.text, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'rgba(168,139,250,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0,
                  }}>
                    {m.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: `${lvl.color}25`, color: lvl.color,
                        border: `1px solid ${lvl.color}50`,
                      }}>{lvl.label}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(255,255,255,0.08)', color: C.muted,
                      }}>
                        <Users size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {AUDIENCE_LABEL[m.audience]}
                      </span>
                      <span style={{ fontSize: 10, color: C.muted }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {m.estimatedHours}h · {m.lessons.length} bài
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>
                      {m.index}. {m.title}
                    </h3>
                    <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                      {m.description}
                    </p>
                  </div>
                  {isOpen
                    ? <ChevronDown size={18} style={{ color: C.muted, flexShrink: 0 }} />
                    : <ChevronRight size={18} style={{ color: C.muted, flexShrink: 0 }} />}
                </button>

                {/* Lessons */}
                {isOpen && (
                  <div style={{
                    borderTop: `1px solid ${C.border}`,
                    padding: '8px 16px 16px',
                  }}>
                    {m.lessons.map((l, lIdx) => (
                      <details
                        key={l.id}
                        style={{
                          marginTop: 12, padding: 14, borderRadius: 10,
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <summary style={{
                          cursor: 'pointer', listStyle: 'none', display: 'flex',
                          alignItems: 'center', gap: 10,
                        }}>
                          <span style={{
                            width: 26, height: 26, borderRadius: 6,
                            background: 'rgba(34,211,238,0.15)', color: C.cyan,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800,
                            flexShrink: 0,
                          }}>{lIdx + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{l.title}</div>
                            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                              ⏱ {l.duration} · {l.summary.slice(0, 80)}{l.summary.length > 80 ? '…' : ''}
                            </div>
                          </div>
                          <ChevronDown size={14} style={{ color: C.muted }} />
                        </summary>

                        <div style={{ marginTop: 12, paddingLeft: 36 }}>
                          {/* Summary */}
                          <p style={{
                            fontSize: 13, color: C.text, lineHeight: 1.65,
                            padding: 10, borderRadius: 8,
                            background: 'rgba(168,139,250,0.08)',
                            border: '1px solid rgba(168,139,250,0.2)',
                            margin: '0 0 12px',
                          }}>
                            <strong style={{ color: C.purple }}>Tóm tắt:</strong> {l.summary}
                          </p>

                          {/* Content */}
                          <div style={{
                            fontSize: 13.5, lineHeight: 1.7, color: C.text,
                            whiteSpace: 'pre-wrap', margin: '0 0 16px',
                          }}>
                            {l.content}
                          </div>

                          {/* Key Points */}
                          <div style={{ marginBottom: 12 }}>
                            <h4 style={{
                              fontSize: 11, fontWeight: 800, color: C.amber,
                              textTransform: 'uppercase', letterSpacing: '0.05em',
                              margin: '0 0 6px',
                            }}>
                              🔑 Điểm cốt lõi
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: 20, color: C.text, fontSize: 13 }}>
                              {l.keyPoints.map((p, i) => (
                                <li key={i} style={{ marginBottom: 4 }}>{p}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Call to action */}
                          {l.callToAction && (
                            <div style={{
                              padding: 12, borderRadius: 8,
                              background: 'rgba(52,211,153,0.1)',
                              border: '1px solid rgba(52,211,153,0.3)',
                              fontSize: 13, color: C.emerald,
                              display: 'flex', alignItems: 'flex-start', gap: 8,
                            }}>
                              <Target size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                              <div>
                                <strong>Thực hành ngay:</strong> {l.callToAction.replace(/^🎯 /, '')}
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {/* CTA footer */}
        <div style={{
          marginTop: 40, padding: 24, borderRadius: 16, textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(168,139,250,0.15), rgba(34,211,238,0.1))',
          border: '1px solid rgba(168,139,250,0.3)',
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
            🚀 Sẵn sàng áp dụng vào lớp học?
          </h3>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 16px' }}>
            Đăng nhập inphysic để soạn bài, ra đề + theo dõi hiệu quả của từng phương pháp.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/teacher/courses" style={{
              padding: '10px 22px', borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              Bắt đầu soạn khoá học <ChevronRight size={14} />
            </Link>
            <Link to="/free-courses/llm-mastery" style={{
              padding: '10px 22px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              color: C.text, fontSize: 14, fontWeight: 600,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              Xem khoá AI/LLM cho HS <ChevronRight size={14} />
            </Link>
            <Link to="/kids/aero" style={{
              padding: '10px 22px', borderRadius: 10,
              background: 'linear-gradient(135deg, #fbbf24, #ec4899)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              🐭 AeroKids — Game mẫu giáo <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
