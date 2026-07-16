/**
 * AeroEdu Vision — Desktop App UI kit
 * ─────────────────────────────────────────────────────────────────
 * Ported từ handoff Claude Design ("AeroEdu Desktop.dc.html").
 * Ngôn ngữ: dark glassmorphism + tím indigo, cửa sổ desktop (macOS chrome).
 *
 * Đây là bộ UI ĐỘC LẬP (standalone) — không đụng tới các trang production.
 * Tất cả 9 màn (3a, 2a–2h) dùng chung shell + sidebar + topbar ở đây.
 */
import { CSSProperties, ReactNode } from 'react'

/* ── Design tokens ─────────────────────────────────────────────── */
export const C = {
  pageBg: '#07080d',
  screenBg: '#0c0d14',
  scanPaper: '#e9e4d8',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.09)',
  hair: 'rgba(255,255,255,0.04)',
  surface: 'rgba(255,255,255,0.02)',
  surfaceSoft: 'rgba(255,255,255,0.015)',
  // text
  t92: 'rgba(255,255,255,0.92)',
  t90: 'rgba(255,255,255,0.9)',
  t88: 'rgba(255,255,255,0.88)',
  t85: 'rgba(255,255,255,0.85)',
  t75: 'rgba(255,255,255,0.75)',
  t70: 'rgba(255,255,255,0.7)',
  t65: 'rgba(255,255,255,0.65)',
  t60: 'rgba(255,255,255,0.6)',
  t55: 'rgba(255,255,255,0.55)',
  t50: 'rgba(255,255,255,0.5)',
  t45: 'rgba(255,255,255,0.45)',
  t40: 'rgba(255,255,255,0.4)',
  t35: 'rgba(255,255,255,0.35)',
  t30: 'rgba(255,255,255,0.3)',
  t28: 'rgba(255,255,255,0.28)',
  // brand + accents
  purple: '#7c3aed',
  purpleSoft: 'rgba(124,58,237,0.12)',
  violet: '#a78bfa',
  violetLt: '#c4b5fd',
  blue: '#60a5fa',
  green: '#34d399',
  greenDeep: '#10b981',
  teal: '#14b8a6',
  amber: '#fbbf24',
  amberDeep: '#f59e0b',
  pink: '#fb7185',
  rose: '#f43f5e',
  fuchsia: '#ec4899',
  fontStack:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
}

/** Glow radial mặc định của mọi màn (tím ở đỉnh). */
export const GLOW_PURPLE =
  'radial-gradient(ellipse 600px 400px at 50% 0%, rgba(120,100,255,0.06) 0%, transparent 70%)'
export const GLOW_TEAL =
  'radial-gradient(ellipse 600px 400px at 50% 0%, rgba(0,210,190,0.05) 0%, transparent 70%)'

/* ── Sidebar model ─────────────────────────────────────────────── */
export type NavBadge = { text: string; fg: string; bg: string; count?: boolean; border?: string }
export type NavItem = { label: string; active?: boolean; badge?: NavBadge; dim?: boolean; accent?: boolean }
export type NavSection = { title: string; items: NavItem[] }
export type SidebarUser = { initials: string; gradient: string; name: string; sub: string }
export type SidebarModel = {
  brandSub: string
  sections: NavSection[]
  user: SidebarUser
}

/* helper: badge presets dùng lại nhiều nơi */
export const badge = {
  ai: { text: 'AI', fg: C.violet, bg: 'rgba(124,58,237,0.15)' },
  live: { text: 'Live', fg: C.pink, bg: 'rgba(251,113,133,0.15)' },
  lms: { text: 'LMS', fg: C.violet, bg: 'rgba(124,58,237,0.15)' },
  lab: { text: 'Lab', fg: C.green, bg: 'rgba(52,211,153,0.15)' },
  iot: { text: 'IoT', fg: C.blue, bg: 'rgba(96,165,250,0.15)' },
  stem: { text: 'STEM', fg: C.amber, bg: 'rgba(251,191,36,0.15)' },
  hub: { text: 'Hub', fg: C.blue, bg: 'rgba(96,165,250,0.15)' },
  mcp: { text: 'MCP', fg: C.violet, bg: 'rgba(124,58,237,0.15)' },
  moi: { text: 'Mới', fg: C.violetLt, bg: 'rgba(124,58,237,0.2)' },
} satisfies Record<string, NavBadge>

/* ── Small atoms ───────────────────────────────────────────────── */
export function Pill({
  children,
  fg,
  bg,
  border,
  style,
}: {
  children: ReactNode
  fg: string
  bg?: string
  border?: string
  style?: CSSProperties
}) {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 99,
        color: fg,
        background: bg,
        border,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function NavBadgeView({ b }: { b: NavBadge }) {
  if (b.count) {
    return (
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 9,
          fontWeight: 800,
          minWidth: 16,
          height: 16,
          padding: '0 4px',
          borderRadius: 99,
          background: b.bg,
          color: b.fg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: b.border,
        }}
      >
        {b.text}
      </span>
    )
  }
  return (
    <span
      style={{
        marginLeft: 'auto',
        fontSize: 9.5,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 99,
        background: b.bg,
        color: b.fg,
      }}
    >
      {b.text}
    </span>
  )
}

function NavRow({ item }: { item: NavItem }) {
  const activeStyle: CSSProperties = item.active
    ? { background: C.purpleSoft, color: C.violet, fontWeight: 600 }
    : item.accent
    ? { color: C.violet, fontWeight: 600 }
    : { color: item.dim ? C.t45 : C.t55 }
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7.5px 10px',
        borderRadius: 9,
        fontSize: 12.5,
        cursor: 'default',
        ...activeStyle,
      }}
    >
      {item.label}
      {item.badge && <NavBadgeView b={item.badge} />}
    </span>
  )
}

/* ── Sidebar ───────────────────────────────────────────────────── */
export function Sidebar({ model }: { model: SidebarModel }) {
  return (
    <div
      style={{
        width: 236,
        borderRight: `1px solid ${C.border}`,
        background: C.surfaceSoft,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
      }}
    >
      {/* traffic lights */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <TrafficDot color="#ff5f57" />
        <TrafficDot color="#febc2e" />
        <TrafficDot color="#28c840" />
      </div>
      {/* brand */}
      <div style={{ padding: '6px 16px 16px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          A
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: C.t92 }}>
            AeroEdu Vision
          </span>
          <span style={{ display: 'block', fontSize: 10, color: C.t35 }}>{model.brandSub}</span>
        </span>
      </div>
      {/* nav */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          padding: '0 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {model.sections.map((sec, si) => (
          <div key={si} style={{ display: 'contents' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.1em',
                color: C.t28,
                textTransform: 'uppercase',
                padding: si === 0 ? '8px 10px 4px' : '12px 10px 4px',
              }}
            >
              {sec.title}
            </div>
            {sec.items.map((it, ii) => (
              <NavRow key={ii} item={it} />
            ))}
          </div>
        ))}
      </div>
      {/* user footer */}
      <div
        style={{
          padding: 12,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: model.user.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {model.user.initials}
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.t85 }}>
            {model.user.name}
          </span>
          <span style={{ display: 'block', fontSize: 10, color: C.t35 }}>{model.user.sub}</span>
        </span>
      </div>
    </div>
  )
}

function TrafficDot({ color }: { color: string }) {
  return <span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
}

/* ── Window frame ──────────────────────────────────────────────── */
/**
 * Khung cửa sổ desktop, chiếm toàn viewport (real-app feel).
 * children = mọi thứ bên phải sidebar (thường là <ContentColumn/>,
 * hoặc nhiều cột như màn Gia sư AI).
 */
export function DesktopWindow({
  sidebar,
  glow = GLOW_PURPLE,
  children,
}: {
  sidebar: SidebarModel
  glow?: string
  children: ReactNode
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.pageBg,
        fontFamily: C.fontStack,
        color: C.t85,
      }}
    >
      <div
        style={{
          height: '100vh',
          background: C.screenBg,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: glow }} />
        <Sidebar model={sidebar} />
        {children}
      </div>
    </div>
  )
}

/* ── Content column (topbar + body) ────────────────────────────── */
export function ContentColumn({
  topbar,
  children,
}: {
  topbar: ReactNode
  children: ReactNode
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 12,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        {topbar}
      </div>
      {children}
    </div>
  )
}

/* small reusable button-ish spans (chỉ trang trí, đúng mockup) */
export function GhostBtn({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        height: 30,
        padding: '0 14px',
        borderRadius: 8,
        border: `1px solid rgba(255,255,255,0.1)`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        color: C.t60,
        fontSize: 12,
        cursor: 'default',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function PrimaryBtn({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        height: 30,
        padding: '0 14px',
        borderRadius: 8,
        background: C.purple,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'default',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
