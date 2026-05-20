/**
 * /free-courses/llm-mastery — Khoá học LLM miễn phí
 *
 * Public page (không cần đăng nhập) cho phép HS/GV/bất kỳ ai
 * khám phá nội dung khoá học LLM toàn diện. Dữ liệu lấy từ
 * src/data/aiLlmCourse.ts — repo gốc: github.com/aerovfx/Aero-HowtoLLMs
 *
 * 3 section chính:
 *   1. Hero + tổng quan khoá học
 *   2. Module list với lessons expandable
 *   3. Quiz inline với 40 câu hỏi (tự chấm + giải thích)
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Github, BookOpen, Clock, ChevronDown, ChevronUp,
  ExternalLink, Sparkles, Brain, CheckCircle2, XCircle, Award,
  RotateCcw, Lightbulb, FileText, Zap,
  ArrowRight, Play,
} from 'lucide-react'
import { AI_LLM_COURSE, AI_LLM_QUIZ, type CourseModule, type CourseLesson, type QuizQuestion } from '@/data/aiLlmCourse'
import { MathText } from '@/components/common/MathText'

// ── Color palette (theo Landing.tsx dark theme) ──
const C = {
  bg:          '#06070f',
  card:        '#0f1126',
  card2:       '#1a1d36',
  border:      'rgba(124,58,237,0.18)',
  borderStrong:'rgba(124,58,237,0.4)',
  text:        '#e8ecf5',
  muted:       '#8a92a5',
  cyan:        '#06b6d4',
  purple:      '#a78bfa',
  green:       '#10b981',
  amber:       '#f59e0b',
  red:         '#ef4444',
  blue:        '#60a5fa',
}

const LEVEL_COLOR: Record<CourseModule['level'], { bg: string; text: string; label: string }> = {
  beginner:     { bg: 'rgba(16,185,129,0.15)',  text: '#34d399', label: 'Cơ bản' },
  intermediate: { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24', label: 'Trung cấp' },
  advanced:     { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', label: 'Nâng cao' },
}

// ════════════════════════════════════════════════════════════════
//   MAIN
// ════════════════════════════════════════════════════════════════

export default function FreeAiCourse() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      <HeroSection />
      <ModulesSection />
      <QuizSection />
      <FooterCTA />
    </div>
  )
}

// ── HERO ────────────────────────────────────────────────────────

function HeroSection() {
  const totalLessons = AI_LLM_COURSE.modules.reduce((s, m) => s + m.lessons.length, 0)
  return (
    <section style={{
      position: 'relative',
      padding: '80px 24px 40px',
      borderBottom: `1px solid ${C.border}`,
      background: `radial-gradient(ellipse at top, rgba(124,58,237,0.12) 0%, transparent 60%)`,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        {/* Free badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 99,
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.4)',
          fontSize: 12, fontWeight: 700, color: '#34d399',
          marginBottom: 20,
        }}>
          <Sparkles size={13} />
          100% MIỄN PHÍ · Không cần đăng nhập
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.15,
          marginBottom: 16,
          background: `linear-gradient(135deg, #fff 0%, ${C.purple} 60%, ${C.cyan} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {AI_LLM_COURSE.title}
        </h1>

        <p style={{ fontSize: 18, color: C.muted, maxWidth: 720, margin: '0 auto 24px' }}>
          {AI_LLM_COURSE.description}
        </p>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap',
          marginBottom: 32,
        }}>
          {[
            { icon: BookOpen, value: `${AI_LLM_COURSE.modules.length}`, label: 'Module' },
            { icon: FileText, value: `${totalLessons}`, label: 'Bài học' },
            { icon: Brain,    value: `${AI_LLM_QUIZ.length}`, label: 'Câu hỏi' },
            { icon: Clock,    value: `${AI_LLM_COURSE.totalHours}h`, label: 'Tổng thời gian' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(124,58,237,0.15)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <s.icon size={20} style={{ color: C.purple }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#modules" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 99,
            background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`,
            color: '#fff', fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}>
            <Play size={14} /> Bắt đầu học ngay
          </a>
          <a href={AI_LLM_COURSE.sourceRepo} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 99,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.text, fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}>
            <Github size={14} /> Source code trên GitHub
          </a>
        </div>

        {/* Attribution */}
        <p style={{ fontSize: 11, color: C.muted, marginTop: 16 }}>
          Dựa trên <a href={AI_LLM_COURSE.sourceRepo} target="_blank" rel="noopener noreferrer"
            style={{ color: C.cyan, textDecoration: 'none' }}>Aero-HowtoLLMs</a> (MIT License) · {AI_LLM_COURSE.subtitle}
        </p>
      </div>
    </section>
  )
}

// ── MODULES ─────────────────────────────────────────────────────

function ModulesSection() {
  return (
    <section id="modules" style={{ padding: '60px 24px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="LỘ TRÌNH HỌC"
          title="10 Module — Từ nền tảng đến thực hành"
          description="Theo thứ tự, mỗi module 3-5 bài học có markdown + key points + link tới repo gốc"
        />
        <div style={{ marginTop: 32, display: 'grid', gap: 16 }}>
          {AI_LLM_COURSE.modules.map(m => <ModuleCard key={m.id} module={m} />)}
        </div>
      </div>
    </section>
  )
}

function ModuleCard({ module: m }: { module: CourseModule }) {
  const [expanded, setExpanded] = useState(false)
  const lvl = LEVEL_COLOR[m.level]

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${expanded ? C.borderStrong : C.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', padding: '20px 24px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(124,58,237,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, flexShrink: 0,
        }}>
          {m.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>MODULE {m.index}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: lvl.bg, color: lvl.text,
            }}>{lvl.label}</span>
            <span style={{
              fontSize: 10, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}><Clock size={10} />{m.estimatedHours}h · {m.lessons.length} bài</span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0, marginBottom: 4 }}>{m.title}</h3>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>{m.description}</p>
        </div>
        {expanded ? <ChevronUp size={20} style={{ color: C.purple, flexShrink: 0 }} />
                  : <ChevronDown size={20} style={{ color: C.muted, flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 24px 24px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            {m.lessons.map((l, i) => <LessonCard key={l.id} lesson={l} index={i + 1} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function LessonCard({ lesson: l, index }: { lesson: CourseLesson; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      background: C.card2,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '14px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'rgba(124,58,237,0.2)', color: C.purple,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, flexShrink: 0,
        }}>{index}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{l.title}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={11} />{l.duration}
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.summary}</span>
          </div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px 52px' }}>
          {/* Content (markdown rendered as paragraphs) */}
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
            <MathText>{l.content}</MathText>
          </div>

          {/* Key points */}
          {l.keyPoints.length > 0 && (
            <div style={{
              background: 'rgba(124,58,237,0.06)',
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 10,
            }}>
              <div style={{
                fontSize: 10, color: C.purple, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.6, marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Lightbulb size={11} /> Ý chính cần nhớ
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                {l.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </div>
          )}

          {/* External link */}
          {l.externalUrl && (
            <a href={l.externalUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: C.cyan, textDecoration: 'none',
            }}>
              <ExternalLink size={11} /> Xem chi tiết trong repo
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── QUIZ ─────────────────────────────────────────────────────────

function QuizSection() {
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const filteredQuiz = useMemo(() => {
    if (selectedModule === 'all') return AI_LLM_QUIZ
    return AI_LLM_QUIZ.filter(q => q.moduleId === selectedModule)
  }, [selectedModule])

  return (
    <section style={{ padding: '60px 24px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="KIỂM TRA KIẾN THỨC"
          title={`Quiz ${AI_LLM_QUIZ.length} câu — Tự chấm + giải thích`}
          description="Có MCQ, Đúng/Sai 4 mệnh đề, Trả lời ngắn và Tự luận"
        />

        {/* Module filter */}
        <div style={{ marginTop: 24, marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedModule('all')} style={filterBtnStyle(selectedModule === 'all')}>
            Tất cả ({AI_LLM_QUIZ.length})
          </button>
          {AI_LLM_COURSE.modules.map(m => {
            const count = AI_LLM_QUIZ.filter(q => q.moduleId === m.id).length
            if (count === 0) return null
            return (
              <button key={m.id} onClick={() => setSelectedModule(m.id)} style={filterBtnStyle(selectedModule === m.id)}>
                {m.emoji} M{m.index} ({count})
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {filteredQuiz.map((q, i) => <QuizCard key={q.id} question={q} index={i + 1} />)}
        </div>
      </div>
    </section>
  )
}

function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 99,
    background: active ? `linear-gradient(135deg, ${C.purple}, ${C.cyan})` : 'transparent',
    color: active ? '#fff' : C.muted,
    border: `1px solid ${active ? 'transparent' : C.border}`,
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.15s',
  }
}

function QuizCard({ question: q, index }: { question: QuizQuestion; index: number }) {
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [tfAnswers, setTfAnswers] = useState<string[]>(['', '', '', ''])
  const [submitted, setSubmitted] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const isCorrect = useMemo(() => {
    if (!submitted) return null
    if (q.questionType === 'MCQ' || q.questionType === 'SHORT_ANSWER') {
      return userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
    }
    if (q.questionType === 'MULTIPLE_TF') {
      // correctAnswer là 'Đúng,Sai,Đúng,Sai' hoặc 'TFTF'
      const norm = (s: string) => s.replace(/[Đđ]úng/gi, 'T').replace(/Sai/gi, 'F').replace(/[^TF]/g, '').toUpperCase()
      const userCompact = norm(tfAnswers.join(','))
      const correctCompact = norm(q.correctAnswer)
      return userCompact === correctCompact && userCompact.length === 4
    }
    return null  // ESSAY = self-grade
  }, [submitted, userAnswer, tfAnswers, q])

  const reset = () => {
    setUserAnswer('')
    setTfAnswers(['', '', '', ''])
    setSubmitted(false)
    setShowExplanation(false)
  }

  const diffStyle = {
    easy:   { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Dễ' },
    medium: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'TB' },
    hard:   { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', label: 'Khó' },
  }[q.difficulty]

  const typeLabel = {
    MCQ:           'Trắc nghiệm 1 đáp án',
    MULTIPLE_TF:   'Đúng/Sai 4 mệnh đề',
    SHORT_ANSWER:  'Trả lời ngắn',
    ESSAY:         'Tự luận',
  }[q.questionType]

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${submitted ? (isCorrect === true ? '#10b98166' : isCorrect === false ? '#ef444466' : C.border) : C.border}`,
      borderRadius: 14,
      padding: 18,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(124,58,237,0.18)', color: C.purple,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>{index}</span>
        <span style={{ fontSize: 10, color: C.muted, padding: '2px 8px', borderRadius: 99, background: 'rgba(124,58,237,0.1)', fontWeight: 700 }}>
          {typeLabel}
        </span>
        <span style={{ fontSize: 10, color: diffStyle.color, padding: '2px 8px', borderRadius: 99, background: diffStyle.bg, fontWeight: 700 }}>
          {diffStyle.label}
        </span>
        {submitted && isCorrect !== null && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: isCorrect ? '#34d399' : '#f87171',
          }}>
            {isCorrect ? <><CheckCircle2 size={14} />Đúng</> : <><XCircle size={14} />Sai</>}
          </span>
        )}
      </div>

      {/* Question content */}
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.65, marginBottom: 14 }}>
        <MathText>{q.content}</MathText>
      </div>

      {/* Options / answer input */}
      {q.questionType === 'MCQ' && q.options && (
        <div style={{ display: 'grid', gap: 8 }}>
          {q.options.map((opt, i) => {
            const letter = ['A', 'B', 'C', 'D'][i]
            const isSel = userAnswer === letter
            const isCorrectAnswer = submitted && q.correctAnswer.trim().toUpperCase() === letter
            const isWrongPick = submitted && isSel && !isCorrectAnswer
            return (
              <label key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                cursor: submitted ? 'default' : 'pointer',
                background: isCorrectAnswer ? 'rgba(16,185,129,0.12)'
                          : isWrongPick    ? 'rgba(239,68,68,0.12)'
                          : isSel           ? 'rgba(124,58,237,0.12)'
                          : C.card2,
                border: `1px solid ${
                  isCorrectAnswer ? '#10b98166' :
                  isWrongPick    ? '#ef444466' :
                  isSel           ? C.borderStrong : C.border}`,
              }}>
                <input
                  type="radio"
                  name={q.id}
                  value={letter}
                  checked={isSel}
                  onChange={() => !submitted && setUserAnswer(letter)}
                  disabled={submitted}
                  style={{ accentColor: C.purple }}
                />
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: isCorrectAnswer ? '#10b981' : isWrongPick ? '#ef4444' : 'rgba(124,58,237,0.2)',
                  color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>{letter}</span>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}><MathText>{opt}</MathText></span>
              </label>
            )
          })}
        </div>
      )}

      {q.questionType === 'MULTIPLE_TF' && q.options && (
        <div style={{ display: 'grid', gap: 8 }}>
          {q.options.map((opt, i) => {
            const letters = ['a', 'b', 'c', 'd']
            return (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 10,
                background: C.card2, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  fontWeight: 800, color: C.purple, fontSize: 13, width: 18,
                }}>{letters[i]})</span>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}><MathText>{opt}</MathText></span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['Đúng', 'Sai'] as const).map(val => {
                    const isSel = tfAnswers[i] === val
                    return (
                      <button
                        key={val}
                        onClick={() => {
                          if (submitted) return
                          const next = [...tfAnswers]; next[i] = val; setTfAnswers(next)
                        }}
                        disabled={submitted}
                        style={{
                          padding: '4px 10px', borderRadius: 6,
                          fontSize: 11, fontWeight: 700,
                          cursor: submitted ? 'default' : 'pointer',
                          background: isSel
                            ? (val === 'Đúng' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)')
                            : 'transparent',
                          color: isSel ? (val === 'Đúng' ? '#34d399' : '#f87171') : C.muted,
                          border: `1px solid ${isSel ? (val === 'Đúng' ? '#10b98166' : '#ef444466') : C.border}`,
                        }}
                      >{val}</button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {q.questionType === 'SHORT_ANSWER' && (
        <input
          type="text"
          value={userAnswer}
          onChange={e => !submitted && setUserAnswer(e.target.value)}
          disabled={submitted}
          maxLength={20}
          placeholder="Nhập đáp án (thường 4 ký tự số)..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            background: C.card2, border: `1px solid ${C.border}`,
            color: C.text, fontSize: 14, fontFamily: 'monospace',
            outline: 'none',
          }}
        />
      )}

      {q.questionType === 'ESSAY' && (
        <textarea
          value={userAnswer}
          onChange={e => !submitted && setUserAnswer(e.target.value)}
          disabled={submitted}
          rows={4}
          placeholder="Trả lời tự luận — sau khi submit sẽ hiện đáp án mẫu để bạn tự đánh giá..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            background: C.card2, border: `1px solid ${C.border}`,
            color: C.text, fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            outline: 'none',
          }}
        />
      )}

      {/* Action buttons */}
      <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={q.questionType === 'MULTIPLE_TF' ? tfAnswers.some(a => !a) : !userAnswer.trim()}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`,
              color: '#fff', fontSize: 12, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              opacity: ((q.questionType === 'MULTIPLE_TF' ? tfAnswers.some(a => !a) : !userAnswer.trim()) ? 0.4 : 1),
            }}
          >
            Kiểm tra
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowExplanation(v => !v)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(124,58,237,0.15)',
                color: C.purple, fontSize: 11, fontWeight: 700,
                border: `1px solid ${C.border}`, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <Lightbulb size={12} /> {showExplanation ? 'Ẩn giải thích' : 'Xem giải thích'}
            </button>
            <button
              onClick={reset}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'transparent',
                color: C.muted, fontSize: 11, fontWeight: 700,
                border: `1px solid ${C.border}`, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <RotateCcw size={12} /> Làm lại
            </button>
          </>
        )}
      </div>

      {/* Explanation */}
      {submitted && showExplanation && (
        <div style={{
          marginTop: 12, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(96,165,250,0.06)',
          border: `1px solid rgba(96,165,250,0.25)`,
        }}>
          {q.questionType === 'ESSAY' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                Đáp án mẫu
              </div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                <MathText>{q.correctAnswer}</MathText>
              </div>
            </div>
          )}
          {(q.questionType === 'MCQ' || q.questionType === 'SHORT_ANSWER' || q.questionType === 'MULTIPLE_TF') && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                Đáp án đúng
              </div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 700, fontFamily: q.questionType === 'SHORT_ANSWER' ? 'monospace' : undefined }}>
                {q.correctAnswer}
              </div>
            </div>
          )}
          <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
            Giải thích
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>
            <MathText>{q.explanation}</MathText>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SECTION HEADER ──────────────────────────────────────────────

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <span style={{
        fontSize: 11, color: C.cyan, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: 1.4,
      }}>{eyebrow}</span>
      <h2 style={{
        fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800,
        marginTop: 8, marginBottom: 8,
        background: `linear-gradient(135deg, #fff, ${C.purple})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>{title}</h2>
      <p style={{ fontSize: 14, color: C.muted, maxWidth: 580, margin: '0 auto' }}>{description}</p>
    </div>
  )
}

// ── FOOTER CTA ──────────────────────────────────────────────────

function FooterCTA() {
  return (
    <section style={{ padding: '60px 24px 80px' }}>
      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: 32, borderRadius: 24, textAlign: 'center',
        background: `linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))`,
        border: `1px solid ${C.borderStrong}`,
      }}>
        <Award size={36} style={{ color: C.purple, marginBottom: 12 }} />
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Sẵn sàng để học sâu hơn?</h3>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>
          Khoá học miễn phí này chỉ là khởi đầu. Tham gia inphysic.com để truy cập AI Gia sư,
          Knowledge Graph cá nhân hoá và cộng đồng GV/HS đam mê AI.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/auth/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 99,
            background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            textDecoration: 'none',
          }}>
            <Zap size={14} /> Đăng ký tài khoản miễn phí
          </Link>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 99,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.text, fontSize: 13, fontWeight: 700,
            textDecoration: 'none',
          }}>
            <ArrowRight size={14} /> Khám phá nền tảng
          </Link>
        </div>
      </div>
    </section>
  )
}
