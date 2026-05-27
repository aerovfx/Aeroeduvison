import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Plus, Loader2, Trash2, Pencil, Search, Edit3, Sparkles, Wand2, Download, BookOpenCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { AiExamDialog } from '@/components/latex-editor/AiExamDialog'
import AiTemplateGuideModal from '@/components/latex-editor/AiTemplateGuideModal'
import type { GenerateResult, ExamConfig } from '@/services/latex-ai.service'

/* ── Dark palette ── */
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


interface LatexProject {
  id: string
  title: string
  folderId: string | null
  createdAt: string
  updatedAt: string
}

export default function LaTeXEditorPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<LatexProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiCreating, setAiCreating] = useState(false)
  // V2 (2026-05-22): modal hướng dẫn dùng AI tạo văn bản LaTeX
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/latex-projects')
      // API returns { success, data: [...], count } — pick the array
      setProjects(data.data || data.projects || [])
    } catch {
      toast.error('Không thể tải danh sách tài liệu LaTeX')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setCreating(true)
      const { data } = await api.post('/latex-projects', { title: 'Tài liệu LaTeX mới' })
      // API returns { success, data: { id, ... } }
      const id = data.data?.id ?? data.id
      toast.success('Đã tạo tài liệu mới')
      navigate(`/teacher/latex-documents/${id}`)
    } catch {
      toast.error('Không thể tạo tài liệu')
    } finally {
      setCreating(false)
    }
  }

  /** Tạo project mới với nội dung LaTeX đã sinh bởi AI rồi điều hướng vào editor */
  const handleAiGenerated = async (result: GenerateResult, config: ExamConfig) => {
    try {
      setAiCreating(true)
      const title = config.title ?? `Đề ${config.subject} — Khối ${config.grade}`
      // 1) Tạo project với title
      const { data: createData } = await api.post('/latex-projects', { title })
      // API returns { success, data: { id, ... } }
      const id = createData.data?.id ?? createData.id

      // 2) Lưu nội dung LaTeX vừa sinh vào project
      await api.put(`/latex-projects/${id}`, { title, mainContent: result.latex })

      toast.success(`Đã tạo "${title}" với ${result.totalQuestions} câu hỏi.`)
      setAiDialogOpen(false)
      navigate(`/teacher/latex-documents/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tạo tài liệu từ AI')
    } finally {
      setAiCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/latex-projects/${id}`)
      setProjects(prev => prev.filter(p => p.id !== id))
      setDeleteTarget(null)
      toast.success('Đã xóa tài liệu')
    } catch {
      toast.error('Không thể xóa tài liệu')
    }
  }

  const now = Date.now()
  const stats = {
    total: projects.length,
    recent: projects.filter(p => now - new Date(p.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000).length,
  }

  const filtered = projects.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 'clamp(12px, 3vw, 24px)' }}>

      {/* Header — compact responsive */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ color: D.purple, fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 800, margin: 0 }}>Tài Liệu LaTeX</h1>
          <p style={{ color: D.muted, fontSize: 'clamp(11px, 2.5vw, 13px)', margin: '4px 0 0' }}>Soạn thảo + sinh đề AI + xuất PDF</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {/* Buttons rút gọn label ngắn để mobile fit */}
          <button
            onClick={() => setGuideOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: 'none', borderRadius: 8,
              color: '#fff', cursor: 'pointer',
              fontWeight: 700, fontSize: 'clamp(11px, 2.5vw, 13px)',
              padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 14px)',
              boxShadow: '0 0 12px rgba(239,68,68,0.3)',
              whiteSpace: 'nowrap',
            }}
            title="Hướng dẫn dùng ChatGPT/Gemini/Claude tạo văn bản LaTeX"
          >
            <BookOpenCheck size={14} />
            Hướng dẫn
          </button>
          <button
            onClick={() => setAiDialogOpen(true)}
            disabled={aiCreating}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #7c3aed, #22d3ee)',
              border: 'none', borderRadius: 8,
              color: '#fff', cursor: aiCreating ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 'clamp(11px, 2.5vw, 13px)',
              padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 14px)',
              opacity: aiCreating ? 0.75 : 1,
              boxShadow: '0 0 12px rgba(124,58,237,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            {aiCreating
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Sparkles size={14} />
            }
            Sinh đề AI
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: D.purple, border: 'none', borderRadius: 8,
              color: '#fff', cursor: creating ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 'clamp(11px, 2.5vw, 13px)',
              padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 14px)',
              opacity: creating ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {creating
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Plus size={14} />
            }
            Tài liệu trắng
          </button>
        </div>
      </div>

      {/* ── AI banner: 2 tính năng — auto-wrap mobile ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10, marginBottom: 16,
        }}
      >
        {/* Card 1: AI generate */}
        <button
          onClick={() => setAiDialogOpen(true)}
          disabled={aiCreating}
          style={{
            textAlign: 'left', cursor: aiCreating ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(34,211,238,0.1))',
            border: '1px solid rgba(124,58,237,0.35)', borderRadius: 12,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
            transition: 'transform 0.15s',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(124,58,237,0.4)',
          }}>
            <Wand2 size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ color: D.text, fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>
              Sinh đề LaTeX bằng AI
            </h3>
            <p style={{ color: D.muted, fontSize: 11, margin: 0, lineHeight: 1.4 }}>
              Chọn môn · khối · chủ đề → AI sinh đề kèm đáp án
            </p>
          </div>
        </button>

        {/* Card 2: LaTeX → PDF */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(22,163,74,0.1))',
            border: '1px solid rgba(37,99,235,0.3)', borderRadius: 12,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(37,99,235,0.4)',
          }}>
            <Download size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ color: D.text, fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>
              Xuất PDF in ấn
            </h3>
            <p style={{ color: D.muted, fontSize: 11, margin: 0, lineHeight: 1.4 }}>
              Bấm <strong style={{ color: '#4ade80' }}>Biên dịch</strong> → PDF A4 chuẩn để in
            </p>
          </div>
        </div>
      </div>

      {/* Stats — compact 3 cột auto-wrap */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { icon: FileCode2, value: stats.total,               label: 'Tổng',           color: '#60a5fa' },
          { icon: Edit3,     value: stats.recent,              label: 'Tuần này',       color: '#4ade80' },
          { icon: Pencil,    value: stats.total - stats.recent, label: 'Cũ',            color: '#a78bfa' },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 10,
            padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 'clamp(10px, 2vw, 11px)', color: D.muted, marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{
        background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
        padding: '14px 16px', marginBottom: 20, position: 'relative', display: 'inline-flex',
        width: '100%', boxSizing: 'border-box',
      }}>
        <Search size={16} style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', color: D.muted }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm tài liệu LaTeX..."
          style={{
            background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
            color: D.text, fontSize: 14, padding: '8px 12px 8px 34px',
            outline: 'none', width: '100%', maxWidth: 400, boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {/* Head */}
        <div style={{
          display: 'grid', gridTemplateColumns: '52px 1fr 140px 140px 110px',
          padding: '12px 20px', background: D.card2, borderBottom: `1px solid ${D.border}`,
        }}>
          {['', 'Tên tài liệu', 'Ngày tạo', 'Cập nhật', 'Thao tác'].map((h, i) => (
            <div key={i} style={{
              color: D.muted, fontSize: 12, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              textAlign: i === 4 ? 'right' : 'left',
            }}>{h}</div>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: D.muted, margin: 0 }}>Đang tải...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <FileCode2 size={32} style={{ color: '#60a5fa' }} />
            </div>
            <h3 style={{ color: D.text, fontWeight: 700, margin: '0 0 8px' }}>Chưa có tài liệu LaTeX</h3>
            <p style={{ color: D.muted, margin: '0 0 20px', fontSize: 14 }}>Tạo tài liệu đầu tiên để bắt đầu soạn thảo</p>
            <button
              onClick={handleCreate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: D.purple, border: 'none', borderRadius: 8,
                color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: '8px 18px',
              }}
            >
              <Plus size={14} />Tạo tài liệu
            </button>
          </div>
        ) : (
          filtered.map((project, idx) => (
            <div
              key={project.id}
              style={{
                display: 'grid', gridTemplateColumns: '52px 1fr 140px 140px 110px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: idx < filtered.length - 1 ? `1px solid ${D.border}` : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Icon */}
              <div>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileCode2 size={18} style={{ color: '#60a5fa' }} />
                </div>
              </div>

              {/* Title */}
              <div>
                <div style={{ color: D.text, fontWeight: 600, fontSize: 14 }}>{project.title}</div>
                {project.folderId && (
                  <div style={{ color: D.muted, fontSize: 12, marginTop: 2 }}>Trong thư mục</div>
                )}
              </div>

              {/* Created */}
              <div style={{ color: D.muted, fontSize: 13 }}>
                {new Date(project.createdAt).toLocaleDateString('vi-VN')}
              </div>

              {/* Updated */}
              <div style={{ color: D.muted, fontSize: 13 }}>
                {new Date(project.updatedAt).toLocaleDateString('vi-VN')}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  onClick={() => navigate(`/teacher/latex-documents/${project.id}`)}
                  title="Chỉnh sửa"
                  style={{
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: 7, color: '#60a5fa', cursor: 'pointer', padding: '5px 8px', lineHeight: 1,
                  }}
                ><Pencil size={14} /></button>
                <button
                  onClick={() => setDeleteTarget(project.id)}
                  title="Xóa"
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 7, color: '#f87171', cursor: 'pointer', padding: '5px 8px', lineHeight: 1,
                  }}
                ><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── AI exam generator modal ── */}
      <AiExamDialog
        open={aiDialogOpen}
        onClose={() => !aiCreating && setAiDialogOpen(false)}
        onGenerated={handleAiGenerated}
        submitLabel="Sinh đề & tạo tài liệu"
        defaults={{
          subject: 'Vật lý',
          grade: 11,
          topics: ['Dòng điện trong vật dẫn'],
          duration: 45,
          format: 'bgd-2025',
          difficulty: { easy: 6, medium: 6, hard: 3, veryHard: 1 },
          includeAnswerKey: true,
          schoolName: 'TRƯỜNG THPT PHƯỚC BỬU',
          departmentName: 'SỞ GD ĐT TP. HỒ CHÍ MINH',
          examLabel: 'ĐỀ THI MINH HOẠ',
          examSession: 'KIỂM TRA CUỐI HỌC KỲ II',
          schoolYear: '2025 – 2026',
        }}
      />

      {/* Delete dialog */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: D.card, border: `1px solid ${D.border2}`,
            borderRadius: 16, padding: 32, maxWidth: 420, width: '90%',
          }}>
            <h3 style={{ color: D.text, fontWeight: 700, margin: '0 0 12px', fontSize: 18 }}>
              Xóa tài liệu LaTeX?
            </h3>
            <p style={{ color: D.muted, margin: '0 0 24px', fontSize: 14 }}>
              Hành động này không thể hoàn tác. Tài liệu sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                  color: D.muted, cursor: 'pointer', padding: '8px 20px', fontSize: 14,
                }}
              >Hủy</button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={{
                  background: '#dc2626', border: 'none', borderRadius: 8,
                  color: '#fff', cursor: 'pointer', fontWeight: 600,
                  padding: '8px 20px', fontSize: 14,
                }}
              >Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* V2: Hướng dẫn AI tạo văn bản LaTeX với prompt mẫu */}
      <AiTemplateGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  )
}
