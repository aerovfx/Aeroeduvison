/**
 * IntelDashboard — worldmonitor.app-style intelligence panel grid
 * for the AeroEdu landing page.
 *
 * Aesthetic (ported from worldmonitor-main):
 *   • Monospace font stack (SF Mono / Cascadia Code)
 *   • Pure dark background (#0a0a0a) with 1px borders (#2a2a2a)
 *   • 40px top status bar with a live dot indicator + ticker
 *   • Grid of 4 dense panels, each 280-320px tall with header + body
 *   • Square corners, no rounded bezels — Bloomberg Terminal vibe
 *
 * AeroEdu palette overrides (replaces worldmonitor's green accents):
 *   • Cyan (#22d3ee)  — live data, camera AI, TP trực thuộc TW
 *   • Purple (#a78bfa) — AI services, tỉnh
 *   • Pink (#e879f9)   — critical events, alerts, landmarks
 *   • Green (#10b981)  — healthy status, OK
 *   • Amber (#f59e0b)  — warnings, news
 *
 * Panels (4):
 *   1. LivePanel          — live học sinh / lớp / camera AI counters
 *   2. ServicesStatusPanel — 11 AI module status grid
 *   3. NewsPanel          — Vietnam education news ticker
 *   4. ProvincesPanel     — 34 đơn vị hành chính 2025 với mergedFrom info
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera, Brain, Atom, FileText, Heart, Activity,
  TrendingUp, FlaskConical, BarChart3, BookOpen, Zap,
  Radio, Bell, MapPin,
} from 'lucide-react'
import { VN_PROVINCES_2025, type VNProvince2025 } from '@/config/vietnam-provinces-2025'

/* ──────────────────────────────────────────────────────────────
   Design tokens — AeroEdu-flavoured worldmonitor theme
────────────────────────────────────────────────────────────── */
const T = {
  bg:          '#0a0a0a',
  bgSecondary: '#111111',
  surface:     '#141414',
  surfaceHover:'#1e1e1e',
  border:      '#2a2a2a',
  borderStrong:'#3a3a3a',
  borderSubtle:'#1a1a1a',
  text:        '#e8e8e8',
  textDim:     '#888',
  textMuted:   '#666',
  cyan:        '#22d3ee',
  purple:      '#a78bfa',
  pink:        '#e879f9',
  green:       '#10b981',
  amber:       '#f59e0b',
  red:         '#ef4444',
  blue:        '#3b82f6',
  cyanA:  (a: number) => `rgba(34, 211, 238, ${a})`,
  purpleA:(a: number) => `rgba(167, 139, 250, ${a})`,
  pinkA:  (a: number) => `rgba(232, 121, 249, ${a})`,
  greenA: (a: number) => `rgba(16, 185, 129, ${a})`,
  font:   "'SF Mono', 'Monaco', 'Cascadia Code', 'Fira Code', 'DejaVu Sans Mono', monospace",
}

/* ══════════════════════════════════════════════════════════════
   Panel shell — reusable
══════════════════════════════════════════════════════════════ */
interface PanelShellProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  accent?: string
  children: React.ReactNode
  /** Right-aligned badge in the header (e.g., "LIVE") */
  badge?: { label: string; color: string }
}

function PanelShell({ title, subtitle, icon, accent = T.cyan, children, badge }: PanelShellProps) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 320,
      fontFamily: T.font,
    }}>
      {/* Header */}
      <div style={{
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: `1px solid ${T.borderSubtle}`,
        background: T.bgSecondary,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {icon && <span style={{ color: accent, display: 'flex' }}>{icon}</span>}
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
            color: accent, textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>{title}</span>
          {subtitle && (
            <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 4 }}>· {subtitle}</span>
          )}
        </div>
        {badge && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '2px 6px',
            border: `1px solid ${badge.color}`,
            fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
            color: badge.color, textTransform: 'uppercase',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: badge.color,
              animation: 'intelPulse 1.6s ease-in-out infinite',
            }} />
            {badge.label}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: 10, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   1. LivePanel — real-time counters + sparklines
══════════════════════════════════════════════════════════════ */
interface LiveMetric {
  label: string
  color: string
  icon: React.ReactNode
  baseValue: number
  suffix?: string
  /** Range of tick jitter */
  jitter: number
}

const LIVE_METRICS: LiveMetric[] = [
  { label: 'Học sinh online',   color: T.cyan,   icon: <Activity size={11} />, baseValue: 3705, jitter: 12 },
  { label: 'Lớp đang dạy',      color: T.purple, icon: <Radio size={11} />,    baseValue:   48, jitter: 1 },
  { label: 'Camera AI stream',  color: T.cyan,   icon: <Camera size={11} />,   baseValue:  512, jitter: 3 },
  { label: 'Lab 3D đang chạy',  color: T.green,  icon: <Atom size={11} />,     baseValue:   87, jitter: 2 },
  { label: 'Câu AI trả lời/h',  color: T.purple, icon: <Brain size={11} />,    baseValue: 1248, jitter: 8 },
  { label: 'Bài thi đang chấm', color: T.amber,  icon: <FileText size={11} />, baseValue:   34, jitter: 1 },
]

function useTickingValue(base: number, jitter: number, intervalMs = 2000): number {
  const [v, setV] = useState(base)
  useEffect(() => {
    const id = setInterval(() => {
      const delta = Math.round((Math.random() - 0.45) * jitter * 2)
      setV((prev) => Math.max(0, prev + delta))
    }, intervalMs)
    return () => clearInterval(id)
  }, [base, jitter, intervalMs])
  return v
}

function Sparkline({ color, points = 16 }: { color: string; points?: number }) {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: points }, () => Math.random() * 0.6 + 0.2)
  )
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => [...prev.slice(1), Math.random() * 0.6 + 0.2])
    }, 1500)
    return () => clearInterval(id)
  }, [points])

  const w = 100
  const h = 16
  const path = data
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / (points - 1)) * w},${h - y * h}`)
    .join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
         style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1} opacity={0.85} />
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
    </svg>
  )
}

function LiveMetricRow({ m }: { m: LiveMetric }) {
  const v = useTickingValue(m.baseValue, m.jitter)
  return (
    <div style={{
      padding: '8px 0',
      borderBottom: `1px solid ${T.borderSubtle}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textDim, fontSize: 10 }}>
          <span style={{ color: m.color, display: 'flex' }}>{m.icon}</span>
          {m.label}
        </div>
        <span style={{ color: m.color, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {v.toLocaleString('vi-VN')}{m.suffix || ''}
        </span>
      </div>
      <Sparkline color={m.color} />
    </div>
  )
}

function LivePanel() {
  return (
    <PanelShell
      title="Live stream"
      subtitle="Cập nhật mỗi 2s"
      icon={<Activity size={12} />}
      accent={T.cyan}
      badge={{ label: 'LIVE', color: T.green }}
    >
      <div>
        {LIVE_METRICS.map((m) => <LiveMetricRow key={m.label} m={m} />)}
      </div>
    </PanelShell>
  )
}

/* ══════════════════════════════════════════════════════════════
   2. ServicesStatusPanel — 11 AI module status grid
══════════════════════════════════════════════════════════════ */
interface Service {
  name: string
  short: string
  icon: React.ReactNode
  status: 'live' | 'degraded' | 'offline'
  latency: number
  accent: string
}

const SERVICES: Service[] = [
  { name: 'Camera AI',           short: 'cam-ai',    icon: <Camera size={10} />,       status: 'live',     latency:  42, accent: T.cyan },
  { name: 'AI Gia sư',           short: 'ai-tutor',  icon: <Brain size={10} />,        status: 'live',     latency: 128, accent: T.purple },
  { name: 'Lab 3D tương tác',    short: 'lab-3d',    icon: <Atom size={10} />,         status: 'live',     latency:  67, accent: T.green },
  { name: 'Thi trực tuyến AI',   short: 'exam-ai',   icon: <FileText size={10} />,     status: 'live',     latency:  89, accent: T.amber },
  { name: 'Bản đồ cảm xúc',      short: 'emotion',   icon: <Heart size={10} />,        status: 'degraded', latency: 312, accent: T.pink },
  { name: 'Môi trường IoT',      short: 'iot-env',   icon: <Activity size={10} />,     status: 'live',     latency:  23, accent: T.blue },
  { name: 'Học thích nghi',      short: 'adaptive',  icon: <TrendingUp size={10} />,   status: 'live',     latency: 145, accent: T.cyan },
  { name: 'Số hoá tài liệu',     short: 'doc-ocr',   icon: <FlaskConical size={10} />, status: 'live',     latency: 198, accent: T.green },
  { name: 'Phân tích sâu',       short: 'analytics', icon: <BarChart3 size={10} />,    status: 'live',     latency:  55, accent: T.purple },
  { name: 'Thư viện bài giảng',  short: 'library',   icon: <BookOpen size={10} />,     status: 'live',     latency:  31, accent: T.cyan },
  { name: 'Realtime feed',       short: 'rt-feed',   icon: <Zap size={10} />,          status: 'live',     latency:  18, accent: T.amber },
]

function StatusDot({ status }: { status: Service['status'] }) {
  const color = status === 'live' ? T.green : status === 'degraded' ? T.amber : T.red
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
      background: color, boxShadow: `0 0 6px ${color}`,
      animation: status === 'live' ? 'intelPulse 1.6s ease-in-out infinite' : undefined,
    }} />
  )
}

function ServicesStatusPanel() {
  const liveCount = SERVICES.filter((s) => s.status === 'live').length
  return (
    <PanelShell
      title="11 Dịch vụ AI"
      subtitle={`${liveCount}/${SERVICES.length} operational`}
      icon={<Brain size={12} />}
      accent={T.purple}
      badge={{ label: 'OPS', color: T.green }}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr', gap: 0,
      }}>
        {SERVICES.map((s) => (
          <div key={s.short} style={{
            display: 'grid',
            gridTemplateColumns: '14px 1fr auto auto',
            alignItems: 'center',
            gap: 8,
            padding: '6px 2px',
            borderBottom: `1px solid ${T.borderSubtle}`,
            fontSize: 10,
          }}>
            <span style={{ color: s.accent, display: 'flex' }}>{s.icon}</span>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.name}
              </div>
              <div style={{ color: T.textMuted, fontSize: 9 }}>/{s.short}</div>
            </div>
            <span style={{
              fontSize: 9, color: T.textDim, fontVariantNumeric: 'tabular-nums',
              padding: '1px 5px', background: T.surfaceHover, border: `1px solid ${T.borderSubtle}`,
            }}>
              {s.latency}ms
            </span>
            <StatusDot status={s.status} />
          </div>
        ))}
      </div>
    </PanelShell>
  )
}

/* ══════════════════════════════════════════════════════════════
   3. NewsPanel — Vietnam education news ticker
══════════════════════════════════════════════════════════════ */
interface NewsItem {
  time: string
  tag: string
  title: string
  tagColor: string
}

const NEWS: NewsItem[] = [
  { time: '10:42', tag: 'MOET',   title: 'Công bố danh sách trường THPT được tổ chức thi riêng 2026', tagColor: T.cyan },
  { time: '10:15', tag: 'THI',    title: 'Lịch thi THPT Quốc gia 2026: 28-30/6, 5 môn thi bắt buộc',  tagColor: T.amber },
  { time: '09:58', tag: 'AI',     title: 'Ra mắt 50+ Lab 3D Khí động học, Hoá học trên AeroEdu',       tagColor: T.purple },
  { time: '09:33', tag: 'POLICY', title: 'Sáp nhập 63 tỉnh → 34 đơn vị: tác động đến mã trường',       tagColor: T.pink },
  { time: '09:10', tag: 'EDTECH', title: 'Camera AI đã triển khai tại 500+ trường học toàn quốc',      tagColor: T.cyan },
  { time: '08:45', tag: 'STEM',   title: 'Cuộc thi Robotics VN 2026 mở đăng ký đến 15/5',              tagColor: T.green },
  { time: '08:22', tag: 'MOET',   title: 'Chương trình GDPT 2018 điều chỉnh Vật lý lớp 12',            tagColor: T.cyan },
  { time: '08:01', tag: 'AI',     title: 'Bản đồ cảm xúc AI phát hiện sớm HS cần hỗ trợ tâm lý',       tagColor: T.pink },
  { time: '07:38', tag: 'THI',    title: 'Bộ GD&ĐT dự kiến tích hợp câu hỏi thực tế vào đề thi',       tagColor: T.amber },
  { time: '07:14', tag: 'EDTECH', title: 'IoT trong phòng lab: 12,000+ cảm biến hoạt động',            tagColor: T.blue },
]

function NewsPanel() {
  return (
    <PanelShell
      title="Bản tin giáo dục VN"
      subtitle="Aero Intel Feed"
      icon={<Bell size={12} />}
      accent={T.amber}
      badge={{ label: 'FEED', color: T.amber }}
    >
      <div>
        {NEWS.map((n, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8,
            padding: '7px 0',
            borderBottom: `1px solid ${T.borderSubtle}`,
            fontSize: 11,
          }}>
            <span style={{
              color: T.textMuted, fontSize: 10, fontVariantNumeric: 'tabular-nums',
              minWidth: 36, flexShrink: 0,
            }}>
              {n.time}
            </span>
            <span style={{
              color: n.tagColor, fontSize: 9, fontWeight: 700,
              padding: '0 5px',
              border: `1px solid ${n.tagColor}`,
              minWidth: 42, textAlign: 'center',
              height: 14, lineHeight: '13px',
              flexShrink: 0, letterSpacing: 0.4,
            }}>
              {n.tag}
            </span>
            <span style={{ color: T.text, lineHeight: 1.4 }}>
              {n.title}
            </span>
          </div>
        ))}
      </div>
    </PanelShell>
  )
}

/* ══════════════════════════════════════════════════════════════
   4. ProvincesPanel — 34 đơn vị hành chính 2025
══════════════════════════════════════════════════════════════ */
function ProvincesPanel() {
  const [selected, setSelected] = useState<VNProvince2025 | null>(null)
  const [filter, setFilter] = useState<'all' | 'central-city' | 'province'>('all')

  const list = useMemo(() => {
    return filter === 'all'
      ? VN_PROVINCES_2025
      : VN_PROVINCES_2025.filter((p) => p.kind === filter)
  }, [filter])

  const centralCount = VN_PROVINCES_2025.filter((p) => p.kind === 'central-city').length
  const provCount    = VN_PROVINCES_2025.filter((p) => p.kind === 'province').length

  return (
    <PanelShell
      title="34 Đơn vị HC 2025"
      subtitle={`${centralCount} TP TW · ${provCount} tỉnh`}
      icon={<MapPin size={12} />}
      accent={T.pink}
      badge={{ label: 'GEO', color: T.pink }}
    >
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[
          { k: 'all',          label: 'Tất cả',   c: T.text   },
          { k: 'central-city', label: 'TP TW',    c: T.cyan   },
          { k: 'province',     label: 'Tỉnh',     c: T.purple },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k as typeof filter)}
            style={{
              flex: 1,
              padding: '4px 0', fontSize: 9, fontFamily: T.font,
              letterSpacing: 0.5, textTransform: 'uppercase',
              background: filter === tab.k ? T.surfaceHover : 'transparent',
              color: filter === tab.k ? tab.c : T.textMuted,
              border: `1px solid ${filter === tab.k ? tab.c : T.border}`,
              cursor: 'pointer', fontWeight: 700,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body: either grid of all or detail of selected */}
      {selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            style={{
              fontSize: 10, color: T.textDim, background: 'transparent',
              border: `1px solid ${T.border}`, padding: '3px 8px',
              cursor: 'pointer', marginBottom: 8, fontFamily: T.font,
            }}
          >
            ← Quay lại danh sách
          </button>

          <div style={{
            padding: 10, border: `1px solid ${selected.kind === 'central-city' ? T.cyan : T.purple}`,
            background: T.bgSecondary,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2,
            }}>
              {selected.name}
            </div>
            <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10 }}>
              {selected.kind === 'central-city' ? 'Thành phố trực thuộc TW' : 'Tỉnh'}
              {' · '}TT: {selected.capital}
              {' · '}<span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {selected.lat.toFixed(2)}°N, {selected.lon.toFixed(2)}°E
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {selected.areaKm2 != null && (
                <div>
                  <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Diện tích
                  </div>
                  <div style={{ fontSize: 13, color: T.cyan, fontWeight: 700 }}>
                    {selected.areaKm2.toLocaleString('vi-VN')} km²
                  </div>
                </div>
              )}
              {selected.populationM != null && (
                <div>
                  <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Dân số
                  </div>
                  <div style={{ fontSize: 13, color: T.purple, fontWeight: 700 }}>
                    {selected.populationM.toFixed(1)}M
                  </div>
                </div>
              )}
            </div>

            <div style={{
              fontSize: 9, color: T.textMuted, textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: 4,
            }}>
              Sáp nhập từ {selected.mergedFrom.length} đơn vị cũ
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {selected.mergedFrom.map((m) => (
                <span key={m} style={{
                  fontSize: 10, color: T.pink,
                  padding: '2px 6px', border: `1px solid ${T.pinkA(0.4)}`,
                  background: T.pinkA(0.05),
                }}>
                  {m}
                </span>
              ))}
            </div>

            {selected.description && (
              <div style={{
                fontSize: 11, color: T.textDim, lineHeight: 1.5,
                borderTop: `1px solid ${T.borderSubtle}`, paddingTop: 8,
              }}>
                {selected.description}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: 4,
        }}>
          {list.map((p) => {
            const color = p.kind === 'central-city' ? T.cyan : T.purple
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                title={`${p.name} · sáp nhập ${p.mergedFrom.length}`}
                style={{
                  padding: '6px 6px',
                  background: T.bgSecondary,
                  border: `1px solid ${T.border}`,
                  borderLeft: `2px solid ${color}`,
                  color: T.text,
                  fontFamily: T.font, fontSize: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 120ms, border-color 120ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.surfaceHover
                  e.currentTarget.style.borderColor = color
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.bgSecondary
                  e.currentTarget.style.borderColor = T.border
                  e.currentTarget.style.borderLeftColor = color
                }}
              >
                <div style={{
                  fontWeight: 700,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {p.name}
                </div>
                <div style={{
                  fontSize: 9, color: T.textMuted, marginTop: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ⟵ {p.mergedFrom.length}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </PanelShell>
  )
}

/* ══════════════════════════════════════════════════════════════
   Top status bar — worldmonitor-style 40px header
══════════════════════════════════════════════════════════════ */
function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  const tickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })
  const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 40, padding: '0 16px',
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      fontFamily: T.font, fontSize: 11, color: T.text,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          fontWeight: 800, letterSpacing: 1,
          background: `linear-gradient(90deg, ${T.cyan}, ${T.purple})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          AERO·EDU·INTEL
        </span>
        <span style={{ color: T.borderStrong }}>|</span>
        <span style={{ fontSize: 10, color: T.textDim, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: T.green,
            boxShadow: `0 0 8px ${T.green}`,
            animation: 'intelPulse 1.6s ease-in-out infinite',
          }} />
          LIVE
        </span>
        <span style={{ color: T.borderStrong }}>|</span>
        <span style={{ fontSize: 10, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
          {date} · {time} <span style={{ color: T.textMuted }}>ICT</span>
        </span>
      </div>

      {/* Ticker (horizontal scroll) */}
      <div ref={tickerRef} style={{
        flex: 1, minWidth: 0, overflow: 'hidden', margin: '0 20px',
        display: 'flex',
      }}>
        <div style={{
          display: 'flex', gap: 24,
          animation: 'intelTicker 60s linear infinite',
          whiteSpace: 'nowrap', fontSize: 10, color: T.textDim,
        }}>
          {[
            <span key="1">📡 <b style={{ color: T.cyan }}>3.7K</b> HS online</span>,
            <span key="2">🎥 <b style={{ color: T.cyan }}>512</b> camera</span>,
            <span key="3">🧠 <b style={{ color: T.purple }}>11/11</b> AI ops</span>,
            <span key="4">🗺️ <b style={{ color: T.pink }}>34</b> đơn vị HC 2025</span>,
            <span key="5">🏛️ <b style={{ color: T.cyan }}>6</b> TP TW · <b style={{ color: T.purple }}>28</b> tỉnh</span>,
            <span key="6">⚗️ <b style={{ color: T.green }}>87</b> Lab 3D chạy</span>,
            <span key="7">🎓 <b style={{ color: T.amber }}>50+</b> Lab có sẵn</span>,
            <span key="8">📊 <b style={{ color: T.cyan }}>98.2%</b> AI accuracy</span>,
          ].concat([
            <span key="9">📡 <b style={{ color: T.cyan }}>3.7K</b> HS online</span>,
            <span key="10">🎥 <b style={{ color: T.cyan }}>512</b> camera</span>,
            <span key="11">🧠 <b style={{ color: T.purple }}>11/11</b> AI ops</span>,
            <span key="12">🗺️ <b style={{ color: T.pink }}>34</b> đơn vị HC 2025</span>,
          ])}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 10, color: T.textDim,
          padding: '3px 8px', border: `1px solid ${T.border}`,
        }}>
          v2026.04
        </span>
        <span style={{
          fontSize: 10, color: T.green, fontWeight: 700,
          padding: '3px 8px', border: `1px solid ${T.green}`,
        }}>
          API·OK
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Root — IntelDashboard
══════════════════════════════════════════════════════════════ */
export default function IntelDashboard() {
  return (
    <section style={{
      background: T.bg,
      fontFamily: T.font,
      color: T.text,
      borderTop: `1px solid ${T.border}`,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <style>{`
        @keyframes intelPulse {
          0%, 100% { opacity: 1;   transform: scale(1);   }
          50%      { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes intelTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .intel-dashboard-grid::-webkit-scrollbar { width: 6px; }
        .intel-dashboard-grid::-webkit-scrollbar-thumb { background: ${T.border}; }
        .intel-dashboard-grid *::-webkit-scrollbar { width: 6px; height: 6px; }
        .intel-dashboard-grid *::-webkit-scrollbar-thumb { background: ${T.border}; }
        .intel-dashboard-grid *::-webkit-scrollbar-track { background: ${T.bg}; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <StatusBar />

        {/* Section label + summary */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          padding: '20px 16px 14px',
          borderBottom: `1px solid ${T.borderSubtle}`,
        }}>
          <div>
            <div style={{
              fontSize: 10, color: T.cyan, letterSpacing: 1.2, fontWeight: 700,
              textTransform: 'uppercase', marginBottom: 4,
            }}>
              AeroEdu Intel · Live dashboard
            </div>
            <h2 style={{
              fontSize: 22, fontWeight: 800, color: T.text, fontFamily: T.font,
              letterSpacing: 0.3,
            }}>
              Trạng thái hệ thống & giáo dục Việt Nam thời gian thực
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 10, color: T.textDim }}>
            <div>
              <div style={{ color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 9 }}>
                Cập nhật
              </div>
              <div style={{ color: T.green, fontWeight: 700, fontSize: 12 }}>Real-time</div>
            </div>
            <div>
              <div style={{ color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 9 }}>
                Nguồn
              </div>
              <div style={{ color: T.cyan, fontWeight: 700, fontSize: 12 }}>8 feeds</div>
            </div>
            <div>
              <div style={{ color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 9 }}>
                Uptime
              </div>
              <div style={{ color: T.purple, fontWeight: 700, fontSize: 12 }}>99.97%</div>
            </div>
          </div>
        </div>

        {/* Panel grid */}
        <div
          className="intel-dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 1,
            padding: 16,
            background: T.bg,
          }}
        >
          <LivePanel />
          <ServicesStatusPanel />
          <NewsPanel />
          <ProvincesPanel />
        </div>

        {/* Footer strip */}
        <div style={{
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: `1px solid ${T.borderSubtle}`,
          fontSize: 10, color: T.textMuted, flexWrap: 'wrap', gap: 8,
        }}>
          <span>
            Inspired by <span style={{ color: T.cyan }}>worldmonitor.app</span> —
            AeroEdu Intel · © 2026 · Dữ liệu demo
          </span>
          <span style={{ display: 'flex', gap: 10 }}>
            <span><span style={{ color: T.green }}>●</span> LIVE</span>
            <span><span style={{ color: T.amber }}>●</span> CACHED</span>
            <span><span style={{ color: T.red }}>●</span> DOWN</span>
          </span>
        </div>
      </div>
    </section>
  )
}
