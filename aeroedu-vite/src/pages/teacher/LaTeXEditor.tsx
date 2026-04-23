import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Plus, Loader2, Trash2, Pencil, Search, Edit3, Sparkles, Wand2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { AiExamDialog } from '@/components/latex-editor/AiExamDialog'
import type { GenerateResult, ExamConfig } from '@/services/latex-ai.service'

/* ── Dark palette ── */
const D = {
  bg: '#0d0e17',
  card: '#10111e',
  card2: '#161728',
  border: '#1e2033',
  border2: '#2a2b3d',
  text: '#f1f5f9',
  muted: '#94a3b8',
  purple: '#7c3aed',
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

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/latex-projects')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch {
      toast.error('Không thể tải danh sách tài liệu LaTeX')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setCreating(true)
      const res = await fetch('/api/latex-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Tài liệu LaTeX mới' }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      toast.success('Đã tạo tài liệu mới')
      navigate(`/teacher/latex-documents/${data.id}`)
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
      const createRes = await fetch('/api/latex-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!createRes.ok) throw new Error('Không thể tạo project')
      const { id } = await createRes.json()

      // 2) Lưu nội dung LaTeX vừa sinh vào project
      const saveRes = await fetch(`/api/latex-projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mainContent: result.latex }),
      })
      if (!saveRes.ok) throw new Error('Không thể lưu nội dung AI')

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
      const res = await fetch(`/api/latex-projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
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
    <div style={{ background: D.bg, minHeight: '100vh', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: D.purple, fontSize: 32, fontWeight: 800, margin: 0 }}>Tài Liệu LaTeX</h1>
          <p style={{ color: D.muted, fontSize: 14, margin: '6px 0 0' }}>Soạn thảo, sinh đề bằng AI và xuất PDF chuyên nghiệp</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setAiDialogOpen(true)}
            disabled={aiCreating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #7c3aed, #22d3ee)',
              border: 'none', borderRadius: 10,
              color: '#fff', cursor: aiCreating ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 14, padding: '10px 20px',
              opacity: aiCreating ? 0.75 : 1,
              boxShadow: '0 0 18px rgba(124,58,237,0.4)',
            }}
          >
            {aiCreating
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Sparkles size={16} />
            }
            Tạo đề bằng AI
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: D.purple, border: 'none', borderRadius: 10,
              color: '#fff', cursor: creating ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 14, padding: '10px 20px',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Plus size={16} />
            }
            Tạo Tài Liệu Trắng
          </button>
        </div>
      </div>

      {/* ── AI banner: 2 tính năng cốt lõi ── */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24,
        }}
      >
        {/* Card 1: AI generate */}
        <button
          onClick={() => setAiDialogOpen(true)}
          disabled={aiCreating}
          style={{
            textAlign: 'left', cursor: aiCreating ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(34,211,238,0.1))',
            border: '1px solid rgba(124,58,237,0.35)', borderRadius: 16,
            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { if (!aiCreating) e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(124,58,237,0.5)',
          }}>
            <Wand2 size={28} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ color: D.text, fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>
              Tạo đề với AI dưới định dạng LaTeX
            </h3>
            <p style={{ color: D.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Chọn môn · khối · chủ đề · độ khó — hệ thống sinh tài liệu LaTeX hoàn chỉnh (TN 4 lựa chọn, Đúng/Sai, tự luận), kèm bảng đáp án.
            </p>
          </div>
          <Sparkles size={22} style={{ color: '#a78bfa', flexShrink: 0 }} />
        </button>

        {/* Card 2: LaTeX → PDF */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(22,163,74,0.1))',
            border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16,
            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18,
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(37,99,235,0.5)',
          }}>
            <Download size={28} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ color: D.text, fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>
              Chuyển LaTeX ra PDF — tải xuống để in ấn
            </h3>
            <p style={{ color: D.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Trong editor, bấm <strong style={{ color: '#4ade80' }}>Biên dịch</strong> để chuyển file LaTeX sang PDF chuẩn A4, sau đó tải về máy và in cho học sinh.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: FileCode2, value: stats.total,               label: 'Tổng tài liệu',      color: '#60a5fa' },
          { icon: Edit3,     value: stats.recent,              label: 'Cập nhật tuần này',  color: '#4ade80' },
          { icon: Pencil,    value: stats.total - stats.recent, label: 'Tài liệu cũ',        color: '#a78bfa' },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <Icon size={32} style={{ color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 13, color: D.muted, marginTop: 4 }}>{label}</div>
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
    </div>
  )
}
