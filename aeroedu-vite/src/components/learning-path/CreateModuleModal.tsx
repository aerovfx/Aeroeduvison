/**
 * CreateModuleModal — Modal "Tạo Module Mới" cho /teacher/learning-path-builder
 *
 * Multi-step form cho phép GV tạo 1 module với nội dung phong phú:
 *   1. Chọn loại (9 loại): Bài giảng / Trắc nghiệm / Dự án / Bài tập /
 *      Video / Khảo sát / Kiểm tra cuối khoá / Kĩ năng STEM / Thách đấu HS
 *   2. Điền metadata: title / subject / difficulty / duration / xpTarget / desc
 *   3. Type-specific fields:
 *      - Video:      URL + embed kind (YouTube/Vimeo/MP4/GCS)
 *      - Quiz:       Add nhiều câu hỏi MCQ inline (q + 2-4 options + correct)
 *      - Survey:     Add survey items (rating/text/choice)
 *      - Final-exam: Pick từ exams đã tạo (/api/teacher/exams)
 *      - STEM-skill: Pick từ STEM_SKILLS_LIB curated
 *      - Challenge:  Pick opponent từ roster + format (speed-quiz/best-of-3/duel-3min)
 */
import { useEffect, useMemo, useState } from 'react'
import {
  X, ChevronRight, ChevronLeft, Check, Plus, Trash2,
  BookOpen, FileText, Target, ClipboardList, Video, BarChart3,
  Trophy, Cog, Swords, AlertCircle, Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'
import VideoUploader from '@/components/teacher/VideoUploader'
import {
  type Module, type ModuleType, type Difficulty,
  type QuizQuestion, type SurveyQuestion,
  type VideoEmbedKind, type ChallengeFormat,
  type RosterStudent,
} from '@/pages/teacher/LearningPathBuilder'

// ─── Static data ───────────────────────────────────────────────
const TYPE_OPTIONS: Array<{
  type: ModuleType; label: string; desc: string; icon: any; color: string
}> = [
  { type: 'lesson',     label: 'Bài giảng',      desc: 'Nội dung lý thuyết / hướng dẫn', icon: BookOpen,      color: '#60a5fa' },
  { type: 'video',      label: 'Video',          desc: 'YouTube / Vimeo / MP4 / GCS',     icon: Video,         color: '#f472b6' },
  { type: 'quiz',       label: 'Trắc nghiệm',    desc: 'Nhiều câu hỏi MCQ inline',         icon: FileText,      color: '#a78bfa' },
  { type: 'assignment', label: 'Bài tập',        desc: 'Bài tập về nhà / luyện tập',      icon: ClipboardList, color: '#fbbf24' },
  { type: 'survey',     label: 'Khảo sát',       desc: 'Rating, text, multiple choice',    icon: BarChart3,     color: '#34d399' },
  { type: 'project',    label: 'Dự án',          desc: 'Dự án dài hơi (1-4 tuần)',         icon: Target,        color: '#fb923c' },
  { type: 'final-exam', label: 'Kiểm tra cuối khoá', desc: 'Link tới đề đã tạo trong /teacher/exams', icon: Trophy, color: '#facc15' },
  { type: 'stem-skill', label: 'Kĩ năng STEM',   desc: 'Hoàn thành 1 skill STEM cụ thể',   icon: Cog,           color: '#22d3ee' },
  { type: 'challenge',  label: 'Thách đấu HS khác', desc: 'Đối kháng với 1 HS — 3 format',  icon: Swords,        color: '#f87171' },
]

const SUBJECT_OPTIONS = [
  'mathematics', 'physics', 'chemistry', 'biology', 'informatics',
  'literature', 'english', 'history', 'geography', 'civic-education', 'other',
] as const

const SUBJECT_LABELS: Record<string, string> = {
  mathematics:     'Toán',
  physics:         'Vật lí',
  chemistry:       'Hoá học',
  biology:         'Sinh học',
  informatics:     'Tin học',
  literature:      'Ngữ văn',
  english:         'Tiếng Anh',
  history:         'Lịch sử',
  geography:       'Địa lí',
  'civic-education': 'GDCD',
  other:           'Khác',
}

// Curated STEM skills (theo chương trình GDPT 2018, có thể mở rộng sau)
const STEM_SKILLS_LIB: Array<{ id: string; name: string; subject: string }> = [
  { id: 'stem-arduino-basic',     name: 'Lập trình Arduino cơ bản',         subject: 'informatics' },
  { id: 'stem-3d-printing',       name: 'Thiết kế và in 3D',                subject: 'informatics' },
  { id: 'stem-robotics-line',     name: 'Robot dò line',                    subject: 'physics' },
  { id: 'stem-circuit-design',    name: 'Thiết kế mạch điện cơ bản',        subject: 'physics' },
  { id: 'stem-data-analysis',     name: 'Phân tích dữ liệu Python',         subject: 'informatics' },
  { id: 'stem-ml-classification', name: 'Machine Learning phân loại ảnh',   subject: 'informatics' },
  { id: 'stem-iot-sensor',        name: 'Cảm biến IoT (DHT11, MQ-2)',       subject: 'physics' },
  { id: 'stem-game-scratch',      name: 'Lập trình game với Scratch',       subject: 'informatics' },
  { id: 'stem-bridge-engineering',name: 'Kĩ thuật xây cầu mô hình',         subject: 'physics' },
  { id: 'stem-water-quality',     name: 'Đo chất lượng nước (pH, TDS)',     subject: 'chemistry' },
  { id: 'stem-renewable-energy',  name: 'Năng lượng tái tạo: pin mặt trời', subject: 'physics' },
  { id: 'stem-bio-cell',          name: 'Quan sát tế bào dưới kính hiển vi',subject: 'biology' },
]

const CHALLENGE_FORMATS: Array<{ value: ChallengeFormat; label: string; desc: string }> = [
  { value: 'speed-quiz', label: 'Speed Quiz',        desc: '10 câu, ai trả lời đúng nhanh hơn thắng' },
  { value: 'best-of-3',  label: 'Best of 3',         desc: '3 ván trắc nghiệm — ai thắng 2 ván trước' },
  { value: 'duel-3min',  label: 'Duel 3 phút',       desc: 'Đối kháng 3 phút — đếm số câu đúng' },
]

// ─── Type guards / helpers ─────────────────────────────────────
function uid(prefix = 'm') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function detectVideoKind(url: string): VideoEmbedKind {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/vimeo\.com/i.test(url)) return 'vimeo'
  if (/storage\.googleapis\.com|aeroedu-media/i.test(url)) return 'gcs'
  return 'mp4'
}

// ─── Props ─────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  onCreate: (module: Module) => void
  roster: RosterStudent[]
}

interface ExamSummary { id: string; title: string; subject?: string; questionCount?: number }

// ─── Main ──────────────────────────────────────────────────────
export default function CreateModuleModal({ open, onClose, onCreate, roster }: Props) {
  // ── Step ──
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // ── Common metadata ──
  const [type, setType]             = useState<ModuleType>('lesson')
  const [title, setTitle]           = useState('')
  const [subject, setSubject]       = useState<string>('mathematics')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [duration, setDuration]     = useState(30)
  const [xpTarget, setXpTarget]     = useState(100)
  const [description, setDescription] = useState('')
  const [tagsCsv, setTagsCsv]       = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [attempts, setAttempts]     = useState(0)

  // ── Type-specific ──
  // video
  const [videoUrl, setVideoUrl]     = useState('')
  // quiz
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  // survey
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([])
  // final-exam
  const [exams, setExams]           = useState<ExamSummary[]>([])
  const [examsLoading, setExamsLoading] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string>('')
  // stem-skill
  const [stemSkillId, setStemSkillId] = useState<string>(STEM_SKILLS_LIB[0].id)
  // challenge
  const [challengeStudentId, setChallengeStudentId] = useState<string>('')
  const [challengeFormat, setChallengeFormat]       = useState<ChallengeFormat>('speed-quiz')

  // Reset khi đóng
  useEffect(() => {
    if (!open) {
      setStep(1)
      setType('lesson')
      setTitle(''); setSubject('mathematics'); setDifficulty('medium')
      setDuration(30); setXpTarget(100); setDescription(''); setTagsCsv('')
      setPassingScore(70); setAttempts(0)
      setVideoUrl(''); setQuizQuestions([]); setSurveyQuestions([])
      setExams([]); setSelectedExamId('')
      setStemSkillId(STEM_SKILLS_LIB[0].id)
      setChallengeStudentId(''); setChallengeFormat('speed-quiz')
    }
  }, [open])

  // Lazy load exams khi chọn final-exam
  useEffect(() => {
    if (open && step === 3 && type === 'final-exam' && exams.length === 0 && !examsLoading) {
      setExamsLoading(true)
      api.get<{ exams: ExamSummary[] }>('/teacher/exams')
        .then(r => {
          const list = Array.isArray(r.data?.exams) ? r.data.exams : []
          setExams(list)
          if (list[0] && !selectedExamId) setSelectedExamId(list[0].id)
        })
        .catch(e => {
          console.warn('[create-module] load exams failed', e?.response?.data || e.message)
        })
        .finally(() => setExamsLoading(false))
    }
  }, [open, step, type, exams.length, examsLoading, selectedExamId])

  // ── Quiz helpers ──
  const addQuizQuestion = () => {
    setQuizQuestions(prev => [...prev, {
      id: uid('q'), q: '', options: ['', '', '', ''], correctIndex: 0,
    }])
  }
  const updateQuizQuestion = (qid: string, patch: Partial<QuizQuestion>) => {
    setQuizQuestions(prev => prev.map(q => q.id === qid ? { ...q, ...patch } : q))
  }
  const removeQuizQuestion = (qid: string) => {
    setQuizQuestions(prev => prev.filter(q => q.id !== qid))
  }
  const updateQuizOption = (qid: string, optIdx: number, value: string) => {
    setQuizQuestions(prev => prev.map(q =>
      q.id === qid
        ? { ...q, options: q.options.map((o, i) => i === optIdx ? value : o) }
        : q,
    ))
  }

  // ── Survey helpers ──
  const addSurveyQuestion = (kind: SurveyQuestion['type'] = 'rating') => {
    setSurveyQuestions(prev => [...prev, {
      id: uid('s'), q: '', type: kind,
      ...(kind === 'rating' ? { scaleMax: 5 } : {}),
      ...(kind === 'choice' ? { options: ['', ''] } : {}),
    }])
  }
  const updateSurveyQuestion = (sid: string, patch: Partial<SurveyQuestion>) => {
    setSurveyQuestions(prev => prev.map(s => s.id === sid ? { ...s, ...patch } : s))
  }
  const removeSurveyQuestion = (sid: string) => {
    setSurveyQuestions(prev => prev.filter(s => s.id !== sid))
  }

  // ── Validation ──
  const canNext1 = !!type
  const canNext2 = title.trim().length >= 3 && duration > 0 && xpTarget > 0
  const canCreate = (() => {
    if (!canNext2) return false
    switch (type) {
      case 'video':      return videoUrl.trim().length > 5
      case 'quiz':       return quizQuestions.length > 0 &&
                                quizQuestions.every(q => q.q.trim() && q.options.filter(o => o.trim()).length >= 2)
      case 'survey':     return surveyQuestions.length > 0 &&
                                surveyQuestions.every(s => s.q.trim())
      case 'final-exam': return !!selectedExamId
      case 'stem-skill': return !!stemSkillId
      case 'challenge':  return !!challengeStudentId && !!challengeFormat
      default:           return true
    }
  })()

  // ── Submit ──
  const handleCreate = () => {
    if (!canCreate) return
    const tags = tagsCsv.split(',').map(t => t.trim()).filter(Boolean)
    const id = uid(type)
    const base: Module = {
      id, type, title: title.trim(), subject, difficulty,
      duration, xpTarget,
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      passingScore: type === 'quiz' || type === 'final-exam' ? passingScore : undefined,
      attempts: attempts > 0 ? attempts : undefined,
    }
    let m: Module = { ...base }
    switch (type) {
      case 'video':
        m = { ...m, videoUrl: videoUrl.trim(), videoEmbedKind: detectVideoKind(videoUrl) }
        break
      case 'quiz':
        m = { ...m, quizQuestions }
        break
      case 'survey':
        m = { ...m, surveyQuestions }
        break
      case 'final-exam': {
        const ex = exams.find(e => e.id === selectedExamId)
        m = { ...m, examId: selectedExamId, examName: ex?.title }
        break
      }
      case 'stem-skill': {
        const sk = STEM_SKILLS_LIB.find(s => s.id === stemSkillId)
        m = { ...m, stemSkillId, stemSkillName: sk?.name }
        break
      }
      case 'challenge': {
        const opp = roster.find(r => r.id === challengeStudentId)
        m = {
          ...m,
          challengeStudentId,
          challengeStudentName: opp?.name,
          challengeFormat,
        }
        break
      }
    }
    onCreate(m)
    toast.success(`Đã tạo module "${m.title}"`)
    onClose()
  }

  if (!open) return null

  // ─── Style helpers ───
  const D = {
    bg: '#0d0e17', card: '#10111e', card2: '#161728',
    border: '#1e2033', border2: '#2a2b3d', text: '#f1f5f9', muted: '#94a3b8',
  }
  const labelCls: React.CSSProperties = {
    color: D.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.05em', display: 'block', marginBottom: 6,
  }
  const inputCls: React.CSSProperties = {
    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
    color: D.text, fontSize: 13, padding: '8px 12px',
    width: '100%', boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: D.card, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
          width: '100%', maxWidth: 880, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: `1px solid ${D.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(124,58,237,0.12), transparent)',
        }}>
          <div>
            <h2 style={{ color: D.text, fontSize: 18, fontWeight: 800, margin: 0 }}>
              ➕ Tạo Module Mới
            </h2>
            <p style={{ color: D.muted, fontSize: 12, margin: '3px 0 0' }}>
              Bước {step}/3: {step === 1 ? 'Chọn loại module' : step === 2 ? 'Thông tin chung' : 'Nội dung chi tiết'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: D.muted, padding: 6,
          }}><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 22px 0' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 99,
              background: s <= step ? '#7c3aed' : D.border,
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {/* ─── Step 1: Type picker ─── */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon
                const active = type === opt.type
                return (
                  <button
                    key={opt.type}
                    onClick={() => setType(opt.type)}
                    style={{
                      textAlign: 'left',
                      background: active ? `${opt.color}15` : D.card2,
                      border: active ? `1px solid ${opt.color}` : `1px solid ${D.border2}`,
                      borderRadius: 12, padding: 14, cursor: 'pointer',
                      transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${opt.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} style={{ color: opt.color }} />
                    </div>
                    <div>
                      <div style={{ color: D.text, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                        {opt.label}
                      </div>
                      <div style={{ color: D.muted, fontSize: 11, lineHeight: 1.4 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ─── Step 2: Common metadata ─── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelCls}>Tiêu đề *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Bài 1 — Định nghĩa Động lượng"
                  style={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelCls}>Mô tả ngắn</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu / nội dung chính của module"
                  rows={2}
                  style={{ ...inputCls, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div>
                  <label style={labelCls}>Môn học</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} style={inputCls}>
                    {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelCls}>Độ khó</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} style={inputCls}>
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
                <div>
                  <label style={labelCls}>Thời lượng (phút) *</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(Math.max(1, Number(e.target.value) || 0))}
                    min={1}
                    style={inputCls}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div>
                  <label style={labelCls}>XP thưởng *</label>
                  <input
                    type="number"
                    value={xpTarget}
                    onChange={e => setXpTarget(Math.max(10, Number(e.target.value) || 0))}
                    min={10} step={10}
                    style={inputCls}
                  />
                </div>
                {(type === 'quiz' || type === 'final-exam') && (
                  <>
                    <div>
                      <label style={labelCls}>Điểm đạt (%)</label>
                      <input
                        type="number"
                        value={passingScore}
                        onChange={e => setPassingScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        min={0} max={100}
                        style={inputCls}
                      />
                    </div>
                    <div>
                      <label style={labelCls}>Số lần làm (0 = ∞)</label>
                      <input
                        type="number"
                        value={attempts}
                        onChange={e => setAttempts(Math.max(0, Number(e.target.value) || 0))}
                        min={0}
                        style={inputCls}
                      />
                    </div>
                  </>
                )}
              </div>
              <div>
                <label style={labelCls}>Thẻ (phân cách dấu phẩy)</label>
                <input
                  value={tagsCsv}
                  onChange={e => setTagsCsv(e.target.value)}
                  placeholder="VD: dao-động, lớp-10, học-kỳ-1"
                  style={inputCls}
                />
              </div>
            </div>
          )}

          {/* ─── Step 3: Type-specific ─── */}
          {step === 3 && (
            <div>
              {/* VIDEO — option 1: paste URL, option 2: upload file lên GCS */}
              {type === 'video' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Upload file → GCS bucket */}
                  <div>
                    <label style={labelCls}>📤 Upload file video lên GCS</label>
                    <VideoUploader
                      courseId="learning-path"
                      mediaType="video"
                      maxSizeMB={500}
                      onComplete={(info) => {
                        setVideoUrl(info.url)
                        toast.success(`Video đã upload: ${info.filename}`)
                      }}
                    />
                  </div>

                  {/* Divider */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    color: D.muted, fontSize: 11, fontWeight: 600,
                  }}>
                    <div style={{ flex: 1, height: 1, background: D.border2 }} />
                    HOẶC
                    <div style={{ flex: 1, height: 1, background: D.border2 }} />
                  </div>

                  {/* Paste URL có sẵn */}
                  <div>
                    <label style={labelCls}>🔗 URL video có sẵn</label>
                    <input
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... hoặc https://vimeo.com/..."
                      style={inputCls}
                    />
                    {videoUrl && (
                      <div style={{ color: '#a78bfa', fontSize: 11, marginTop: 6 }}>
                        ✓ Đã phát hiện: <strong>{detectVideoKind(videoUrl)}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                    padding: 12, color: D.muted, fontSize: 12, lineHeight: 1.5,
                  }}>
                    <AlertCircle size={14} style={{ display: 'inline', marginRight: 6, color: '#a78bfa' }} />
                    Chọn 1 trong 2: <strong>Upload file</strong> (mp4/webm/mov, ≤500MB) hoặc
                    <strong> paste URL</strong> (YouTube/Vimeo/MP4 link).
                    File upload sẽ lưu trên GCS bucket riêng của bạn.
                  </div>
                </div>
              )}

              {/* QUIZ */}
              {type === 'quiz' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: D.text, fontSize: 13, fontWeight: 700 }}>
                      Câu hỏi trắc nghiệm ({quizQuestions.length})
                    </span>
                    <button
                      onClick={addQuizQuestion}
                      style={{
                        background: '#7c3aed', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Plus size={13} /> Thêm câu
                    </button>
                  </div>
                  {quizQuestions.length === 0 && (
                    <div style={{
                      border: `2px dashed ${D.border2}`, borderRadius: 10, padding: 28,
                      textAlign: 'center', color: D.muted, fontSize: 12,
                    }}>
                      Chưa có câu hỏi. Bấm "Thêm câu" để bắt đầu.
                    </div>
                  )}
                  {quizQuestions.map((q, idx) => (
                    <div key={q.id} style={{
                      background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 12,
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 800 }}>Câu {idx + 1}</span>
                        <button
                          onClick={() => removeQuizQuestion(q.id)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#f87171', padding: 4,
                          }}
                        ><Trash2 size={14} /></button>
                      </div>
                      <input
                        value={q.q}
                        onChange={e => updateQuizQuestion(q.id, { q: e.target.value })}
                        placeholder="Nhập câu hỏi…"
                        style={inputCls}
                      />
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            checked={q.correctIndex === optIdx}
                            onChange={() => updateQuizQuestion(q.id, { correctIndex: optIdx })}
                            title="Đáp án đúng"
                            style={{ accentColor: '#22c55e', cursor: 'pointer' }}
                          />
                          <input
                            value={opt}
                            onChange={e => updateQuizOption(q.id, optIdx, e.target.value)}
                            placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}`}
                            style={{
                              ...inputCls,
                              border: q.correctIndex === optIdx
                                ? '1px solid #22c55e'
                                : `1px solid ${D.border2}`,
                            }}
                          />
                        </div>
                      ))}
                      <input
                        value={q.explanation || ''}
                        onChange={e => updateQuizQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Giải thích (tuỳ chọn)"
                        style={{ ...inputCls, fontSize: 12, color: D.muted }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* SURVEY */}
              {type === 'survey' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: D.text, fontSize: 13, fontWeight: 700 }}>
                      Câu khảo sát ({surveyQuestions.length})
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => addSurveyQuestion('rating')} style={{
                        background: '#34d39920', color: '#34d399', border: '1px solid #34d39950',
                        borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer',
                      }}>+ Thang điểm</button>
                      <button onClick={() => addSurveyQuestion('choice')} style={{
                        background: '#60a5fa20', color: '#60a5fa', border: '1px solid #60a5fa50',
                        borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer',
                      }}>+ Lựa chọn</button>
                      <button onClick={() => addSurveyQuestion('text')} style={{
                        background: '#a78bfa20', color: '#a78bfa', border: '1px solid #a78bfa50',
                        borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer',
                      }}>+ Văn bản</button>
                    </div>
                  </div>
                  {surveyQuestions.length === 0 && (
                    <div style={{
                      border: `2px dashed ${D.border2}`, borderRadius: 10, padding: 28,
                      textAlign: 'center', color: D.muted, fontSize: 12,
                    }}>
                      Chưa có câu khảo sát. Bấm 1 nút thêm bên trên.
                    </div>
                  )}
                  {surveyQuestions.map((s, idx) => (
                    <div key={s.id} style={{
                      background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 12,
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 800 }}>
                          Câu {idx + 1} · <span style={{ color: D.muted }}>{s.type}</span>
                        </span>
                        <button
                          onClick={() => removeSurveyQuestion(s.id)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#f87171', padding: 4,
                          }}
                        ><Trash2 size={14} /></button>
                      </div>
                      <input
                        value={s.q}
                        onChange={e => updateSurveyQuestion(s.id, { q: e.target.value })}
                        placeholder="Nội dung câu khảo sát…"
                        style={inputCls}
                      />
                      {s.type === 'rating' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: D.muted, fontSize: 12 }}>Thang điểm tối đa:</span>
                          <input
                            type="number"
                            value={s.scaleMax || 5}
                            onChange={e => updateSurveyQuestion(s.id, { scaleMax: Math.max(2, Math.min(10, Number(e.target.value) || 5)) })}
                            min={2} max={10}
                            style={{ ...inputCls, width: 80 }}
                          />
                        </div>
                      )}
                      {s.type === 'choice' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(s.options || []).map((opt, oi) => (
                            <input
                              key={oi}
                              value={opt}
                              onChange={e => {
                                const opts = [...(s.options || [])]
                                opts[oi] = e.target.value
                                updateSurveyQuestion(s.id, { options: opts })
                              }}
                              placeholder={`Lựa chọn ${oi + 1}`}
                              style={inputCls}
                            />
                          ))}
                          <button
                            onClick={() => updateSurveyQuestion(s.id, { options: [...(s.options || []), ''] })}
                            style={{
                              background: 'transparent', color: '#a78bfa', border: `1px dashed ${D.border2}`,
                              borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer',
                            }}
                          >+ Thêm lựa chọn</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* FINAL-EXAM */}
              {type === 'final-exam' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelCls}>Chọn đề thi đã tạo</label>
                    {examsLoading ? (
                      <div style={{ color: D.muted, fontSize: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Loader2 size={14} className="animate-spin" /> Đang tải danh sách đề thi…
                      </div>
                    ) : exams.length === 0 ? (
                      <div style={{
                        border: `2px dashed ${D.border2}`, borderRadius: 10, padding: 24,
                        textAlign: 'center', color: D.muted, fontSize: 12,
                      }}>
                        Chưa có đề thi nào. Tạo trước ở <strong>/teacher/exams</strong>.
                      </div>
                    ) : (
                      <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} style={inputCls}>
                        {exams.map(ex => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title}{ex.questionCount ? ` (${ex.questionCount} câu)` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{
                    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                    padding: 12, color: D.muted, fontSize: 12, lineHeight: 1.5,
                  }}>
                    <Trophy size={14} style={{ display: 'inline', marginRight: 6, color: '#facc15' }} />
                    HS phải hoàn thành các module trước đó mới được làm bài. Có thể giới hạn
                    số lần làm và điểm đạt ở Bước 2.
                  </div>
                </div>
              )}

              {/* STEM-SKILL */}
              {type === 'stem-skill' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelCls}>Chọn kĩ năng STEM</label>
                    <select value={stemSkillId} onChange={e => setStemSkillId(e.target.value)} style={inputCls}>
                      {STEM_SKILLS_LIB.map(sk => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name} — {SUBJECT_LABELS[sk.subject] || sk.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{
                    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                    padding: 12, color: D.muted, fontSize: 12, lineHeight: 1.5,
                  }}>
                    <Cog size={14} style={{ display: 'inline', marginRight: 6, color: '#22d3ee' }} />
                    HS sẽ thấy hướng dẫn chi tiết + bài kiểm tra hoàn thành kĩ năng.
                    Sau khi đạt, HS được cộng XP và unlock badge.
                  </div>
                </div>
              )}

              {/* CHALLENGE */}
              {type === 'challenge' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelCls}>Chọn HS đối thủ *</label>
                    {roster.length === 0 ? (
                      <div style={{
                        border: `2px dashed ${D.border2}`, borderRadius: 10, padding: 24,
                        textAlign: 'center', color: D.muted, fontSize: 12,
                      }}>
                        Chưa có HS nào trong roster. Liên kết HS ở <strong>/teacher/student-requests</strong>.
                      </div>
                    ) : (
                      <select
                        value={challengeStudentId}
                        onChange={e => setChallengeStudentId(e.target.value)}
                        style={inputCls}
                      >
                        <option value="">— Chọn 1 HS —</option>
                        {roster.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}{r.classNames.length > 0 ? ` (${r.classNames.join(', ')})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label style={labelCls}>Format thách đấu *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {CHALLENGE_FORMATS.map(f => (
                        <button
                          key={f.value}
                          onClick={() => setChallengeFormat(f.value)}
                          style={{
                            textAlign: 'left',
                            background: challengeFormat === f.value ? '#f8717115' : D.card2,
                            border: challengeFormat === f.value
                              ? '1px solid #f87171'
                              : `1px solid ${D.border2}`,
                            borderRadius: 10, padding: 10, cursor: 'pointer',
                          }}
                        >
                          <div style={{ color: D.text, fontWeight: 700, fontSize: 12, marginBottom: 3 }}>
                            {f.label}
                          </div>
                          <div style={{ color: D.muted, fontSize: 11, lineHeight: 1.4 }}>
                            {f.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                    padding: 12, color: D.muted, fontSize: 12, lineHeight: 1.5,
                  }}>
                    <Swords size={14} style={{ display: 'inline', marginRight: 6, color: '#f87171' }} />
                    Thách đấu sẽ gửi notification cho cả 2 HS. HS thắng được +XP, HS thua
                    được hiển thị câu sai để học lại.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${D.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12,
        }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              style={{
                background: 'transparent', border: `1px solid ${D.border2}`,
                color: D.text, borderRadius: 9, padding: '8px 14px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <ChevronLeft size={14} /> Quay lại
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: `1px solid ${D.border2}`,
                color: D.muted, borderRadius: 9, padding: '8px 14px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Huỷ
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
                style={{
                  background:
                    (step === 1 ? canNext1 : canNext2) ? '#7c3aed' : D.border2,
                  color: (step === 1 ? canNext1 : canNext2) ? '#fff' : '#64748b',
                  border: 'none', borderRadius: 9, padding: '8px 16px',
                  fontSize: 13, fontWeight: 700,
                  cursor: (step === 1 ? canNext1 : canNext2) ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                Tiếp <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!canCreate}
                style={{
                  background: canCreate
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : D.border2,
                  color: canCreate ? '#fff' : '#64748b',
                  border: 'none', borderRadius: 9, padding: '8px 18px',
                  fontSize: 13, fontWeight: 700,
                  cursor: canCreate ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: canCreate ? '0 4px 12px rgba(34,197,94,0.3)' : 'none',
                }}
              >
                <Check size={14} /> Tạo Module
              </button>
            )}
          </div>
        </div>

        {/* Quick summary line */}
        <div style={{
          padding: '8px 22px', background: D.card2,
          borderTop: `1px solid ${D.border}`,
          color: D.muted, fontSize: 11, display: 'flex', gap: 14, flexWrap: 'wrap',
        }}>
          <span>Loại: <strong style={{ color: D.text }}>{TYPE_OPTIONS.find(o => o.type === type)?.label}</strong></span>
          {title && <span>· Tên: <strong style={{ color: D.text }}>{title.slice(0, 40)}{title.length > 40 ? '…' : ''}</strong></span>}
          {step === 3 && type === 'quiz' && <span>· {quizQuestions.length} câu</span>}
          {step === 3 && type === 'survey' && <span>· {surveyQuestions.length} câu khảo sát</span>}
        </div>
      </div>
    </div>
  )
}
