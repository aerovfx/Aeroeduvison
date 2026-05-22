/**
 * GalaxyHero — Hero banner kiểu Meteor "GALAXY BATTLE" cho dashboard.
 *
 * Cosmic dark gradient + glow orbs + circular orb illustration ở phải +
 * big bold heading + tagline + CTA pill button.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

interface GalaxyHeroProps {
  badge?: string
  title: ReactNode
  description?: string
  ctaLabel?: string
  ctaTo?: string
  /** Emoji/icon đại diện hiển thị bên phải */
  orbEmoji?: string
  /** Giảm size cho mobile-friendly */
  compact?: boolean
}

export function GalaxyHero({
  badge,
  title,
  description,
  ctaLabel,
  ctaTo,
  orbEmoji = '🪐',
  compact = false,
}: GalaxyHeroProps) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-2xl"
      /* 2026-05-19: border + bg đặt qua inline style để bypass global CSS
         overrides (border-white/[0.08] sẽ thành border-black trên light mode
         làm hero trông như "border đen" lệch tone với cosmic bg). */
      style={{
        background:
          'radial-gradient(ellipse at 80% 50%, #4c1d95 0%, #1e1b4b 35%, #0f0a24 70%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Star field SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="stargrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.8" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 40 }).map((_, i) => {
          // Deterministic pseudo-random pattern
          const x = (i * 37 + 23) % 100
          const y = (i * 53 + 41) % 100
          const r = ((i * 7) % 4) + 0.5
          return <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="url(#stargrad)" />
        })}
      </svg>

      {/* Glow orbs */}
      <div className="absolute -top-16 left-1/4 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-12 w-40 h-40 rounded-full bg-purple-500/25 blur-2xl pointer-events-none" />

      {/* Content */}
      <div className={`relative ${compact ? 'p-5 sm:p-7' : 'p-6 sm:p-10'} flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8`}>
        <div className="flex-1 min-w-0">
          {badge && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-sm border text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-3"
              /* 2026-05-19: inline styles bypass global CSS overrides (text-fuchsia-200,
                 bg-white/[0.08], border-white/15) → giữ luôn ÁNH SÁNG trên dark cosmic
                 hero regardless of theme. */
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.15)',
                color: '#f5d0fe',
              }}
            >
              <Sparkles className="w-3 h-3" />
              {badge}
            </div>
          )}
          <h1
            className={`font-black leading-[0.95] tracking-tight mb-2 sm:mb-3 ${
              compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-6xl'
            }`}
            style={{
              background: 'linear-gradient(90deg, #ffffff 0%, #f9a8d4 50%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',  // fallback
              textShadow: '0 0 40px rgba(236,72,153,0.3)',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mb-4"
              /* Force light text on dark cosmic bg — bypass global text-white/X override */
              style={{ color: 'rgba(255,255,255,0.82)' }}
            >
              {description}
            </p>
          )}
          {ctaLabel && ctaTo && (
            <Link
              to={ctaTo}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-bold text-purple-950 shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 8px 24px rgba(245,158,11,0.45)',
              }}
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          )}
        </div>

        {/* Right orb illustration */}
        <div className="relative flex-shrink-0 mx-auto sm:mx-0">
          {/* Outer ring with rotation */}
          <div
            className="absolute inset-0 rounded-full opacity-60"
            style={{
              background:
                'conic-gradient(from 0deg, #ec4899, #06b6d4, #a855f7, #ec4899)',
              filter: 'blur(20px)',
              transform: 'scale(1.4)',
            }}
          />
          <div
            className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full flex items-center justify-center text-6xl sm:text-7xl lg:text-8xl shadow-2xl"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(236,72,153,0.5), rgba(124,58,237,0.6) 60%, rgba(15,10,36,0.95))',
              boxShadow: '0 0 60px rgba(236,72,153,0.5), inset 0 0 30px rgba(255,255,255,0.1)',
            }}
          >
            {orbEmoji}
            {/* Saturn-style ring */}
            <div
              className="absolute w-[120%] h-3 rounded-full border-2 border-white/20"
              style={{ transform: 'rotateX(75deg)', boxShadow: '0 0 20px rgba(236,72,153,0.4)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default GalaxyHero
