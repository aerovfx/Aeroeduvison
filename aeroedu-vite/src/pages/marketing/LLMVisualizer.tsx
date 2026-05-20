/**
 * /free-courses/llm-mastery/visualize — Visualizing LLM Internals & Architecture
 *
 * Public page (không cần đăng nhập). Hành trình tương tác qua 6 section
 * giải thích nội tại của Large Language Models bằng SVG inline + React state.
 *
 * Cảm hứng từ (MIT-licensed reference, re-implemented from scratch):
 *   - github.com/bbycroft/llm-viz          (3D walk-through GPT)
 *   - github.com/poloclub/transformer-explainer (interactive transformer)
 *   - github.com/ajinkyakolhe112/Visualizations-for-LLM-Concepts (2D viz)
 *   - github.com/karpathy/minGPT + nanoGPT (architecture reference)
 *
 * 6 sections:
 *   1. Token Embedding   — 2D vector space, click cosine similarity
 *   2. Tokenization      — Live BPE-like demo, paste text → token pills
 *   3. Self-Attention    — 6×6 heatmap với formula
 *   4. Multi-Head        — 4 heads (Subject / Verb / Local / Global)
 *   5. Position Encoding — Sinusoidal sliders
 *   6. GPT Architecture  — Click block → param count, ▶ play forward pass
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Github, Sparkles, Zap, Hash, Network, Layers,
  Workflow, Cpu, Play, RotateCcw, Info, ExternalLink,
} from 'lucide-react'
import { MathText } from '@/components/common/MathText'

// ── Color palette ───────────────────────────────────────────────
const C = {
  bg:       '#0a0a14',
  bg2:      '#11122a',
  card:     '#161832',
  border:   'rgba(167,139,250,0.18)',
  borderHi: 'rgba(167,139,250,0.45)',
  text:     '#e8ecf5',
  muted:    '#8a92a5',
  purple:   '#a78bfa',
  cyan:     '#22d3ee',
  pink:     '#f472b6',
  emerald:  '#34d399',
  amber:    '#fbbf24',
  blue:     '#60a5fa',
}

const SECTIONS = [
  { id: 'embedding',    label: '1. Token Embedding',   icon: Sparkles, color: C.purple },
  { id: 'tokenization', label: '2. Tokenization',      icon: Hash,     color: C.cyan },
  { id: 'attention',    label: '3. Self-Attention',    icon: Network,  color: C.pink },
  { id: 'multihead',    label: '4. Multi-Head',        icon: Layers,   color: C.emerald },
  { id: 'position',     label: '5. Position Encoding', icon: Workflow, color: C.amber },
  { id: 'architecture', label: '6. GPT Architecture',  icon: Cpu,      color: C.blue },
] as const

// ════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════
export default function LLMVisualizer() {
  const [activeSec, setActiveSec] = useState<string>('embedding')

  // Update active section based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveSec(e.target.id)
            break
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      minHeight: '100vh',
      backgroundImage: `radial-gradient(ellipse at top, rgba(124,58,237,0.10) 0%, transparent 60%),
                        radial-gradient(ellipse at bottom right, rgba(34,211,238,0.08) 0%, transparent 60%)`,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <Header />

      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 24,
        padding: '0 16px',
      }}>
        {/* TOC sidebar — sticky on desktop, top on mobile */}
        <TOCSidebar active={activeSec} />

        <main style={{ display: 'grid', gap: 96, paddingTop: 24, paddingBottom: 96 }}>
          <Section1Embedding />
          <Section2Tokenization />
          <Section3Attention />
          <Section4MultiHead />
          <Section5PositionEnc />
          <Section6Architecture />
        </main>
      </div>

      <Footer />
    </div>
  )
}

// ── Header (sticky) ─────────────────────────────────────────────
function Header() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(10,10,20,0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <Link
          to="/free-courses/llm-mastery"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: C.muted, textDecoration: 'none', fontSize: 15,
          }}
        >
          <ArrowLeft size={16} /> Quay lại khoá học
        </Link>
        <div style={{
          height: 20, width: 1, background: C.border, margin: '0 4px',
        }} />
        <h1 style={{
          margin: 0, fontSize: 20, fontWeight: 700, color: C.text,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 24 }}>🔬</span>
          Visualizing LLM Internals & Architecture
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="https://github.com/bbycroft/llm-viz"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(167,139,250,0.10)',
              border: `1px solid ${C.border}`,
              color: C.purple, textDecoration: 'none',
              fontSize: 15, fontWeight: 600,
            }}
          >
            <Github size={14} /> bbycroft/llm-viz
          </a>
          <a
            href="https://github.com/karpathy/nanoGPT"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(34,211,238,0.10)',
              border: `1px solid ${C.border}`,
              color: C.cyan, textDecoration: 'none',
              fontSize: 15, fontWeight: 600,
            }}
          >
            <Github size={14} /> nanoGPT
          </a>
        </div>
      </div>
    </header>
  )
}

// ── TOC Sidebar ─────────────────────────────────────────────────
function TOCSidebar({ active }: { active: string }) {
  return (
    <nav
      aria-label="Table of contents"
      style={{
        position: 'sticky', top: 64, zIndex: 20,
        padding: '12px',
        background: 'rgba(22,24,50,0.85)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        margin: '16px 0 0',
        display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto',
      }}
    >
      {SECTIONS.map(s => {
        const isActive = active === s.id
        const Icon = s.icon
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: isActive ? `${s.color}20` : 'transparent',
              border: `1px solid ${isActive ? s.color + '60' : 'transparent'}`,
              color: isActive ? s.color : C.muted,
              textDecoration: 'none',
              fontSize: 15, fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} />
            {s.label}
          </a>
        )
      })}
    </nav>
  )
}

// ── Footer ──────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: '32px 16px',
      background: 'rgba(0,0,0,0.3)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', color: C.muted, fontSize: 15, lineHeight: 1.7 }}>
        <p style={{ margin: '0 0 8px' }}>
          Trang giáo dục mở dựa trên các dự án MIT-licensed sau (re-implemented in React + Tailwind):
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="https://github.com/bbycroft/llm-viz" target="_blank" rel="noreferrer"
             style={{ color: C.purple, textDecoration: 'none' }}>bbycroft/llm-viz <ExternalLink size={11} style={{ verticalAlign: '-2px' }}/></a>
          <a href="https://github.com/poloclub/transformer-explainer" target="_blank" rel="noreferrer"
             style={{ color: C.cyan, textDecoration: 'none' }}>poloclub/transformer-explainer <ExternalLink size={11} style={{ verticalAlign: '-2px' }}/></a>
          <a href="https://github.com/ajinkyakolhe112/Visualizations-for-LLM-Concepts" target="_blank" rel="noreferrer"
             style={{ color: C.pink, textDecoration: 'none' }}>ajinkyakolhe112/Visualizations-for-LLM-Concepts <ExternalLink size={11} style={{ verticalAlign: '-2px' }}/></a>
          <a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noreferrer"
             style={{ color: C.emerald, textDecoration: 'none' }}>karpathy/nanoGPT <ExternalLink size={11} style={{ verticalAlign: '-2px' }}/></a>
        </div>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
          © {new Date().getFullYear()} AeroEduVision — inphysic.com. Trang này tự xây từ đầu để giảng dạy phi lợi nhuận.
        </p>
      </div>
    </footer>
  )
}

// ════════════════════════════════════════════════════════════════
//  SECTION WRAPPER
// ════════════════════════════════════════════════════════════════
function SectionShell({
  id, emoji, title, subtitle, accent, children,
}: {
  id: string
  emoji: string
  title: string
  subtitle: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }}>
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        marginBottom: 32,
      }} />
      <header style={{ marginBottom: 24 }}>
        <h2 style={{
          margin: 0, fontSize: 30, fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 38 }}>{emoji}</span>
          <span style={{
            background: `linear-gradient(90deg, ${accent}, ${C.text})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {title}
          </span>
        </h2>
        <p style={{ margin: '8px 0 0', color: C.muted, fontSize: 17, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      </header>
      {children}
    </section>
  )
}

function TwoColumn({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
      gap: 24,
      alignItems: 'start',
    }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  SECTION 1 — TOKEN EMBEDDING (2D scatter)
// ════════════════════════════════════════════════════════════════

interface EmbWord {
  text: string
  group: 'animal' | 'emotion' | 'color'
  x: number   // SVG coords (0-400)
  y: number
  vec: [number, number, number, number]
}

const EMBED_WORDS: EmbWord[] = [
  // Animals — cluster top-left
  { text: 'chó',  group: 'animal',  x: 90,  y: 80,  vec: [0.82, -0.31,  0.15,  0.67] },
  { text: 'mèo',  group: 'animal',  x: 130, y: 60,  vec: [0.78, -0.28,  0.22,  0.71] },
  { text: 'cá',   group: 'animal',  x: 70,  y: 130, vec: [0.85, -0.41,  0.05,  0.59] },
  { text: 'chim', group: 'animal',  x: 145, y: 115, vec: [0.74, -0.25,  0.30,  0.65] },
  // Emotions — cluster bottom-right
  { text: 'vui',  group: 'emotion', x: 280, y: 290, vec: [-0.18,  0.71,  0.62,  0.21] },
  { text: 'buồn', group: 'emotion', x: 325, y: 270, vec: [-0.22,  0.74,  0.59,  0.18] },
  { text: 'giận', group: 'emotion', x: 290, y: 340, vec: [-0.15,  0.66,  0.71,  0.27] },
  { text: 'sợ',   group: 'emotion', x: 335, y: 325, vec: [-0.21,  0.75,  0.55,  0.22] },
  // Colors — cluster bottom-left
  { text: 'đỏ',   group: 'color',   x: 75,  y: 290, vec: [ 0.15, -0.15, -0.71,  0.68] },
  { text: 'xanh', group: 'color',   x: 125, y: 310, vec: [ 0.12, -0.18, -0.69,  0.72] },
  { text: 'vàng', group: 'color',   x: 80,  y: 345, vec: [ 0.18, -0.12, -0.74,  0.62] },
  { text: 'tím',  group: 'color',   x: 135, y: 360, vec: [ 0.20, -0.20, -0.66,  0.69] },
]

const GROUP_COLOR: Record<EmbWord['group'], string> = {
  animal:  C.purple,
  emotion: C.pink,
  color:   C.emerald,
}

const GROUP_LABEL: Record<EmbWord['group'], string> = {
  animal:  'Động vật',
  emotion: 'Cảm xúc',
  color:   'Màu sắc',
}

function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((s, ai, i) => s + ai * b[i], 0)
  const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0))
  const nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0))
  return dot / (na * nb)
}

function Section1Embedding() {
  const [hover, setHover] = useState<EmbWord | null>(null)
  const [selA, setSelA] = useState<EmbWord | null>(null)
  const [selB, setSelB] = useState<EmbWord | null>(null)

  const handleClick = (w: EmbWord) => {
    if (!selA) { setSelA(w); setSelB(null); return }
    if (selA === w) { setSelA(null); return }
    setSelB(w)
  }

  const sim = useMemo(() => {
    if (!selA || !selB) return null
    return cosineSim(selA.vec, selB.vec)
  }, [selA, selB])

  const pulse = (w: EmbWord): boolean => {
    if (!selA) return false
    if (w === selA) return true
    if (selB && w === selB) return true
    return false
  }

  return (
    <SectionShell
      id="embedding"
      emoji="✨"
      title="Token Embedding — Không gian vector từ ngữ"
      subtitle="Mỗi từ được mô hình hoá thành một vector. Từ có nghĩa tương tự thì vector gần nhau."
      accent={C.purple}
    >
      <TwoColumn
        left={
          <Card>
            <svg viewBox="0 0 400 400" width="100%" style={{ maxWidth: 500, display: 'block', margin: '0 auto', background: C.bg2, borderRadius: 12 }}>
              <defs>
                <radialGradient id="emb-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
                </radialGradient>
              </defs>

              {/* Axes */}
              <line x1="200" y1="20"  x2="200" y2="380" stroke="#ffffff14" strokeWidth="1"/>
              <line x1="20"  y1="200" x2="380" y2="200" stroke="#ffffff14" strokeWidth="1"/>
              <text x="384" y="196" fill={C.muted} fontSize="13">dim 1</text>
              <text x="204" y="20" fill={C.muted} fontSize="13">dim 2</text>

              {/* Cluster labels */}
              <text x="110" y="40"  fill={C.purple}  fontSize="14" fontWeight="700" opacity="0.8">Động vật</text>
              <text x="290" y="260" fill={C.pink}    fontSize="14" fontWeight="700" opacity="0.8">Cảm xúc</text>
              <text x="100" y="395" fill={C.emerald} fontSize="14" fontWeight="700" opacity="0.8">Màu sắc</text>

              {/* Selection line */}
              {selA && selB && (
                <line
                  x1={selA.x} y1={selA.y}
                  x2={selB.x} y2={selB.y}
                  stroke={C.amber}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
              )}

              {/* Words */}
              {EMBED_WORDS.map(w => {
                const isHover = hover === w
                const isPulse = pulse(w)
                const r = isHover ? 14 : 11
                return (
                  <g
                    key={w.text}
                    onMouseEnter={() => setHover(w)}
                    onMouseLeave={() => setHover(h => (h === w ? null : h))}
                    onClick={() => handleClick(w)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isPulse && (
                      <circle cx={w.x} cy={w.y} r={r + 8} fill={GROUP_COLOR[w.group]} opacity="0.25">
                        <animate attributeName="r" values={`${r+4};${r+14};${r+4}`} dur="1.4s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.4s" repeatCount="indefinite"/>
                      </circle>
                    )}
                    <circle
                      cx={w.x} cy={w.y} r={r}
                      fill={GROUP_COLOR[w.group]}
                      stroke={isPulse ? C.amber : 'transparent'}
                      strokeWidth={isPulse ? 2 : 0}
                      opacity={hover && !isHover && !isPulse ? 0.45 : 0.9}
                    />
                    <text
                      x={w.x} y={w.y + 4}
                      textAnchor="middle"
                      fontSize="14" fontWeight="700"
                      fill="#fff"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {w.text}
                    </text>
                  </g>
                )
              })}
            </svg>

            <p style={{ margin: '12px 0 0', fontSize: 15, color: C.muted, textAlign: 'center' }}>
              Hover từ để xem vector · Click 2 từ để tính cosine similarity
            </p>
          </Card>
        }
        right={
          <div style={{ display: 'grid', gap: 16 }}>
            <Card>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: C.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={16} /> Vector hiện tại
              </h3>
              {hover ? (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: GROUP_COLOR[hover.group], marginBottom: 4 }}>
                    "{hover.text}"
                  </div>
                  <div style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
                    Nhóm: {GROUP_LABEL[hover.group]}
                  </div>
                  <VectorBars vec={hover.vec} color={GROUP_COLOR[hover.group]} />
                  <code style={{
                    display: 'block', marginTop: 8,
                    fontSize: 14, color: C.text,
                    background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6,
                    fontFamily: 'monospace',
                  }}>
                    [{hover.vec.map(v => v.toFixed(2)).join(', ')}]
                  </code>
                </div>
              ) : (
                <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
                  Di chuột vào một từ trong sơ đồ để xem vector 4 chiều của nó.
                </p>
              )}
            </Card>

            <Card>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: C.amber, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} /> Cosine similarity
              </h3>
              <p style={{ margin: '0 0 8px', fontSize: 15, color: C.muted }}>
                Click 2 từ bất kỳ — công thức đo độ tương đồng giữa chúng:
              </p>
              <div style={{ marginBottom: 12, fontSize: 16 }}>
                <MathText display>{`$$\\cos(\\theta) = \\frac{\\vec{u} \\cdot \\vec{v}}{||\\vec{u}|| \\, ||\\vec{v}||}$$`}</MathText>
              </div>
              {selA && selB && sim !== null ? (
                <div style={{
                  padding: 12, borderRadius: 8,
                  background: 'rgba(251,191,36,0.10)',
                  border: `1px solid ${C.amber}50`,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 15 }}>
                    <span style={{ color: GROUP_COLOR[selA.group], fontWeight: 700 }}>{selA.text}</span>
                    <span style={{ color: C.muted }}>↔</span>
                    <span style={{ color: GROUP_COLOR[selB.group], fontWeight: 700 }}>{selB.text}</span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: C.amber }}>
                    {sim.toFixed(3)}
                  </div>
                  <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
                    {sim > 0.9 ? '→ Rất giống (cùng nhóm)' :
                     sim > 0.5 ? '→ Khá giống' :
                     sim > 0 ? '→ Hơi liên quan' :
                     sim > -0.5 ? '→ Ít liên quan' :
                     '→ Đối lập'}
                  </div>
                </div>
              ) : selA ? (
                <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
                  Đã chọn: <strong style={{ color: GROUP_COLOR[selA.group] }}>{selA.text}</strong> — click thêm 1 từ nữa.
                </p>
              ) : (
                <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>Chưa chọn từ nào.</p>
              )}
            </Card>
          </div>
        }
      />
    </SectionShell>
  )
}

function VectorBars({ vec, color }: { vec: number[]; color: string }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {vec.map((v, i) => {
        const w = Math.abs(v) * 100
        const positive = v >= 0
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <span style={{ color: C.muted, width: 28, fontFamily: 'monospace' }}>d{i}</span>
            <div style={{ flex: 1, position: 'relative', height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
              <div style={{
                position: 'absolute',
                left: '50%', top: 0, bottom: 0,
                width: `${w / 2}%`,
                transform: positive ? 'translateX(0)' : 'translateX(-100%)',
                background: positive ? color : `${color}99`,
                borderRadius: 3,
                transition: 'all 0.3s',
              }} />
              <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: C.muted, opacity: 0.4 }} />
            </div>
            <span style={{ color: positive ? color : C.muted, fontFamily: 'monospace', width: 44, textAlign: 'right' }}>
              {v.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  SECTION 2 — TOKENIZATION DEMO
// ════════════════════════════════════════════════════════════════

const DEFAULT_TEXT = 'Tôi yêu lập trình AI!'

const TOKEN_PALETTE = [
  C.purple, C.cyan, C.pink, C.emerald, C.amber, C.blue,
  '#fb7185', '#a3e635',
]

function hashCode(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i)
  return Math.abs(h)
}

function mockTokenize(text: string): { text: string; id: number; bytes: number; color: string }[] {
  const parts = text.split(/(\s+|[.,!?;:()/\-—])/g).filter(t => t)
  return parts.map(t => ({
    text: t,
    id: (hashCode(t) % 9000) + 1000,
    bytes: new TextEncoder().encode(t).length,
    color: TOKEN_PALETTE[hashCode(t) % TOKEN_PALETTE.length],
  }))
}

function Section2Tokenization() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const tokens = useMemo(() => mockTokenize(text), [text])

  const totalChars = text.length
  const totalBytes = useMemo(() => new TextEncoder().encode(text).length, [text])

  return (
    <SectionShell
      id="tokenization"
      emoji="#️⃣"
      title="Tokenization — Từ text thành token IDs"
      subtitle="Trước khi model hiểu, văn bản phải được tách thành các token và mỗi token gắn 1 mã số nguyên (BPE — Byte Pair Encoding)."
      accent={C.cyan}
    >
      <TwoColumn
        left={
          <Card>
            <label style={{ fontSize: 15, color: C.muted, marginBottom: 6, display: 'block', fontWeight: 600 }}>
              Văn bản đầu vào:
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                background: C.bg2,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 12,
                fontSize: 17,
                fontFamily: 'system-ui',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setText(DEFAULT_TEXT)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 6,
                  background: 'rgba(167,139,250,0.10)',
                  border: `1px solid ${C.border}`,
                  color: C.purple,
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={12} /> Reset
              </button>
              <button
                onClick={() => setText('GPT-4 có khoảng 1.76 nghìn tỷ tham số!')}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: 'rgba(34,211,238,0.10)',
                  border: `1px solid ${C.border}`,
                  color: C.cyan,
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Thử văn bản khác
              </button>
              <button
                onClick={() => setText('🚀 Học AI miễn phí tại inphysic.com!')}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: 'rgba(244,114,182,0.10)',
                  border: `1px solid ${C.border}`,
                  color: C.pink,
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Có emoji
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 15, color: C.muted, marginBottom: 8, fontWeight: 600 }}>
                Tokens ({tokens.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tokens.map((t, i) => (
                  <div
                    key={`${i}-${t.text}`}
                    style={{
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                      padding: '4px 10px', borderRadius: 6,
                      background: `${t.color}22`,
                      border: `1px solid ${t.color}66`,
                      fontFamily: 'monospace',
                      minWidth: 40,
                    }}
                  >
                    <span style={{ fontSize: 16, color: t.color, fontWeight: 700 }}>
                      {t.text === ' ' ? '␣' : t.text === '\n' ? '↵' : t.text}
                    </span>
                    <span style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {t.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 16, padding: 12,
              background: 'rgba(34,211,238,0.06)',
              border: `1px solid ${C.cyan}30`,
              borderRadius: 8,
              display: 'flex', gap: 24, flexWrap: 'wrap',
              fontSize: 15,
            }}>
              <div>
                <div style={{ color: C.muted, fontSize: 13 }}>Tokens</div>
                <div style={{ color: C.cyan, fontWeight: 700, fontSize: 20 }}>{tokens.length}</div>
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: 13 }}>Ký tự</div>
                <div style={{ color: C.purple, fontWeight: 700, fontSize: 20 }}>{totalChars}</div>
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: 13 }}>Bytes (UTF-8)</div>
                <div style={{ color: C.pink, fontWeight: 700, fontSize: 20 }}>{totalBytes}</div>
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: 13 }}>Chars/token</div>
                <div style={{ color: C.emerald, fontWeight: 700, fontSize: 20 }}>
                  {tokens.length ? (totalChars / tokens.length).toFixed(2) : '0'}
                </div>
              </div>
            </div>
          </Card>
        }
        right={
          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: C.cyan }}>BPE hoạt động ra sao?</h3>
            <ol style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 15, lineHeight: 1.7 }}>
              <li><strong>Khởi tạo:</strong> mỗi ký tự = 1 token.</li>
              <li><strong>Đếm cặp:</strong> tìm cặp xuất hiện nhiều nhất (vd: "th" trong tiếng Anh).</li>
              <li><strong>Hợp nhất:</strong> gộp cặp thành 1 token mới.</li>
              <li><strong>Lặp lại:</strong> N=32000 lần → vocab cuối cùng.</li>
            </ol>

            <hr style={{ margin: '16px 0', border: 0, borderTop: `1px solid ${C.border}` }} />

            <h4 style={{ margin: '0 0 8px', fontSize: 16, color: C.purple }}>Vocab size thường gặp</h4>
            <table style={{ width: '100%', fontSize: 15, color: C.text, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: 'left' }}>
                  <th style={{ padding: '4px 0' }}>Model</th>
                  <th style={{ padding: '4px 0' }}>Vocab</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 0' }}>GPT-2</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace', color: C.cyan }}>50,257</td>
                </tr>
                <tr style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 0' }}>GPT-3</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace', color: C.cyan }}>50,257</td>
                </tr>
                <tr style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 0' }}>GPT-4</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace', color: C.cyan }}>~100,000</td>
                </tr>
                <tr style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 0' }}>Llama 3</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace', color: C.cyan }}>128,000</td>
                </tr>
              </tbody>
            </table>

            <div style={{
              marginTop: 16, padding: 10,
              background: 'rgba(251,191,36,0.10)',
              border: `1px solid ${C.amber}40`,
              borderRadius: 6,
              fontSize: 14, color: C.amber, lineHeight: 1.6,
            }}>
              <strong>Lưu ý:</strong> demo ở trên dùng tokenizer mô phỏng (tách theo khoảng trắng + dấu câu). BPE thực sẽ tách "lập trình" thành ["lập", "trình"] hoặc thậm chí ["l", "ập", " trình"] tuỳ vocab.
            </div>
          </Card>
        }
      />
    </SectionShell>
  )
}

// ════════════════════════════════════════════════════════════════
//  SECTION 3 — SELF-ATTENTION HEATMAP
// ════════════════════════════════════════════════════════════════

const ATTN_TOKENS = ['Con', 'mèo', 'ngồi', 'trên', 'mái', 'nhà']

// Hand-crafted attention matrix demonstrating linguistic structure
//   rows = query, cols = key
//   high weights show what each token "attends to"
const ATTN_MATRIX: number[][] = [
  // Con   mèo   ngồi  trên  mái   nhà
  [0.45, 0.30, 0.05, 0.05, 0.05, 0.10], // Con → mèo (determiner→noun)
  [0.20, 0.50, 0.15, 0.04, 0.05, 0.06], // mèo → self + Con
  [0.05, 0.40, 0.20, 0.08, 0.12, 0.15], // ngồi → mèo (subject) + mái+nhà (location)
  [0.04, 0.06, 0.20, 0.15, 0.25, 0.30], // trên → mái nhà (preposition→object)
  [0.03, 0.06, 0.10, 0.10, 0.30, 0.41], // mái → nhà (compound noun)
  [0.05, 0.10, 0.18, 0.15, 0.32, 0.20], // nhà → mái (compound)
]

// Verify each row sums to 1 (softmax property)
function Section3Attention() {
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [hoverCol, setHoverCol] = useState<number | null>(null)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)

  const cellSize = 56
  const margin = 64
  const gridSize = ATTN_TOKENS.length * cellSize

  const heat = (v: number): string => {
    // Map 0..0.5 → purple gradient
    const t = Math.min(1, v / 0.5)
    // Lerp from #1a1d36 (cold) to #a78bfa (hot) via mid #6d28d9
    const r = Math.round(26 + (167 - 26) * t)
    const g = Math.round(29 + (139 - 29) * t)
    const b = Math.round(54 + (250 - 54) * t)
    return `rgb(${r},${g},${b})`
  }

  const activeRow = selectedRow ?? hoverRow

  return (
    <SectionShell
      id="attention"
      emoji="🧲"
      title="Self-Attention — Mỗi từ chú ý đến từ nào?"
      subtitle="Trong câu, mỗi token tính 'attention weight' với tất cả token khác. Đây là cốt lõi của Transformer."
      accent={C.pink}
    >
      <TwoColumn
        left={
          <Card>
            <svg
              viewBox={`0 0 ${margin + gridSize + 20} ${margin + gridSize + 20}`}
              width="100%"
              style={{ maxWidth: 560, display: 'block', margin: '0 auto' }}
            >
              {/* Column headers (keys) */}
              {ATTN_TOKENS.map((tok, c) => (
                <text
                  key={`col-${c}`}
                  x={margin + c * cellSize + cellSize / 2}
                  y={margin - 12}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight={hoverCol === c || activeRow === c ? 700 : 500}
                  fill={hoverCol === c ? C.pink : C.muted}
                >
                  {tok}
                </text>
              ))}
              {/* Subtitle for cols */}
              <text x={margin + gridSize / 2} y={margin - 32} textAnchor="middle"
                    fontSize="13" fill={C.muted} fontStyle="italic">
                Key (chú ý đến)
              </text>

              {/* Row labels (queries) */}
              {ATTN_TOKENS.map((tok, r) => (
                <text
                  key={`row-${r}`}
                  x={margin - 10}
                  y={margin + r * cellSize + cellSize / 2 + 4}
                  textAnchor="end"
                  fontSize="15"
                  fontWeight={activeRow === r ? 700 : 500}
                  fill={activeRow === r ? C.pink : C.muted}
                >
                  {tok}
                </text>
              ))}
              {/* Subtitle for rows */}
              <text
                x={20} y={margin + gridSize / 2}
                fontSize="13" fill={C.muted} fontStyle="italic"
                textAnchor="middle"
                transform={`rotate(-90 20 ${margin + gridSize / 2})`}
              >
                Query (từ đang xét)
              </text>

              {/* Cells */}
              {ATTN_MATRIX.map((row, r) =>
                row.map((v, c) => {
                  const isHL = activeRow === r
                  return (
                    <g
                      key={`${r}-${c}`}
                      onMouseEnter={() => { setHoverRow(r); setHoverCol(c) }}
                      onMouseLeave={() => { setHoverRow(null); setHoverCol(null) }}
                      onClick={() => setSelectedRow(selectedRow === r ? null : r)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={margin + c * cellSize}
                        y={margin + r * cellSize}
                        width={cellSize - 2}
                        height={cellSize - 2}
                        rx="6"
                        fill={heat(v)}
                        stroke={isHL ? C.pink : 'transparent'}
                        strokeWidth={isHL ? 2 : 0}
                        opacity={activeRow !== null && !isHL ? 0.35 : 1}
                      />
                      <text
                        x={margin + c * cellSize + cellSize / 2}
                        y={margin + r * cellSize + cellSize / 2 + 4}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="700"
                        fill={v > 0.25 ? '#fff' : C.muted}
                        style={{ pointerEvents: 'none' }}
                      >
                        {v.toFixed(2)}
                      </text>
                    </g>
                  )
                })
              )}
            </svg>
            <p style={{ margin: '12px 0 0', fontSize: 15, color: C.muted, textAlign: 'center' }}>
              Hover ô để highlight · Click hàng để xem công thức · Mỗi hàng softmax tổng = 1
            </p>
          </Card>
        }
        right={
          <div style={{ display: 'grid', gap: 16 }}>
            <Card>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: C.pink }}>Công thức Self-Attention</h3>
              <div style={{ marginBottom: 12 }}>
                <MathText display>{`$$\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right) V$$`}</MathText>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 15, lineHeight: 1.7 }}>
                <li><strong style={{ color: C.text }}>Q (Query)</strong> — câu hỏi của từ hiện tại</li>
                <li><strong style={{ color: C.text }}>K (Key)</strong> — "nhãn" của các từ khác</li>
                <li><strong style={{ color: C.text }}>V (Value)</strong> — nội dung được kéo về</li>
                <li><strong style={{ color: C.text }}>√d_k</strong> — chia để ổn định gradient</li>
              </ul>
            </Card>

            <Card>
              {activeRow !== null ? (
                <>
                  <h4 style={{ margin: '0 0 8px', fontSize: 16, color: C.pink }}>
                    Hàng: "{ATTN_TOKENS[activeRow]}"
                  </h4>
                  <p style={{ margin: '0 0 10px', fontSize: 15, color: C.muted, lineHeight: 1.6 }}>
                    Token <strong style={{ color: C.text }}>"{ATTN_TOKENS[activeRow]}"</strong> chú ý đến mỗi từ khác theo weights:
                  </p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {ATTN_MATRIX[activeRow].map((v, c) => (
                      <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                        <span style={{ width: 50, color: c === activeRow ? C.pink : C.text, fontWeight: c === activeRow ? 700 : 400 }}>
                          {ATTN_TOKENS[c]}
                        </span>
                        <div style={{
                          flex: 1, height: 10,
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 4, overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${v * 100 * 2}%`,
                            maxWidth: '100%',
                            height: '100%',
                            background: heat(v),
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ width: 36, textAlign: 'right', fontFamily: 'monospace', color: C.muted }}>
                          {v.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p style={{
                    margin: '12px 0 0', fontSize: 14, color: C.amber,
                    padding: 8,
                    background: 'rgba(251,191,36,0.08)',
                    borderRadius: 6,
                    lineHeight: 1.6,
                  }}>
                    💡 {explainRow(activeRow)}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.6 }}>
                  Click 1 hàng trong heatmap để xem chi tiết attention của từ đó với các từ còn lại.
                </p>
              )}
            </Card>
          </div>
        }
      />
    </SectionShell>
  )
}

function explainRow(r: number): string {
  switch (r) {
    case 0: return '"Con" là từ định ngữ — chú ý mạnh đến "mèo" (chủ thể nó định danh).'
    case 1: return '"mèo" chú ý nhiều đến chính nó (self) và "Con" (modifier).'
    case 2: return '"ngồi" là động từ — chú ý đến "mèo" (chủ ngữ) + "mái/nhà" (vị trí).'
    case 3: return '"trên" là giới từ — kéo trọng số mạnh về "mái" và "nhà" (cụm danh từ sau).'
    case 4: return '"mái" hợp với "nhà" thành cụm danh từ — chú ý mạnh tới "nhà".'
    case 5: return '"nhà" cũng quan hệ chặt với "mái" (cụm compound noun).'
    default: return ''
  }
}

// ════════════════════════════════════════════════════════════════
//  SECTION 4 — MULTI-HEAD ATTENTION
// ════════════════════════════════════════════════════════════════

const HEADS = [
  { name: 'Subject',  color: C.purple,  desc: 'Mỗi token chú ý mạnh tới chủ ngữ "mèo"' },
  { name: 'Verb',     color: C.cyan,    desc: 'Tất cả tập trung vào động từ "ngồi"' },
  { name: 'Local',    color: C.pink,    desc: 'Chú ý chủ yếu vào láng giềng (đường chéo)' },
  { name: 'Global',   color: C.emerald, desc: 'Trải đều — cung cấp ngữ cảnh rộng' },
] as const

// Generate 4 attention matrices with distinct "personalities"
function buildHeadMatrix(headIdx: number): number[][] {
  const N = ATTN_TOKENS.length
  const M: number[][] = []
  for (let r = 0; r < N; r++) {
    const row: number[] = []
    for (let c = 0; c < N; c++) {
      let v = 0
      switch (headIdx) {
        case 0: // Subject — attend to col 1 ("mèo")
          v = c === 1 ? 0.55 : (r === c ? 0.15 : 0.06)
          break
        case 1: // Verb — attend to col 2 ("ngồi")
          v = c === 2 ? 0.50 : (r === c ? 0.18 : 0.064)
          break
        case 2: // Local — diagonal heavy
          {
            const dist = Math.abs(r - c)
            v = dist === 0 ? 0.42 : dist === 1 ? 0.22 : dist === 2 ? 0.08 : 0.02
          }
          break
        case 3: // Global — uniform-ish
          v = 0.13 + (Math.sin((r + 1) * (c + 1) * 0.8) + 1) * 0.025
          break
      }
      row.push(v)
    }
    // Normalize row to sum to 1
    const s = row.reduce((a, b) => a + b, 0)
    M.push(row.map(x => x / s))
  }
  return M
}

const HEAD_MATRICES = [0, 1, 2, 3].map(buildHeadMatrix)

function Section4MultiHead() {
  const [selected, setSelected] = useState<number | 'all'>('all')

  return (
    <SectionShell
      id="multihead"
      emoji="🪟"
      title="Multi-Head Attention — Nhiều góc nhìn cùng lúc"
      subtitle="Transformer chia attention thành nhiều 'đầu', mỗi đầu học một kiểu quan hệ khác nhau (chủ ngữ, vị trí, ngữ cảnh xa,...)."
      accent={C.emerald}
    >
      <Card>
        {/* Tab selector */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap',
          padding: 4, background: C.bg2, borderRadius: 10,
        }}>
          <TabBtn
            active={selected === 'all'}
            label="Tất cả 4 heads"
            color={C.text}
            onClick={() => setSelected('all')}
          />
          {HEADS.map((h, i) => (
            <TabBtn
              key={i}
              active={selected === i}
              label={`Head ${i + 1}: ${h.name}`}
              color={h.color}
              onClick={() => setSelected(i)}
            />
          ))}
        </div>

        {selected === 'all' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
            gap: 16,
          }}>
            {HEAD_MATRICES.map((M, i) => (
              <SmallHeadCard key={i} matrix={M} head={HEADS[i]} idx={i} onSelect={() => setSelected(i)} />
            ))}
          </div>
        ) : (
          <SingleHeadView matrix={HEAD_MATRICES[selected]} head={HEADS[selected]} idx={selected} />
        )}
      </Card>
    </SectionShell>
  )
}

function TabBtn({ active, label, color, onClick }: { active: boolean; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        background: active ? `${color}25` : 'transparent',
        border: `1px solid ${active ? color + '60' : 'transparent'}`,
        color: active ? color : C.muted,
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function SmallHeadCard({ matrix, head, idx, onSelect }: { matrix: number[][]; head: typeof HEADS[number]; idx: number; onSelect: () => void }) {
  const N = ATTN_TOKENS.length
  const cell = 28
  const heatColor = (v: number, color: string): string => {
    const t = Math.min(1, v / 0.55)
    return `${color}${Math.round(t * 200 + 30).toString(16).padStart(2, '0')}`
  }

  return (
    <div
      onClick={onSelect}
      style={{
        background: C.bg2,
        border: `1px solid ${head.color}40`,
        borderRadius: 12, padding: 12,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: head.color }}>
          Head {idx + 1}: {head.name}
        </span>
        <span style={{ fontSize: 13, color: C.muted }}>Click xem chi tiết →</span>
      </div>
      <svg viewBox={`0 0 ${N * cell + 4} ${N * cell + 4}`} width="100%" style={{ maxWidth: 240, display: 'block', margin: '0 auto' }}>
        {matrix.map((row, r) =>
          row.map((v, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * cell + 2}
              y={r * cell + 2}
              width={cell - 2}
              height={cell - 2}
              rx="3"
              fill={heatColor(v, head.color)}
            />
          ))
        )}
      </svg>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: C.muted, lineHeight: 1.55 }}>
        {head.desc}
      </p>
    </div>
  )
}

function SingleHeadView({ matrix, head, idx }: { matrix: number[][]; head: typeof HEADS[number]; idx: number }) {
  const cellSize = 56
  const margin = 56
  const gridSize = ATTN_TOKENS.length * cellSize

  const heatColor = (v: number): string => {
    const t = Math.min(1, v / 0.55)
    const alpha = Math.round(t * 220 + 30).toString(16).padStart(2, '0')
    return `${head.color}${alpha}`
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
      gap: 24,
    }}>
      <div>
        <svg viewBox={`0 0 ${margin + gridSize + 10} ${margin + gridSize + 10}`} width="100%" style={{ maxWidth: 500, display: 'block' }}>
          {ATTN_TOKENS.map((tok, c) => (
            <text key={`c${c}`} x={margin + c * cellSize + cellSize / 2} y={margin - 10} textAnchor="middle"
                  fontSize="15" fill={C.muted}>{tok}</text>
          ))}
          {ATTN_TOKENS.map((tok, r) => (
            <text key={`r${r}`} x={margin - 8} y={margin + r * cellSize + cellSize / 2 + 4} textAnchor="end"
                  fontSize="15" fill={C.muted}>{tok}</text>
          ))}
          {matrix.map((row, r) =>
            row.map((v, c) => (
              <g key={`${r}-${c}`}>
                <rect
                  x={margin + c * cellSize}
                  y={margin + r * cellSize}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  rx="6"
                  fill={heatColor(v)}
                />
                <text
                  x={margin + c * cellSize + cellSize / 2}
                  y={margin + r * cellSize + cellSize / 2 + 4}
                  textAnchor="middle"
                  fontSize="14"
                  fill={v > 0.25 ? '#fff' : C.muted}
                  fontWeight="700"
                >
                  {v.toFixed(2)}
                </text>
              </g>
            ))
          )}
        </svg>
      </div>
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, color: head.color }}>
          Head {idx + 1}: {head.name}
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 15, color: C.text, lineHeight: 1.6 }}>
          {head.desc}.
        </p>

        <h4 style={{ margin: '12px 0 6px', fontSize: 15, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
          Vai trò trong transformer
        </h4>
        <p style={{ margin: 0, fontSize: 15, color: C.text, lineHeight: 1.6 }}>
          {headRole(idx)}
        </p>

        <div style={{
          marginTop: 16, padding: 12,
          background: `${head.color}10`,
          border: `1px solid ${head.color}30`,
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>Công thức multi-head</div>
          <MathText display>{`$$\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1, ..., \\text{head}_h) W^O$$`}</MathText>
        </div>

        <div style={{ marginTop: 12, fontSize: 14, color: C.muted }}>
          GPT-2 small: <span style={{ color: head.color, fontWeight: 700 }}>12 heads</span> × 12 layer = 144 attention patterns/forward pass
        </div>
      </div>
    </div>
  )
}

function headRole(i: number): string {
  return [
    'Đầu này học được quan hệ "chủ-vị" — mọi token đều liên kết về chủ ngữ. Nó giúp model biết "ai" đang làm hành động.',
    'Đầu này tập trung vào động từ trung tâm — quan trọng để xác định loại sự kiện và thời điểm xảy ra.',
    'Đầu này thiên về quan hệ cục bộ — học n-gram và collocations (ví dụ "mái nhà", "lập trình").',
    'Đầu này nhìn rộng — kéo thông tin từ toàn câu, giúp xử lý ngữ nghĩa toàn cục và coreference.',
  ][i]
}

// ════════════════════════════════════════════════════════════════
//  SECTION 5 — POSITION ENCODING
// ════════════════════════════════════════════════════════════════

function Section5PositionEnc() {
  const [dimI, setDimI] = useState(0)
  const [pos, setPos] = useState(8)
  const dModel = 16
  const maxPos = 32

  // Compute PE vector at current pos
  const peVec = useMemo(() => {
    const v: number[] = []
    for (let i = 0; i < dModel; i++) {
      const denom = Math.pow(10000, (2 * Math.floor(i / 2)) / dModel)
      v.push(i % 2 === 0 ? Math.sin(pos / denom) : Math.cos(pos / denom))
    }
    return v
  }, [pos])

  // Build curve data for sin & cos at chosen dimI
  const curveData = useMemo(() => {
    const denom = Math.pow(10000, (2 * dimI) / dModel)
    const sinPoints: { x: number; y: number }[] = []
    const cosPoints: { x: number; y: number }[] = []
    for (let p = 0; p <= maxPos; p += 0.25) {
      sinPoints.push({ x: p, y: Math.sin(p / denom) })
      cosPoints.push({ x: p, y: Math.cos(p / denom) })
    }
    return { sinPoints, cosPoints, denom }
  }, [dimI])

  const W = 360, H = 110
  const padding = 24
  const xScale = (x: number) => padding + (x / maxPos) * (W - 2 * padding)
  const yScale = (y: number) => padding + ((1 - y) / 2) * (H - 2 * padding)

  const sinPath = curveData.sinPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`).join(' ')
  const cosPath = curveData.cosPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`).join(' ')

  // Cursor markers on each curve
  const denom = curveData.denom
  const curSin = Math.sin(pos / denom)
  const curCos = Math.cos(pos / denom)

  return (
    <SectionShell
      id="position"
      emoji="🌊"
      title="Position Encoding — Cho mô hình biết thứ tự"
      subtitle="Transformer xử lý token song song nên không biết 'từ nào đứng trước'. Position Encoding thêm thông tin vị trí bằng sin/cos."
      accent={C.amber}
    >
      <TwoColumn
        left={
          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 17, color: C.amber }}>Curves sin / cos</h3>

            {/* Sin curve */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: C.cyan, marginBottom: 2 }}>sin(pos / 10000^(2i/d))</div>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: C.bg2, borderRadius: 8 }}>
                {/* Axes */}
                <line x1={padding} y1={H / 2} x2={W - padding} y2={H / 2} stroke="#ffffff20" />
                <line x1={padding} y1={padding} x2={padding} y2={H - padding} stroke="#ffffff20" />
                {/* Curve */}
                <path d={sinPath} fill="none" stroke={C.cyan} strokeWidth="2" />
                {/* Cursor */}
                <line x1={xScale(pos)} y1={padding} x2={xScale(pos)} y2={H - padding} stroke={C.amber} strokeDasharray="3 3" opacity="0.6"/>
                <circle cx={xScale(pos)} cy={yScale(curSin)} r="5" fill={C.amber} stroke="#fff" strokeWidth="1.5"/>
                {/* Labels */}
                <text x={W - padding} y={H / 2 + 14} fontSize="12" fill={C.muted} textAnchor="end">pos</text>
                <text x={padding + 4} y={padding - 4} fontSize="12" fill={C.muted}>+1</text>
                <text x={padding + 4} y={H - padding + 12} fontSize="12" fill={C.muted}>-1</text>
              </svg>
            </div>

            {/* Cos curve */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: C.pink, marginBottom: 2 }}>cos(pos / 10000^(2i/d))</div>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: C.bg2, borderRadius: 8 }}>
                <line x1={padding} y1={H / 2} x2={W - padding} y2={H / 2} stroke="#ffffff20" />
                <line x1={padding} y1={padding} x2={padding} y2={H - padding} stroke="#ffffff20" />
                <path d={cosPath} fill="none" stroke={C.pink} strokeWidth="2" />
                <line x1={xScale(pos)} y1={padding} x2={xScale(pos)} y2={H - padding} stroke={C.amber} strokeDasharray="3 3" opacity="0.6"/>
                <circle cx={xScale(pos)} cy={yScale(curCos)} r="5" fill={C.amber} stroke="#fff" strokeWidth="1.5"/>
              </svg>
            </div>

            {/* Sliders */}
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <SliderRow label="Dimension index i" value={dimI} min={0} max={dModel - 1} setValue={setDimI} color={C.cyan} />
              <SliderRow label="Position (token #)" value={pos} min={0} max={maxPos} setValue={setPos} color={C.amber} />
            </div>
          </Card>
        }
        right={
          <Card>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: C.amber }}>Vector PE tại position {pos}</h3>
            <p style={{ margin: '0 0 12px', fontSize: 15, color: C.muted }}>
              16 giá trị, xen kẽ sin/cos với các tần số khác nhau:
            </p>
            <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
              {peVec.map((v, i) => {
                const pct = (v + 1) / 2 // 0..1
                const isSin = i % 2 === 0
                const col = isSin ? C.cyan : C.pink
                return (
                  <div key={i} style={{
                    flex: 1, height: 80,
                    background: 'rgba(255,255,255,0.04)', borderRadius: 3,
                    position: 'relative', overflow: 'hidden',
                  }} title={`d${i}: ${v.toFixed(3)} (${isSin ? 'sin' : 'cos'})`}>
                    <div style={{
                      position: 'absolute',
                      bottom: '50%',
                      left: 0, right: 0,
                      height: `${Math.abs(pct - 0.5) * 100}%`,
                      transform: v < 0 ? 'translateY(100%)' : 'none',
                      background: col,
                      opacity: 0.8,
                    }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#fff', opacity: 0.15 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 13, color: C.muted, marginBottom: 16 }}>
              <span><span style={{ color: C.cyan }}>■</span> chẵn = sin</span>
              <span><span style={{ color: C.pink }}>■</span> lẻ = cos</span>
            </div>

            <h4 style={{ margin: '0 0 8px', fontSize: 16, color: C.purple }}>Công thức</h4>
            <div style={{ marginBottom: 8 }}>
              <MathText display>{`$$\\text{PE}(\\text{pos}, 2i) = \\sin\\!\\left(\\frac{\\text{pos}}{10000^{2i/d}}\\right)$$`}</MathText>
            </div>
            <div>
              <MathText display>{`$$\\text{PE}(\\text{pos}, 2i+1) = \\cos\\!\\left(\\frac{\\text{pos}}{10000^{2i/d}}\\right)$$`}</MathText>
            </div>

            <div style={{
              marginTop: 14, padding: 10,
              background: 'rgba(34,211,238,0.08)',
              border: `1px solid ${C.cyan}30`, borderRadius: 6,
              fontSize: 14, color: C.cyan, lineHeight: 1.6,
            }}>
              <strong>Vì sao dùng sin/cos?</strong> Mỗi dim có tần số khác nhau → mỗi vị trí có "vân tay" duy nhất. Sin/cos còn cho phép model học khoảng cách tương đối: PE(pos+k) là phép xoay tuyến tính của PE(pos).
            </div>
          </Card>
        }
      />
    </SectionShell>
  )
}

function SliderRow({ label, value, min, max, setValue, color }: {
  label: string; value: number; min: number; max: number; setValue: (v: number) => void; color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 4 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max}
        value={value}
        onChange={e => setValue(parseInt(e.target.value, 10))}
        style={{
          width: '100%',
          accentColor: color,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginTop: 1 }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  SECTION 6 — MINI GPT ARCHITECTURE
// ════════════════════════════════════════════════════════════════

interface ArchBlock {
  id: string
  label: string
  sub?: string
  color: string
  params: string
  paramsDetail: string
  desc: string
}

const ARCH_BLOCKS: ArchBlock[] = [
  {
    id: 'input', label: 'Input tokens', sub: '[token_1, token_2, ..., token_n]',
    color: C.muted, params: '0', paramsDetail: 'IDs nguyên — không có tham số học',
    desc: 'Chuỗi token IDs sau khi đã tokenize. Ví dụ: [464, 5710, 3290, ...]',
  },
  {
    id: 'embed', label: 'Token Embedding', sub: '50,257 × 768',
    color: C.purple, params: '38.6M', paramsDetail: '50,257 × 768 ≈ 38.6M',
    desc: 'Bảng tra cứu: mỗi token ID → vector 768 chiều. Đây là nơi "ý nghĩa" được nhúng.',
  },
  {
    id: 'posenc', label: '+ Position Encoding', sub: '1024 × 768',
    color: C.amber, params: '0.8M', paramsDetail: '1024 × 768 ≈ 0.79M (learned trong GPT-2)',
    desc: 'Cộng thông tin vị trí vào embedding. GPT-2 dùng learned positional embeddings (không phải sin/cos).',
  },
  {
    id: 'attn', label: 'Multi-Head Attention', sub: '12 heads · causal mask',
    color: C.pink, params: '2.4M/layer', paramsDetail: '4 × 768 × 768 ≈ 2.36M (Q, K, V, O projections)',
    desc: 'Trái tim của transformer. Causal mask đảm bảo token chỉ nhìn về phía trước (autoregressive).',
  },
  {
    id: 'ffn', label: 'Feed-Forward Network', sub: 'GELU · 768 → 3072 → 768',
    color: C.emerald, params: '4.7M/layer', paramsDetail: '2 × 768 × 3072 ≈ 4.72M',
    desc: 'MLP 2 lớp với hidden size 4x. Học non-linear transformations sau attention.',
  },
  {
    id: 'norm', label: 'LayerNorm + Residual', sub: '×2 trong mỗi block',
    color: C.cyan, params: '3K/layer', paramsDetail: '2 × 2 × 768 ≈ 3K (γ, β cho mỗi LN)',
    desc: 'Pre-LN (modern GPT) + skip connection giúp gradient ổn định trong mạng sâu.',
  },
  {
    id: 'output', label: 'Linear → Softmax', sub: '768 → 50,257',
    color: C.blue, params: '0 (tied)', paramsDetail: 'Weight tying với embedding — share 38.6M params',
    desc: 'Projection về vocab size + softmax cho phân phối xác suất token tiếp theo.',
  },
]

function Section6Architecture() {
  const [selected, setSelected] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [flowPos, setFlowPos] = useState(0) // 0..1
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const play = useCallback(() => {
    if (playing) return
    setPlaying(true)
    setFlowPos(0)
    startRef.current = performance.now()
    const tick = (t: number) => {
      const elapsed = (t - startRef.current) / 4000  // 4s total
      if (elapsed >= 1) {
        setFlowPos(1)
        setPlaying(false)
        rafRef.current = null
        return
      }
      setFlowPos(elapsed)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [playing])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  // Layout: blocks stacked vertically, with the transformer block (attn, ffn, norm) repeated
  // We'll show a simplified flow: input → embed → posenc → [attn + ffn + norm] xN → output
  const W = 380
  const blockH = 56
  const gap = 14
  const blocks = [
    { id: 'input',  y: 0,                 main: ARCH_BLOCKS[0] },
    { id: 'embed',  y: blockH + gap,      main: ARCH_BLOCKS[1] },
    { id: 'posenc', y: 2*(blockH + gap),  main: ARCH_BLOCKS[2] },
    // Transformer block container starts here
    { id: 'attn',   y: 3*(blockH + gap)+10, main: ARCH_BLOCKS[3] },
    { id: 'ffn',    y: 4*(blockH + gap)+10, main: ARCH_BLOCKS[4] },
    { id: 'norm',   y: 5*(blockH + gap)+10, main: ARCH_BLOCKS[5] },
    { id: 'output', y: 6*(blockH + gap)+24, main: ARCH_BLOCKS[6] },
  ]
  const totalH = blocks[blocks.length - 1].y + blockH + 32

  // Position of flowing dot
  const dotY = flowPos * (totalH - 20) + 10

  return (
    <SectionShell
      id="architecture"
      emoji="🏛️"
      title="GPT Architecture — Toàn cảnh kiến trúc"
      subtitle="Click vào từng block để xem mô tả và số tham số. Nhấn ▶ Play để xem dữ liệu chảy qua pipeline."
      accent={C.blue}
    >
      <TwoColumn
        left={
          <Card>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                onClick={play}
                disabled={playing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: playing ? 'rgba(96,165,250,0.15)' : C.blue,
                  border: `1px solid ${C.blue}80`,
                  color: playing ? C.blue : '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: playing ? 'not-allowed' : 'pointer',
                  opacity: playing ? 0.7 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <Play size={14} fill={playing ? 'transparent' : 'currentColor'} />
                {playing ? 'Đang chạy...' : 'Play forward pass'}
              </button>
              <button
                onClick={() => { setFlowPos(0); setPlaying(false); setSelected(null) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>

            <svg viewBox={`0 0 ${W} ${totalH}`} width="100%" style={{ maxWidth: 460, display: 'block', margin: '0 auto', background: C.bg2, borderRadius: 12 }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M0,0 L10,5 L0,10 Z" fill={C.muted} />
                </marker>
              </defs>

              {/* Transformer block container */}
              <rect
                x={20}
                y={blocks[3].y - 8}
                width={W - 40}
                height={blocks[5].y + blockH + 16 - blocks[3].y + 8}
                rx="14"
                fill="rgba(96,165,250,0.04)"
                stroke="rgba(96,165,250,0.3)"
                strokeDasharray="4 4"
              />
              <text x={W - 24} y={blocks[3].y - 12} textAnchor="end" fontSize="13" fill={C.blue} fontWeight="700">
                × N (N=12 cho GPT-2 small)
              </text>

              {/* Blocks */}
              {blocks.map((b, i) => {
                const isSel = selected === b.id
                return (
                  <g
                    key={b.id}
                    onClick={() => setSelected(s => s === b.id ? null : b.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={32}
                      y={b.y}
                      width={W - 64}
                      height={blockH}
                      rx="10"
                      fill={isSel ? `${b.main.color}30` : `${b.main.color}15`}
                      stroke={b.main.color}
                      strokeWidth={isSel ? 2 : 1}
                    />
                    <text x={W / 2} y={b.y + 22} textAnchor="middle" fontSize="15" fontWeight="700" fill={b.main.color}>
                      {b.main.label}
                    </text>
                    <text x={W / 2} y={b.y + 38} textAnchor="middle" fontSize="13" fill={C.muted}>
                      {b.main.sub}
                    </text>
                    <text x={W - 48} y={b.y + 22} textAnchor="end" fontSize="13" fill={C.amber} fontWeight="700">
                      {b.main.params}
                    </text>
                    {/* Arrow to next */}
                    {i < blocks.length - 1 && (
                      <line
                        x1={W / 2} y1={b.y + blockH}
                        x2={W / 2} y2={blocks[i + 1].y}
                        stroke={C.muted}
                        strokeWidth="1.5"
                        markerEnd="url(#arrow)"
                      />
                    )}
                  </g>
                )
              })}

              {/* Animated flowing dot */}
              {(playing || flowPos > 0) && flowPos < 1 && (
                <circle cx={W / 2} cy={dotY} r="6" fill={C.cyan}>
                  <animate attributeName="r" values="5;8;5" dur="0.6s" repeatCount="indefinite" />
                </circle>
              )}
            </svg>

            <p style={{ margin: '12px 0 0', fontSize: 14, color: C.muted, textAlign: 'center' }}>
              Click block để xem chi tiết · Số bên phải = param count
            </p>
          </Card>
        }
        right={
          <div style={{ display: 'grid', gap: 16 }}>
            <Card>
              {selected ? (
                (() => {
                  const b = ARCH_BLOCKS.find(x => x.id === selected)!
                  return (
                    <>
                      <h3 style={{ margin: '0 0 4px', fontSize: 20, color: b.color }}>{b.label}</h3>
                      {b.sub && <p style={{ margin: '0 0 12px', fontSize: 15, color: C.muted, fontFamily: 'monospace' }}>{b.sub}</p>}
                      <p style={{ margin: '0 0 14px', fontSize: 15, color: C.text, lineHeight: 1.6 }}>{b.desc}</p>
                      <div style={{
                        padding: 12,
                        background: `${b.color}10`,
                        border: `1px solid ${b.color}30`,
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>Số tham số</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: b.color, fontFamily: 'monospace' }}>
                          {b.params}
                        </div>
                        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
                          {b.paramsDetail}
                        </div>
                      </div>
                    </>
                  )
                })()
              ) : (
                <>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, color: C.blue }}>Tổng quan GPT-2 small</h3>
                  <table style={{ width: '100%', fontSize: 15, color: C.text, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: C.muted, textAlign: 'left' }}>
                        <th style={{ padding: '4px 0' }}>Thành phần</th>
                        <th style={{ padding: '4px 0', textAlign: 'right' }}>Params</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ARCH_BLOCKS.map(b => (
                        <tr key={b.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: '6px 0', color: b.color }}>{b.label}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>{b.params}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: `2px solid ${C.blue}` }}>
                        <td style={{ padding: '8px 0', fontWeight: 700, color: C.blue }}>Tổng (12 layers)</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: C.amber, fontFamily: 'monospace' }}>~124M</td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ margin: '14px 0 0', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                    Click vào block bên trái để xem chi tiết. Số 124M là tổng tham số GPT-2 small (gpt2). Các phiên bản lớn hơn: medium 345M, large 774M, xl 1.5B.
                  </p>
                </>
              )}
            </Card>

            <Card>
              <h4 style={{ margin: '0 0 8px', fontSize: 16, color: C.purple }}>So sánh các đời GPT</h4>
              <table style={{ width: '100%', fontSize: 15, color: C.text, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: 'left' }}>
                    <th style={{ padding: '4px 4px' }}>Model</th>
                    <th style={{ padding: '4px 4px', textAlign: 'right' }}>Layers</th>
                    <th style={{ padding: '4px 4px', textAlign: 'right' }}>d_model</th>
                    <th style={{ padding: '4px 4px', textAlign: 'right' }}>Params</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: 'monospace' }}>
                  <tr style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 4px' }}>GPT-2 small</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>12</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>768</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', color: C.cyan }}>124M</td>
                  </tr>
                  <tr style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 4px' }}>GPT-3</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>96</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>12288</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', color: C.cyan }}>175B</td>
                  </tr>
                  <tr style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 4px' }}>GPT-4</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>~120</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>~18K</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', color: C.cyan }}>~1.76T*</td>
                  </tr>
                  <tr style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 4px' }}>Llama 3 70B</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>80</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>8192</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', color: C.cyan }}>70B</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: C.muted }}>
                * GPT-4 là Mixture of Experts — tổng params ước tính, active params/forward thấp hơn.
              </p>
            </Card>

            <Card style={{ background: `linear-gradient(135deg, ${C.purple}15, ${C.cyan}15)` }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 16, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={16} color={C.amber} /> Tiếp theo học gì?
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, color: C.text, lineHeight: 1.8 }}>
                <li>Quay lại <Link to="/free-courses/llm-mastery" style={{ color: C.purple }}>khoá học LLM</Link> để học chi tiết</li>
                <li>Đọc paper "Attention Is All You Need" (2017)</li>
                <li>Tự cài <a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noreferrer" style={{ color: C.cyan }}>nanoGPT</a> và train từ đầu</li>
                <li>Xem bài <a href="https://www.youtube.com/watch?v=kCc8FmEb1nY" target="_blank" rel="noreferrer" style={{ color: C.pink }}>Karpathy "Let's build GPT"</a></li>
              </ul>
            </Card>
          </div>
        }
      />
    </SectionShell>
  )
}
