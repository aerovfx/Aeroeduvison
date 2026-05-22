/**
 * AeroEpisodePlayer — Xem 1 tập Aero
 * Route: /kids/aero/:episodeId
 *
 * Flow: Hero → Video (hoặc storyboard nếu chưa có video) → Quiz 3 câu →
 *       Badge celebration → Next episode CTA
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Play, ChevronRight, Trophy, Heart, Sparkles, Check, X,
  CheckCircle2, RotateCcw,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { getEpisodeById, getSeason, ALL_EPISODES, type AeroQuiz } from '@/data/aeroEpisodes'

const KIDS = {
  bg:      '#fff8e1',
  card:    '#ffffff',
  text:    '#1f2937',
  muted:   '#6b7280',
  primary: '#fbbf24',
  accent:  '#ec4899',
}

type Phase = 'intro' | 'story' | 'quiz' | 'celebrate'

export default function AeroEpisodePlayer() {
  const { episodeId = '' } = useParams<{ episodeId: string }>()
  const navigate = useNavigate()

  const episode = useMemo(() => getEpisodeById(episodeId), [episodeId])
  const season  = episode ? getSeason(episode.season) : undefined
  const seasonColor = season?.color || KIDS.primary

  const [phase, setPhase] = useState<Phase>('intro')
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<boolean[]>([])
  const [selectedTaps, setSelectedTaps] = useState<Set<number>>(new Set())
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null)

  // Next episode
  const nextEpisode = useMemo(() => {
    if (!episode) return null
    const idx = ALL_EPISODES.findIndex(e => e.id === episode.id)
    return idx >= 0 && idx < ALL_EPISODES.length - 1 ? ALL_EPISODES[idx + 1] : null
  }, [episode])

  // Persist completion vào localStorage
  const markComplete = () => {
    try {
      const raw = localStorage.getItem('aero:progress')
      const prog = raw ? JSON.parse(raw) : {}
      prog[episodeId] = true
      localStorage.setItem('aero:progress', JSON.stringify(prog))
    } catch { /* ignore */ }
  }

  // Fire confetti khi reach celebrate
  useEffect(() => {
    if (phase === 'celebrate') {
      markComplete()
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.4 } }), 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!episode || !season) {
    return (
      <div style={{ minHeight: '100vh', background: KIDS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, color: KIDS.text, margin: '0 0 12px' }}>😢 Không tìm thấy tập này</p>
          <Link to="/kids/aero" style={{ color: KIDS.accent, fontWeight: 700 }}>← Quay lại danh sách</Link>
        </div>
      </div>
    )
  }

  const currentQuiz = episode.quiz[quizIndex]
  const totalQuiz = episode.quiz.length
  const correctCount = quizAnswers.filter(Boolean).length

  const handleAnswer = (correct: boolean) => {
    setShowFeedback(correct ? 'correct' : 'wrong')
    if (correct) confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } })
    setTimeout(() => {
      setShowFeedback(null)
      setSelectedTaps(new Set())
      const newAnswers = [...quizAnswers, correct]
      setQuizAnswers(newAnswers)
      if (quizIndex < totalQuiz - 1) {
        setQuizIndex(quizIndex + 1)
      } else {
        setPhase('celebrate')
      }
    }, 1800)
  }

  // For "tap" type — submit chọn xong tất cả options đúng
  const handleTapSubmit = () => {
    if (!currentQuiz.options) return
    const correctIndices = new Set(currentQuiz.options.map((o, i) => o.correct ? i : -1).filter(i => i >= 0))
    const isCorrect = correctIndices.size === selectedTaps.size &&
      [...selectedTaps].every(i => correctIndices.has(i))
    handleAnswer(isCorrect)
  }

  return (
    <div style={{
      background: `linear-gradient(180deg, ${KIDS.bg} 0%, #fef3c7 100%)`,
      minHeight: '100vh', color: KIDS.text, paddingBottom: 60,
    }}>
      {/* Top nav */}
      <header style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${seasonColor}40`,
        padding: '10px 20px', position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/kids/aero" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: KIDS.muted, fontSize: 13, textDecoration: 'none', fontWeight: 600,
        }}>
          <ArrowLeft size={14} /> Mục lục
        </Link>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 14, color: KIDS.text }}>
          {season.emoji} Mùa {season.number} · Tập {episode.episode}
        </div>
        {/* Phase indicator */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['intro', 'story', 'quiz', 'celebrate'] as Phase[]).map((p, i) => (
            <div key={p} style={{
              width: phase === p ? 18 : 8, height: 8, borderRadius: 4,
              background: phase === p ? seasonColor
                : (['intro','story','quiz','celebrate'].indexOf(phase) > i ? '#10b981' : '#e5e7eb'),
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 0' }}>
        {/* ─── PHASE 1: INTRO ─── */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{
              fontSize: 120, marginBottom: 16,
              animation: 'bounce 2s ease-in-out infinite',
            }}>
              {episode.emoji}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `${seasonColor}25`, color: seasonColor,
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 800, marginBottom: 12,
            }}>
              🐭 Aero kể chuyện
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px', color: KIDS.text }}>
              {episode.title}
            </h1>
            <p style={{ fontSize: 16, color: KIDS.muted, margin: '0 0 24px', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              {episode.summary}
            </p>
            <div style={{
              display: 'inline-block', padding: '12px 20px', borderRadius: 14,
              background: 'rgba(251,191,36,0.15)', border: '2px solid rgba(251,191,36,0.4)',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>🎯 Aero sẽ học</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#78350f' }}>{episode.skill}</div>
            </div>
            <br />
            <button
              onClick={() => setPhase('story')}
              style={{
                padding: '14px 36px', borderRadius: 999, cursor: 'pointer',
                background: `linear-gradient(135deg, ${seasonColor}, ${seasonColor}dd)`,
                border: 'none', color: '#fff', fontSize: 18, fontWeight: 900,
                boxShadow: `0 8px 24px ${seasonColor}60`,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <Play size={20} fill="white" /> Bắt đầu xem!
            </button>
            {episode.parentNote && (
              <p style={{ marginTop: 32, fontSize: 12, color: KIDS.muted, fontStyle: 'italic' }}>
                <Heart size={12} style={{ display: 'inline', color: KIDS.accent, verticalAlign: 'middle', marginRight: 4 }} />
                <strong>Phụ huynh:</strong> {episode.parentNote}
              </p>
            )}
          </div>
        )}

        {/* ─── PHASE 2: STORY ─── */}
        {phase === 'story' && (
          <div>
            {episode.videoUrl ? (
              <div style={{
                aspectRatio: '16 / 9', borderRadius: 20, overflow: 'hidden',
                background: '#000', marginBottom: 20,
                boxShadow: `0 8px 32px ${seasonColor}40`,
              }}>
                <video src={episode.videoUrl} controls autoPlay style={{ width: '100%', height: '100%' }} />
              </div>
            ) : (
              // Fallback: storyboard cho tập chưa có video
              <StoryboardFallback episode={episode} seasonColor={seasonColor} />
            )}

            <button
              onClick={() => setPhase('quiz')}
              style={{
                display: 'block', margin: '0 auto', padding: '14px 36px', borderRadius: 999, cursor: 'pointer',
                background: `linear-gradient(135deg, ${seasonColor}, ${seasonColor}dd)`,
                border: 'none', color: '#fff', fontSize: 16, fontWeight: 900,
                boxShadow: `0 6px 18px ${seasonColor}50`,
              }}
            >
              🎯 Trả lời 3 câu đố nào!
            </button>
          </div>
        )}

        {/* ─── PHASE 3: QUIZ ─── */}
        {phase === 'quiz' && currentQuiz && (
          <div>
            {/* Progress bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              padding: '8px 14px', borderRadius: 12, background: KIDS.card,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: seasonColor }}>
                Câu {quizIndex + 1}/{totalQuiz}
              </span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f3f4f6' }}>
                <div style={{
                  width: `${((quizIndex) / totalQuiz) * 100}%`, height: '100%', borderRadius: 4,
                  background: `linear-gradient(90deg, ${seasonColor}, ${seasonColor}dd)`, transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 12, color: KIDS.muted }}>
                ✓ {correctCount}/{quizIndex}
              </span>
            </div>

            {/* Question */}
            <div style={{
              background: KIDS.card, padding: 24, borderRadius: 20, marginBottom: 16,
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: KIDS.text, margin: '0 0 16px', lineHeight: 1.4 }}>
                {currentQuiz.question}
              </p>

              {/* Options */}
              {currentQuiz.type === 'choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {currentQuiz.options?.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => !showFeedback && handleAnswer(opt.correct)}
                      disabled={!!showFeedback}
                      style={{
                        padding: '14px 18px', borderRadius: 14, cursor: showFeedback ? 'default' : 'pointer',
                        background: showFeedback === 'correct' && opt.correct ? '#dcfce7'
                          : showFeedback === 'wrong' && opt.correct ? '#dcfce7'
                          : '#f9fafb',
                        border: `2px solid ${showFeedback && opt.correct ? '#10b981' : '#e5e7eb'}`,
                        color: KIDS.text, fontSize: 15, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!showFeedback) { e.currentTarget.style.borderColor = seasonColor; e.currentTarget.style.background = `${seasonColor}10` } }}
                      onMouseLeave={e => { if (!showFeedback) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb' } }}
                    >
                      {opt.emoji && <span style={{ fontSize: 24 }}>{opt.emoji}</span>}
                      <span>{opt.text}</span>
                      {showFeedback && opt.correct && <Check size={20} style={{ marginLeft: 'auto', color: '#10b981' }} />}
                    </button>
                  ))}
                </div>
              )}

              {currentQuiz.type === 'tap' && (
                <>
                  <p style={{ fontSize: 12, color: KIDS.muted, margin: '0 0 12px' }}>
                    💡 Có thể chọn NHIỀU đáp án — bấm tất cả các đáp án đúng nhé!
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {currentQuiz.options?.map((opt, i) => {
                      const isSel = selectedTaps.has(i)
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (showFeedback) return
                            const next = new Set(selectedTaps)
                            if (next.has(i)) next.delete(i); else next.add(i)
                            setSelectedTaps(next)
                          }}
                          disabled={!!showFeedback}
                          style={{
                            padding: 12, borderRadius: 14, cursor: showFeedback ? 'default' : 'pointer',
                            background: showFeedback
                              ? (opt.correct ? '#dcfce7' : isSel ? '#fee2e2' : '#f9fafb')
                              : isSel ? `${seasonColor}30` : '#f9fafb',
                            border: `2px solid ${showFeedback
                              ? (opt.correct ? '#10b981' : isSel ? '#ef4444' : '#e5e7eb')
                              : isSel ? seasonColor : '#e5e7eb'}`,
                            color: KIDS.text, fontSize: 14, fontWeight: 700,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          }}
                        >
                          {opt.emoji && <span style={{ fontSize: 28 }}>{opt.emoji}</span>}
                          <span>{opt.text}</span>
                          {showFeedback && opt.correct && <Check size={14} style={{ color: '#10b981' }} />}
                          {showFeedback && !opt.correct && isSel && <X size={14} style={{ color: '#ef4444' }} />}
                        </button>
                      )
                    })}
                  </div>
                  {!showFeedback && (
                    <button
                      onClick={handleTapSubmit}
                      disabled={selectedTaps.size === 0}
                      style={{
                        marginTop: 14, width: '100%', padding: '12px 24px', borderRadius: 12, cursor: selectedTaps.size === 0 ? 'not-allowed' : 'pointer',
                        background: selectedTaps.size === 0 ? '#e5e7eb' : `linear-gradient(135deg, ${seasonColor}, ${seasonColor}dd)`,
                        border: 'none', color: selectedTaps.size === 0 ? '#9ca3af' : '#fff',
                        fontSize: 15, fontWeight: 800,
                      }}
                    >
                      Xác nhận đáp án ({selectedTaps.size} chọn)
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div style={{
                padding: 18, borderRadius: 16, textAlign: 'center', fontSize: 15, fontWeight: 700,
                background: showFeedback === 'correct' ? '#dcfce7' : '#fef3c7',
                color: showFeedback === 'correct' ? '#166534' : '#92400e',
                border: `2px solid ${showFeedback === 'correct' ? '#10b981' : '#fbbf24'}`,
              }}>
                {showFeedback === 'correct' ? currentQuiz.feedback.correct : currentQuiz.feedback.wrong}
              </div>
            )}
          </div>
        )}

        {/* ─── PHASE 4: CELEBRATE ─── */}
        {phase === 'celebrate' && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{
              fontSize: 140, marginBottom: 8,
              animation: 'bounce 1s ease-in-out infinite',
            }}>
              {episode.badge.emoji}
            </div>
            <div style={{ fontSize: 24, marginBottom: 4 }}>🎉</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: KIDS.accent }}>
              Hoàn thành rồi!
            </h2>
            <div style={{
              display: 'inline-block', padding: '14px 28px', borderRadius: 20,
              background: `linear-gradient(135deg, ${seasonColor}, ${seasonColor}dd)`,
              color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 12,
              boxShadow: `0 8px 24px ${seasonColor}60`,
            }}>
              🏆 Huy hiệu: {episode.badge.name}
            </div>
            <p style={{ fontSize: 14, color: KIDS.muted, margin: '0 0 8px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              {episode.badge.description}
            </p>
            <p style={{ fontSize: 14, color: KIDS.text, margin: '0 0 24px', fontWeight: 700 }}>
              Bạn đã trả lời đúng <strong style={{ color: '#10b981' }}>{correctCount}/{totalQuiz}</strong> câu đố!
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setPhase('intro')
                  setQuizIndex(0)
                  setQuizAnswers([])
                  setSelectedTaps(new Set())
                }}
                style={{
                  padding: '12px 24px', borderRadius: 14, cursor: 'pointer',
                  background: '#fff', border: `2px solid ${seasonColor}`,
                  color: seasonColor, fontSize: 14, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <RotateCcw size={14} /> Xem lại
              </button>
              {nextEpisode ? (
                <button
                  onClick={() => navigate(`/kids/aero/${nextEpisode.id}`)}
                  style={{
                    padding: '12px 28px', borderRadius: 14, cursor: 'pointer',
                    background: `linear-gradient(135deg, ${seasonColor}, ${seasonColor}dd)`,
                    border: 'none', color: '#fff', fontSize: 14, fontWeight: 800,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: `0 6px 18px ${seasonColor}50`,
                  }}
                >
                  Tập kế tiếp: {nextEpisode.title} <ChevronRight size={14} />
                </button>
              ) : (
                <Link to="/kids/aero" style={{
                  padding: '12px 24px', borderRadius: 14,
                  background: `linear-gradient(135deg, ${KIDS.accent}, #be185d)`,
                  color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <Trophy size={14} /> Xem toàn bộ huy hiệu
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}

// ─── Storyboard fallback khi chưa có video ────────────────────────────
function StoryboardFallback({
  episode, seasonColor,
}: {
  episode: { story: { intro: string; explore: string; lesson: string }; emoji: string; status: string }
  seasonColor: string
}) {
  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden', marginBottom: 20,
      boxShadow: `0 8px 32px ${seasonColor}40`,
    }}>
      {/* Banner */}
      <div style={{
        padding: 20, background: `linear-gradient(135deg, ${seasonColor}30, ${seasonColor}15)`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 80, marginBottom: 8 }}>{episode.emoji}</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.1)', padding: '4px 12px', borderRadius: 999,
          fontSize: 11, fontWeight: 700, color: KIDS.text,
        }}>
          📋 {episode.status === 'in_production' ? 'Animation đang sản xuất' : 'Storyboard preview'}
        </div>
      </div>

      {/* 3 scenes */}
      <div style={{ background: KIDS.card, padding: 20 }}>
        {[
          { label: 'Mở đầu', color: '#3b82f6', text: episode.story.intro,   emoji: '🎬' },
          { label: 'Khám phá', color: '#fbbf24', text: episode.story.explore, emoji: '🔍' },
          { label: 'Bài học', color: '#10b981', text: episode.story.lesson,  emoji: '✨' },
        ].map(s => (
          <div key={s.label} style={{ marginBottom: 14 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 8, marginBottom: 8,
              background: `${s.color}20`, color: s.color, fontSize: 12, fontWeight: 800,
            }}>
              {s.emoji} {s.label}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: KIDS.text, lineHeight: 1.6 }}>{s.text}</p>
          </div>
        ))}
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 10,
          background: '#fef3c7', border: '1px solid #fbbf24',
          fontSize: 12, color: '#92400e', textAlign: 'center',
        }}>
          <Sparkles size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Video animation đang trong quá trình sản xuất. Hãy thử quiz để chuẩn bị nhé!
        </div>
      </div>
    </div>
  )
}
