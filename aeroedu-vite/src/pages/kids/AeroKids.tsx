/**
 * AeroKids — Landing page series game cho mầm non + tiểu học
 * Route: /kids/aero
 *
 * Hero giới thiệu nhân vật Aero + 5 season cards + episode grid
 * theo design plan dau-lem-game-series-plan.md
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Lock, Trophy, Sparkles, Heart, ArrowLeft, Clock, Award, Star,
} from 'lucide-react'
import { AERO_SEASONS, AERO_STATS, type AeroSeason, type AeroEpisode } from '@/data/aeroEpisodes'

// Bright colors phù hợp trẻ em
const KIDS = {
  bg:      '#fff8e1',
  card:    '#ffffff',
  text:    '#1f2937',
  muted:   '#6b7280',
  primary: '#fbbf24',     // vàng Aero
  accent:  '#ec4899',     // hồng vui nhộn
  blue:    '#3b82f6',
  green:   '#10b981',
}

export default function AeroKids() {
  const [activeSeasonNum, setActiveSeasonNum] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [progress, setProgress] = useState<Record<string, boolean>>({})

  // Load progress từ localStorage (MVP — sau migrate server)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('aero:progress')
      if (raw) setProgress(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const activeSeason = AERO_SEASONS.find(s => s.number === activeSeasonNum)!
  const completedCount = Object.values(progress).filter(Boolean).length

  return (
    <div style={{
      background: `linear-gradient(180deg, ${KIDS.bg} 0%, #fef3c7 100%)`,
      minHeight: '100vh', color: KIDS.text, paddingBottom: 60,
    }}>
      {/* ── Top nav ── */}
      <header style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${KIDS.primary}40`,
        padding: '12px 20px', position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: KIDS.muted, fontSize: 13, textDecoration: 'none', fontWeight: 600,
          }}>
            <ArrowLeft size={14} /> Trang chủ
          </Link>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: KIDS.accent }}>
            🐭 AeroKids — Phiêu lưu cùng Aero
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${KIDS.primary}25`, padding: '6px 12px', borderRadius: 999,
            fontSize: 13, fontWeight: 800, color: '#92400e',
          }}>
            <Trophy size={14} /> {completedCount}/50 tập
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 0' }}>
        {/* ── Hero: giới thiệu Aero ── */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24,
          alignItems: 'center', marginBottom: 32,
        }} className="aero-hero-grid">
          {/* Character bubble */}
          <div style={{
            width: 180, height: 180, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #fef3c7, ${KIDS.primary})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 100, boxShadow: `0 10px 40px ${KIDS.primary}50`,
            border: '4px solid white',
          }}>
            🐭
          </div>

          {/* Intro */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `${KIDS.accent}20`, padding: '6px 14px', borderRadius: 999,
              fontSize: 12, fontWeight: 800, color: KIDS.accent, marginBottom: 12,
            }}>
              <Sparkles size={13} /> MIỄN PHÍ · 4-10 TUỔI
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 6px', color: KIDS.text }}>
              Chào! Mình là <span style={{ color: KIDS.accent }}>Aero</span>!
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: KIDS.muted, margin: '0 0 16px', maxWidth: 600 }}>
              Mình là bé chinchilla 6 tuổi, thích thí nghiệm và khám phá thế giới.
              Cùng mình đi qua <strong style={{ color: KIDS.accent }}>50 cuộc phiêu lưu</strong> để học
              kỹ năng sống, an toàn, đạo đức, khoa học và năng lực số nhé! 🚀
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { icon: '🎬', value: AERO_STATS.totalEpisodes, label: 'tập phim' },
                { icon: '🏆', value: AERO_STATS.totalSeasons,  label: 'mùa' },
                { icon: '🎯', value: AERO_STATS.totalEpisodes * 3, label: 'câu đố' },
                { icon: '🏅', value: AERO_STATS.totalEpisodes, label: 'huy hiệu' },
              ].map(s => (
                <div key={s.label} style={{
                  background: KIDS.card, padding: '10px 14px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: KIDS.text }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: KIDS.muted }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Season tabs (5 cards lớn) ── */}
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 12px', color: KIDS.text }}>
            🎬 Chọn mùa phiêu lưu
          </h3>
          <div style={{
            display: 'grid', gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}>
            {AERO_SEASONS.map(s => {
              const isActive = s.number === activeSeasonNum
              const seasonProgress = s.episodes.filter(e => progress[e.id]).length
              return (
                <button
                  key={s.number}
                  onClick={() => setActiveSeasonNum(s.number)}
                  style={{
                    padding: 16, borderRadius: 16, cursor: 'pointer',
                    background: isActive ? `linear-gradient(135deg, ${s.color}, ${s.color}cc)` : KIDS.card,
                    border: `3px solid ${isActive ? s.color : 'transparent'}`,
                    color: isActive ? '#fff' : KIDS.text, textAlign: 'left',
                    transition: 'all 0.2s', boxShadow: isActive
                      ? `0 8px 24px ${s.color}50`
                      : '0 2px 8px rgba(0,0,0,0.06)',
                    transform: isActive ? 'translateY(-4px)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 4 }}>{s.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 2 }}>
                    MÙA {s.number}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    👶 {s.ageGroup} tuổi · 🎬 {seasonProgress}/{s.episodes.length} tập
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Episodes grid của season hiện tại ── */}
        <section>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              padding: '6px 14px', borderRadius: 999,
              background: `${activeSeason.color}25`, color: activeSeason.color,
              fontWeight: 900, fontSize: 14,
            }}>
              {activeSeason.emoji} Mùa {activeSeason.number}
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: KIDS.text }}>
              {activeSeason.title}
            </h3>
            <span style={{ fontSize: 13, color: KIDS.muted }}>
              · {activeSeason.theme}
            </span>
          </div>

          <div style={{
            display: 'grid', gap: 14,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}>
            {activeSeason.episodes.map((ep, idx) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                episodeIndex={idx}
                seasonColor={activeSeason.color}
                isCompleted={!!progress[ep.id]}
              />
            ))}
          </div>
        </section>

        {/* ── Footer for parents ── */}
        <section style={{
          marginTop: 40, padding: 24, borderRadius: 20,
          background: 'rgba(255,255,255,0.85)',
          border: `2px dashed ${KIDS.primary}80`,
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 900, color: KIDS.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Heart size={18} style={{ color: KIDS.accent }} /> Dành cho phụ huynh
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: KIDS.muted, lineHeight: 1.6 }}>
            AeroKids là series giáo dục VIỆT NAM dành cho trẻ 4-10 tuổi, dạy 5 chủ đề cốt lõi
            (vệ sinh / an toàn / đạo đức / khoa học / năng lực số) qua câu chuyện vui nhộn.
            Mỗi tập 6-8 phút + 3 câu đố củng cố kiến thức. Khuyến khích PH xem cùng con để
            thảo luận sâu hơn về bài học. <br /><br />
            <Link to="/free-courses/pedagogy" style={{ color: KIDS.accent, fontWeight: 700, textDecoration: 'none' }}>
              📚 GV xem khoá học Game-Based Learning (free) →
            </Link>
          </p>
        </section>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .aero-hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .aero-hero-grid > div:first-child {
            margin: 0 auto;
            width: 120px !important;
            height: 120px !important;
            font-size: 70px !important;
          }
        }
      `}</style>
    </div>
  )
}

// ─── Episode Card ────────────────────────────────────────────────────
function EpisodeCard({ episode, episodeIndex, seasonColor, isCompleted }: {
  episode: AeroEpisode
  episodeIndex: number
  seasonColor: string
  isCompleted: boolean
}) {
  const isLocked = episode.status === 'planned' && episodeIndex > 0
  const statusColor =
    episode.status === 'released' ? '#10b981' :
    episode.status === 'in_production' ? '#fbbf24' : '#94a3b8'
  const statusLabel =
    episode.status === 'released' ? '✓ Đã có' :
    episode.status === 'in_production' ? '🎬 Đang sản xuất' : '📋 Sắp ra'

  return (
    <Link
      to={`/kids/aero/${episode.id}`}
      style={{
        textDecoration: 'none', color: 'inherit',
        background: KIDS.card, borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.15s', cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'translateY(-4px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
    >
      {/* Thumbnail / emoji */}
      <div style={{
        height: 140, background: `linear-gradient(135deg, ${seasonColor}30, ${seasonColor}15)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, position: 'relative',
      }}>
        {episode.emoji}
        {isCompleted && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: '#10b981', color: '#fff',
            padding: '4px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 800,
            boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
          }}>
            ✓ Hoàn thành
          </div>
        )}
        {isLocked && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={32} style={{ color: '#fff' }} />
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          background: `${statusColor}`, color: '#fff',
          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
        }}>
          {statusLabel}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
          fontSize: 11, fontWeight: 700, color: seasonColor,
        }}>
          TẬP {episode.episode} · {episode.ageGroup} TUỔI
        </div>
        <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: KIDS.text, lineHeight: 1.3 }}>
          {episode.title}
        </h4>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: KIDS.muted, lineHeight: 1.5, flex: 1 }}>
          🎯 <strong>Kỹ năng:</strong> {episode.skill}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 8, borderTop: '1px solid #f3f4f6',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: KIDS.muted }}>
            <Clock size={12} /> {Math.round(episode.durationSec / 60)} phút
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
            color: isCompleted ? '#10b981' : seasonColor,
          }}>
            {isCompleted
              ? <><Star size={12} fill="currentColor" /> {episode.badge.name.slice(0, 14)}</>
              : <><Play size={12} /> Xem ngay</>}
          </span>
        </div>
      </div>
    </Link>
  )
}
