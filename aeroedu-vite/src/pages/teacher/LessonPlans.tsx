/**
 * LessonPlans (List page) — Danh sách giáo án của GV
 *
 * Hiển thị: title, subject/grade, wordCount, last updated, GCS backup status
 * Actions: Tạo mới, Mở (chỉnh sửa), Xoá, Lưu vào Drive (GCS)
 */
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Search, Trash2, Cloud, CloudOff, Edit3, Loader2,
  Calendar, BookOpen, Hash, X, Sparkles,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { lessonPlanService, type LessonPlanSummary } from '@/services/lessonPlan.service'
import { LESSON_PLAN_TEMPLATES, type LessonPlanTemplate } from '@/lib/lesson-plan-templates'

export default function LessonPlans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<LessonPlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [tplPickerOpen, setTplPickerOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await lessonPlanService.list(false)
      setPlans(r.plans)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Không tải được danh sách giáo án')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (tpl: LessonPlanTemplate = LESSON_PLAN_TEMPLATES[0]) => {
    setCreating(true)
    setTplPickerOpen(false)
    try {
      const plan = await lessonPlanService.create({
        title: `${tpl.defaultTitle} — ${new Date().toLocaleDateString('vi-VN')}`,
        content: tpl.content,
      })
      toast.success(`Đã tạo giáo án từ mẫu "${tpl.name}"`)
      navigate(`/teacher/lesson-plans/${plan.id}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi tạo giáo án')
    } finally { setCreating(false) }
  }

  const handleDelete = async (plan: LessonPlanSummary) => {
    if (!confirm(`Xoá vĩnh viễn giáo án "${plan.title}"?`)) return
    try {
      await lessonPlanService.remove(plan.id)
      toast.success('Đã xoá')
      setPlans(prev => prev.filter(p => p.id !== plan.id))
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi xoá')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return plans
    return plans.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.contentPreview || '').toLowerCase().includes(q) ||
      (p.subject || '').toLowerCase().includes(q) ||
      (p.grade || '').toLowerCase().includes(q)
    )
  }, [plans, search])

  return (
    <div style={{ minHeight: '100vh', background: '#0d0e17', color: '#f1f5f9' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📚 Giáo án của tôi</h1>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
                Soạn giáo án WYSIWYG (Google Docs-like) — auto-save vào DB, optional snapshot lên Drive
              </p>
            </div>
          </div>
          <button
            onClick={() => setTplPickerOpen(true)}
            disabled={creating}
            style={{
              padding: '10px 18px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            }}
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Tạo giáo án mới
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: '#94a3b8',
          }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm giáo án theo tiêu đề, nội dung, môn, khối..."
            style={{
              width: '100%', padding: '10px 14px 10px 38px', boxSizing: 'border-box',
              background: '#10111e', border: '1px solid #1e2033', borderRadius: 10,
              color: '#f1f5f9', fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#7c3aed', margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, background: '#10111e',
            border: '1px solid #1e2033', borderRadius: 14,
          }}>
            <FileText size={40} style={{ color: '#475569', margin: '0 auto 12px' }} />
            <p style={{ color: '#cbd5e1', fontWeight: 600, margin: '0 0 6px' }}>
              {search ? 'Không tìm thấy giáo án nào' : 'Chưa có giáo án nào'}
            </p>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
              {search ? 'Thử từ khoá khác' : 'Bấm "Tạo giáo án mới" để bắt đầu soạn bài'}
            </p>
            {!search && (
              <button onClick={() => setTplPickerOpen(true)} disabled={creating}
                style={{
                  padding: '10px 20px', background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                <Plus size={14} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                Chọn mẫu giáo án
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map(plan => (
              <div key={plan.id} style={{
                background: '#10111e', border: '1px solid #1e2033', borderRadius: 12,
                padding: 16, display: 'flex', gap: 14, alignItems: 'center',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2033'}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'rgba(124,58,237,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={20} style={{ color: '#a78bfa' }} />
                </div>
                <button onClick={() => navigate(`/teacher/lesson-plans/${plan.id}`)}
                  style={{
                    flex: 1, minWidth: 0, textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  }}>
                  <h3 style={{
                    fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {plan.title}
                  </h3>
                  {plan.contentPreview && (
                    <p style={{
                      color: '#94a3b8', fontSize: 12, margin: '0 0 6px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {plan.contentPreview}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
                    {plan.subject && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={10} /> {plan.subject}
                      </span>
                    )}
                    {plan.grade && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Khối {plan.grade}
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Hash size={10} /> {plan.wordCount} từ
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={10} />
                      {new Date(plan.lastSavedAt).toLocaleString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {plan.gcsBackupUrl ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
                        <Cloud size={10} /> Đã sao lưu Drive
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
                        <CloudOff size={10} /> Chưa sao lưu
                      </span>
                    )}
                  </div>
                </button>
                <button onClick={() => navigate(`/teacher/lesson-plans/${plan.id}`)}
                  title="Mở để chỉnh sửa"
                  style={{
                    padding: '7px 10px', background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8,
                    cursor: 'pointer', color: '#a78bfa',
                  }}>
                  <Edit3 size={13} />
                </button>
                <button onClick={() => handleDelete(plan)}
                  title="Xoá"
                  style={{
                    padding: '7px 10px', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
                    cursor: 'pointer', color: '#f87171',
                  }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Template Picker Modal ── */}
      {tplPickerOpen && (
        <div onClick={() => setTplPickerOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#10111e', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                  📋 Chọn mẫu giáo án
                </h2>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: '4px 0 0' }}>
                  Click 1 mẫu để tạo giáo án có sẵn cấu trúc, GV chỉ điền nội dung
                </p>
              </div>
              <button onClick={() => setTplPickerOpen(false)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6,
              }}><X size={20} /></button>
            </div>

            {/* List of templates */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LESSON_PLAN_TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => handleCreate(tpl)} disabled={creating}
                    style={{
                      width: '100%', textAlign: 'left', cursor: creating ? 'not-allowed' : 'pointer',
                      background: '#161728', border: '1px solid #2a2b3d', borderRadius: 12,
                      padding: 16, transition: 'all 0.15s',
                      opacity: creating ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!creating) {
                      e.currentTarget.style.borderColor = '#7c3aed'
                      e.currentTarget.style.background = 'rgba(124,58,237,0.08)'
                    }}}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#2a2b3d'
                      e.currentTarget.style.background = '#161728'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: tpl.id === 'blank' ? 'rgba(148,163,184,0.15)' : 'rgba(124,58,237,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0,
                      }}>
                        {tpl.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            {tpl.name}
                          </h3>
                          {tpl.id.startsWith('cv2345') && (
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4,
                              background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80',
                              fontWeight: 700, letterSpacing: '0.05em',
                            }}>BGD&ĐT</span>
                          )}
                          {tpl.id === 'generic-5hoatdong' && (
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4,
                              background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa',
                              fontWeight: 700, letterSpacing: '0.05em',
                            }}>MỌI MÔN</span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                          {tpl.description}
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, color: '#7c3aed', display: 'flex', alignItems: 'center' }}>
                        <Sparkles size={14} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: 11, color: '#64748b',
            }}>
              💡 Mẫu CV2345 theo Công văn 2345/BGDĐT-GDTH (2021) — chuẩn của Bộ GD&ĐT cho khung kế hoạch bài dạy.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
