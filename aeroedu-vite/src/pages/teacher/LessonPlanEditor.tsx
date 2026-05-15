/**
 * LessonPlanEditor — Soạn 1 giáo án (WYSIWYG, auto-save 2s)
 *
 * Layout:
 *  - Top toolbar: tên, môn, khối, save status, button "Lưu vào Drive (GCS)", back
 *  - Body: RichTextEditor full-page
 *  - Auto-save: debounce 2s sau mỗi edit → PATCH content → DB
 *  - "Lưu vào Drive": POST /backup → snapshot HTML lên GCS bucket
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, Cloud, Check, AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { lessonPlanService, type LessonPlan } from '@/services/lessonPlan.service'
import RichTextEditor from '@/components/lesson-plan/RichTextEditor'

const SUBJECTS = ['Toán', 'Vật lý', 'Hoá học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Công nghệ', 'Thể dục']
const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export default function LessonPlanEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<LessonPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Editing state (mirror of plan, debounced sync to backend)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<string>('')
  const [grade, setGrade] = useState<string>('')
  const [content, setContent] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupUrl, setBackupUrl] = useState<string | null>(null)
  const [backupAt, setBackupAt] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContent = useRef('')

  // Load plan
  useEffect(() => {
    if (!id) return
    setLoading(true)
    lessonPlanService.get(id)
      .then(p => {
        setPlan(p)
        setTitle(p.title)
        setSubject(p.subject || '')
        setGrade(p.grade || '')
        setContent(p.content || '')
        setBackupUrl(p.gcsBackupUrl)
        setBackupAt(p.gcsBackupAt)
        lastSavedContent.current = p.content || ''
      })
      .catch(e => {
        if (e?.response?.status === 404) setNotFound(true)
        else toast.error(e?.response?.data?.error || 'Lỗi tải giáo án')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Auto-save: debounce 2s sau mỗi thay đổi
  const triggerAutoSave = useCallback(() => {
    if (!id) return
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null
      setSaving(true)
      try {
        const updated = await lessonPlanService.update(id, {
          title: title.trim() || 'Giáo án mới',
          content,
          subject: subject || undefined,
          grade: grade || undefined,
        })
        setPlan(updated)
        lastSavedContent.current = content
        setSaved(true)
      } catch (e: any) {
        toast.error(e?.response?.data?.error || 'Lỗi auto-save')
      } finally { setSaving(false) }
    }, 2000)
  }, [id, title, content, subject, grade])

  useEffect(() => {
    if (loading || !plan) return
    triggerAutoSave()
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [title, content, subject, grade, loading, plan, triggerAutoSave])

  const handleSaveNow = async () => {
    if (!id) return
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    setSaving(true)
    try {
      await lessonPlanService.update(id, {
        title: title.trim() || 'Giáo án mới',
        content, subject: subject || undefined, grade: grade || undefined,
      })
      setSaved(true)
      toast.success('Đã lưu')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi lưu')
    } finally { setSaving(false) }
  }

  const handleBackup = async () => {
    if (!id) return
    if (!saved) {
      // Save first to ensure latest
      await handleSaveNow()
    }
    setBackupLoading(true)
    try {
      const r = await lessonPlanService.backup(id)
      setBackupUrl(r.url)
      setBackupAt(r.backedUpAt)
      toast.success('Đã lưu vào Drive (GCS)')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi sao lưu Drive')
    } finally { setBackupLoading(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0e17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#7c3aed' }} />
      </div>
    )
  }
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0e17', color: '#f1f5f9',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <AlertTriangle size={40} style={{ color: '#f87171' }} />
        <p>Không tìm thấy giáo án này</p>
        <button onClick={() => navigate('/teacher/lesson-plans')}
          style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          ← Về danh sách
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0e17', color: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 20px', background: '#10111e', borderBottom: '1px solid #1e2033',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 30,
      }}>
        <button onClick={() => navigate('/teacher/lesson-plans')}
          style={{
            padding: '6px 10px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid #1e2033', borderRadius: 7, cursor: 'pointer',
            color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
          }}>
          <ArrowLeft size={13} /> Danh sách
        </button>

        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Tên giáo án..."
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px',
            background: 'transparent', border: '1px solid transparent', borderRadius: 7,
            color: '#f1f5f9', fontSize: 16, fontWeight: 700, outline: 'none',
          }}
          onFocus={e => e.currentTarget.style.borderColor = '#1e2033'}
          onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
        />

        <select value={subject} onChange={e => setSubject(e.target.value)}
          style={{
            padding: '6px 10px', background: '#0d0e17', border: '1px solid #1e2033',
            borderRadius: 7, color: '#cbd5e1', fontSize: 12, outline: 'none', cursor: 'pointer',
          }}>
          <option value="">-- Môn --</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={grade} onChange={e => setGrade(e.target.value)}
          style={{
            padding: '6px 10px', background: '#0d0e17', border: '1px solid #1e2033',
            borderRadius: 7, color: '#cbd5e1', fontSize: 12, outline: 'none', cursor: 'pointer',
          }}>
          <option value="">-- Khối --</option>
          {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
        </select>

        {/* Save status indicator */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          {saving ? (
            <span style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Loader2 size={11} className="animate-spin" /> Đang lưu...
            </span>
          ) : saved ? (
            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={12} /> Đã lưu
            </span>
          ) : (
            <button onClick={handleSaveNow}
              style={{
                padding: '5px 10px', background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              <Save size={11} /> Lưu ngay
            </button>
          )}
        </div>

        {/* Backup to Drive */}
        <button onClick={handleBackup} disabled={backupLoading}
          title={backupUrl
            ? `Sao lưu lần cuối: ${backupAt ? new Date(backupAt).toLocaleString('vi-VN') : ''}`
            : 'Sao lưu HTML lên Google Cloud Storage bucket'}
          style={{
            padding: '7px 12px',
            background: backupUrl ? 'rgba(16,185,129,0.12)' : '#7c3aed',
            border: backupUrl ? '1px solid rgba(16,185,129,0.4)' : 'none',
            borderRadius: 7, color: backupUrl ? '#10b981' : '#fff',
            cursor: backupLoading ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, opacity: backupLoading ? 0.6 : 1,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
          {backupLoading ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
          {backupUrl ? 'Sao lưu lại' : 'Lưu vào Drive'}
        </button>

        {backupUrl && (
          <a href={backupUrl} target="_blank" rel="noopener noreferrer"
            title="Mở snapshot trên Drive (GCS)"
            style={{
              padding: '7px 8px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid #1e2033', borderRadius: 7, color: '#60a5fa',
              display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
            }}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* ── Editor body ── */}
      <div style={{ flex: 1, padding: 20, background: '#0d0e17', overflow: 'auto' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)', minHeight: '70vh',
          display: 'flex', flexDirection: 'column',
        }}>
          <RichTextEditor
            value={content}
            onChange={(html) => setContent(html)}
            placeholder="Bắt đầu soạn giáo án... (gõ '/' để xem mẹo phím tắt)"
          />
        </div>
      </div>
    </div>
  )
}
