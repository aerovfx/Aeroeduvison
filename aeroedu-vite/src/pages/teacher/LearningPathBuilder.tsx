import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Brain, BookOpen, FolderKanban, Save,
  Settings, Zap, Clock, ChevronRight, Trash2,
  GripVertical, TrendingUp,
} from 'lucide-react'

/* ── Dark palette ── */
const D = {
  bg:     '#0d0e17',
  card:   '#10111e',
  card2:  '#161728',
  border: '#1e2033',
  border2:'#2a2b3d',
  text:   '#f1f5f9',
  muted:  '#94a3b8',
  purple: '#7c3aed',
} as const

/* ── Types ── */
type Difficulty = 'easy' | 'medium' | 'hard'
type ModuleType = 'lesson' | 'quiz' | 'project' | 'assignment'

interface Module {
  id: string
  type: ModuleType
  title: string
  subject: string
  difficulty: Difficulty
  duration: number
  xpTarget: number
  prerequisites?: string[]
}

/* ── Helpers ── */
const MODULE_ICONS: Record<ModuleType, string> = {
  lesson: '📖', quiz: '📝', project: '🎯', assignment: '📋',
}

const DIFF_COLORS: Record<Difficulty, { bg: string; border: string; text: string }> = {
  easy:   { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  text: '#4ade80' },
  medium: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#facc15' },
  hard:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171' },
}

function DiffBadge({ diff }: { diff: Difficulty }) {
  const c = DIFF_COLORS[diff]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 11, fontWeight: 700, color: c.text,
      textTransform: 'capitalize',
    }}>{diff}</span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  color: D.muted, fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10,
  color: D.text, fontSize: 14, padding: '9px 14px',
  width: '100%', boxSizing: 'border-box', outline: 'none',
}

/* ── Static Data ── */
const AVAILABLE_MODULES: Module[] = [
  { id: 'math-derivatives-1', type: 'lesson', title: 'Giới thiệu Đạo hàm',    subject: 'mathematics', difficulty: 'easy',   duration: 30, xpTarget: 80 },
  { id: 'math-derivatives-2', type: 'lesson', title: 'Quy tắc tính đạo hàm', subject: 'mathematics', difficulty: 'medium', duration: 45, xpTarget: 120 },
  { id: 'math-quiz-1',        type: 'quiz',   title: 'Kiểm tra Đạo hàm',     subject: 'mathematics', difficulty: 'medium', duration: 20, xpTarget: 100 },
  { id: 'math-integrals-1',   type: 'lesson', title: 'Tích phân cơ bản',      subject: 'mathematics', difficulty: 'hard',   duration: 60, xpTarget: 150, prerequisites: ['math-derivatives-2'] },
  { id: 'math-project-1',     type: 'project',title: 'Dự án: Ứng dụng Giải tích', subject: 'mathematics', difficulty: 'hard', duration: 90, xpTarget: 200 },
]

const AI_SUGGESTIONS = [
  { module: 'Bài tập Logic nâng cao', reason: 'Học sinh mạnh về logic (90%), nên thử thách hơn', priority: 'high' as const },
  { module: 'Drill: Tính toán nhanh', reason: '2 học sinh yếu về tính toán, cần luyện tập',       priority: 'medium' as const },
  { module: 'Video: Hình học không gian', reason: 'Lớp có xu hướng học tốt qua visual content',   priority: 'high' as const },
]

/* ── Main Component ── */
export default function LearningPathBuilder() {
  const navigate = useNavigate()

  const [pathName, setPathName] = useState('')
  const [pathDescription, setPathDescription] = useState('')
  const [selectedModules, setSelectedModules] = useState<Module[]>([])
  const [xpPerDay, setXpPerDay] = useState('150')
  const [diffMode, setDiffMode] = useState('auto')
  const [autoAdjust, setAutoAdjust] = useState(true)

  const addModule = (module: Module) => setSelectedModules(prev => [...prev, module])
  const removeModule = (moduleId: string) => setSelectedModules(prev => prev.filter(m => m.id !== moduleId))

  const moveModule = (index: number, dir: 'up' | 'down') => {
    const next = [...selectedModules]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target >= 0 && target < next.length) {
      ;[next[index], next[target]] = [next[target], next[index]]
      setSelectedModules(next)
    }
  }

  const totalDuration = selectedModules.reduce((s, m) => s + m.duration, 0)
  const totalXP       = selectedModules.reduce((s, m) => s + m.xpTarget, 0)
  const estimatedDays = Math.max(1, Math.ceil(totalDuration / 60))

  const canSave = selectedModules.length > 0 && pathName.trim().length > 0

  const savePath = () => {
    const pathData = {
      id: `path-${Date.now()}`,
      name: pathName,
      description: pathDescription,
      modules: selectedModules,
      createdAt: new Date().toISOString(),
    }
    const saved = JSON.parse(localStorage.getItem('teacher-learning-paths') || '[]')
    saved.push(pathData)
    localStorage.setItem('teacher-learning-paths', JSON.stringify(saved))
    navigate('/teacher/dashboard')
  }

  return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header Card ── */}
        <Card style={{ position: 'relative', overflow: 'hidden' }}>
          {/* gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
            background: 'linear-gradient(120deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.05) 100%)',
          }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                <h1 style={{ color: D.text, fontSize: 24, fontWeight: 900, margin: '0 0 4px' }}>
                  🎓 Learning Path Builder
                </h1>
                <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>Tạo lộ trình học tập cá nhân hóa với AI</p>
              </div>
            </div>

            <button
              onClick={savePath}
              disabled={!canSave}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: canSave ? D.purple : '#2a2b3d',
                border: 'none', borderRadius: 11, cursor: canSave ? 'pointer' : 'not-allowed',
                color: canSave ? '#fff' : D.muted, fontWeight: 700, fontSize: 14,
                padding: '10px 22px', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <Save size={16} /> Lưu Path
            </button>
          </div>

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Tên Learning Path</label>
              <input
                style={inputStyle}
                placeholder="Ví dụ: Giải tích cơ bản – 2 tuần"
                value={pathName}
                onChange={e => setPathName(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Mô tả</label>
              <input
                style={inputStyle}
                placeholder="Mô tả ngắn gọn về lộ trình"
                value={pathDescription}
                onChange={e => setPathDescription(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ── 3-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 260px', gap: 18 }}>

          {/* ── Left: Available Modules ── */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <h3 style={{ color: D.text, fontSize: 15, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <BookOpen size={16} style={{ color: '#a78bfa' }} /> Modules có sẵn
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {AVAILABLE_MODULES.map(module => (
                <div
                  key={module.id}
                  onClick={() => addModule(module)}
                  style={{
                    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10,
                    padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = D.border2)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{MODULE_ICONS[module.type]}</span>
                    <DiffBadge diff={module.difficulty} />
                  </div>
                  <p style={{ color: D.text, fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>{module.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} /> {module.duration}m
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Zap size={10} /> {module.xpTarget} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              style={{
                marginTop: 12, width: '100%', background: 'transparent',
                border: `1px solid ${D.border2}`, borderRadius: 10,
                color: D.muted, cursor: 'pointer', padding: '8px 0',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = D.border2; e.currentTarget.style.color = D.muted }}
            >
              <Plus size={14} /> Tạo Module Mới
            </button>
          </Card>

          {/* ── Center: Path Canvas ── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ color: D.text, fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                <FolderKanban size={16} style={{ color: '#a78bfa' }} /> Lộ trình học tập
              </h3>
              {selectedModules.length > 0 && (
                <button
                  onClick={() => setSelectedModules([])}
                  style={{
                    background: 'transparent', border: '1px solid transparent', borderRadius: 8,
                    color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 10px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {selectedModules.length === 0 ? (
              <div style={{
                border: `2px dashed ${D.border2}`, borderRadius: 12, padding: '48px 24px',
                textAlign: 'center', background: 'rgba(255,255,255,0.01)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(124,58,237,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                }}>
                  <Brain size={26} style={{ color: '#a78bfa' }} />
                </div>
                <p style={{ color: D.muted, fontSize: 14, fontWeight: 500, margin: 0 }}>
                  Click vào modules bên trái để thêm vào lộ trình
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {selectedModules.map((module, index) => (
                  <div key={`${module.id}-${index}`}>
                    {/* Module card */}
                    <div style={{
                      background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {/* Order controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <button
                            onClick={() => moveModule(index, 'up')}
                            disabled={index === 0}
                            style={{
                              background: 'transparent', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer',
                              color: D.muted, padding: 2, opacity: index === 0 ? 0.3 : 1,
                            }}
                          >
                            <GripVertical size={14} />
                          </button>
                          <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 900 }}>#{index + 1}</span>
                          <button
                            onClick={() => moveModule(index, 'down')}
                            disabled={index === selectedModules.length - 1}
                            style={{
                              background: 'transparent', border: 'none',
                              cursor: index === selectedModules.length - 1 ? 'not-allowed' : 'pointer',
                              color: D.muted, padding: 2,
                              opacity: index === selectedModules.length - 1 ? 0.3 : 1,
                            }}
                          >
                            <GripVertical size={14} />
                          </button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                            paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${D.border}`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 22 }}>{MODULE_ICONS[module.type]}</span>
                              <div>
                                <p style={{ color: D.text, fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{module.title}</p>
                                <p style={{ color: D.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>{module.type}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeModule(module.id)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#f87171', padding: 4, borderRadius: 7,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Stats row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                              <p style={{ color: D.muted, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px' }}>Thời gian</p>
                              <p style={{ color: D.text, fontWeight: 700, fontSize: 13, margin: 0 }}>{module.duration}p</p>
                            </div>
                            <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                              <p style={{ color: D.muted, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px' }}>Mục tiêu XP</p>
                              <p style={{ color: '#a78bfa', fontWeight: 900, fontSize: 13, margin: 0 }}>{module.xpTarget}</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <p style={{ color: D.muted, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>Độ khó</p>
                              <DiffBadge diff={module.difficulty} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connector arrow */}
                    {index < selectedModules.length - 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
                        <ChevronRight size={20} style={{ color: '#a78bfa', transform: 'rotate(90deg)' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Right Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Summary */}
            <Card>
              <h3 style={{ color: D.text, fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <TrendingUp size={15} style={{ color: '#4ade80' }} /> Tóm tắt
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Tổng số Modules', value: `${selectedModules.length}`, color: D.text, bg: 'rgba(255,255,255,0.03)', border: 'transparent' },
                  { label: 'Thời lượng dự kiến', value: `${totalDuration} phút`, color: D.text, bg: 'rgba(255,255,255,0.03)', border: 'transparent' },
                  { label: 'Tổng cung cấp XP', value: `${totalXP}`, color: '#a78bfa', bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.2)' },
                  { label: 'Ước tính (Ngày)', value: `${estimatedDays} ngày`, color: '#facc15', bg: 'rgba(234,179,8,0.07)', border: 'rgba(234,179,8,0.2)' },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: row.bg, border: `1px solid ${row.border}`,
                    borderRadius: 8, padding: '7px 10px', fontSize: 13,
                  }}>
                    <span style={{ color: D.muted }}>{row.label}</span>
                    <span style={{ color: row.color, fontWeight: 800 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Suggestions */}
            <Card style={{ border: `1px solid rgba(124,58,237,0.25)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(124,58,237,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Brain size={15} style={{ color: '#a78bfa' }} />
                </div>
                <h3 style={{ color: D.text, fontWeight: 700, fontSize: 14, margin: 0 }}>Gợi ý AI</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {AI_SUGGESTIONS.map((s, idx) => {
                  const badgeColor = s.priority === 'high'
                    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171' }
                    : { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#facc15' }
                  return (
                    <div key={idx} style={{
                      background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 10,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                        <p style={{ color: D.text, fontSize: 12, fontWeight: 700, margin: 0, maxWidth: '60%' }}>{s.module}</p>
                        <span style={{
                          display: 'inline-flex', background: badgeColor.bg,
                          border: `1px solid ${badgeColor.border}`, borderRadius: 5,
                          padding: '2px 7px', fontSize: 10, fontWeight: 700, color: badgeColor.text,
                          textTransform: 'capitalize', flexShrink: 0,
                        }}>{s.priority}</span>
                      </div>
                      <p style={{ color: D.muted, fontSize: 10, margin: '0 0 8px' }}>{s.reason}</p>
                      <button
                        style={{
                          width: '100%', background: 'transparent', border: `1px solid ${D.border2}`,
                          borderRadius: 7, color: D.muted, cursor: 'pointer', padding: '5px 0',
                          fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = D.border2; e.currentTarget.style.color = D.muted }}
                      >
                        Thêm vào Lộ trình
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Quick Settings */}
            <Card>
              <h3 style={{ color: D.text, fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Settings size={14} style={{ color: D.muted }} /> Cài đặt
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Mục tiêu XP / Ngày</label>
                  <input
                    type="number"
                    value={xpPerDay}
                    onChange={e => setXpPerDay(e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Độ khó linh hoạt</label>
                  <select
                    value={diffMode}
                    onChange={e => setDiffMode(e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="auto">Tự động (Theo AI)</option>
                    <option value="easy">Cố định - Dễ</option>
                    <option value="medium">Cố định - Vừa</option>
                    <option value="hard">Cố định - Khó</option>
                  </select>
                </div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  borderTop: `1px solid ${D.border}`, paddingTop: 12,
                }}>
                  <input
                    type="checkbox"
                    checked={autoAdjust}
                    onChange={e => setAutoAdjust(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: D.purple, cursor: 'pointer' }}
                  />
                  <span style={{ color: D.text, fontSize: 12, fontWeight: 500 }}>
                    Tự động điều chỉnh theo tiến trình
                  </span>
                </label>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
