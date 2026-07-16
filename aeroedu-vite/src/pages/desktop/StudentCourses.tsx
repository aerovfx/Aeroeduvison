/** 2b — Học sinh · Khóa học của tôi (LMS) */
import { C, ContentColumn, DesktopWindow, PrimaryBtn } from './ui'
import { studentSidebar } from './sidebars'

type Course = {
  emoji: string
  grad: string
  topBadges?: { text: string; fg: string; bg: string; left?: boolean }[]
  title: string
  meta: string
  pct: number
  bar: string
  pctColor: string
  faded?: boolean
}

const courses: Course[] = [
  {
    emoji: '⚛️', grad: 'linear-gradient(135deg,rgba(139,92,246,0.4),rgba(59,130,246,0.3))',
    topBadges: [
      { text: '12 chương', fg: C.violetLt, bg: 'rgba(0,0,0,0.4)', left: true },
      { text: 'Đang học', fg: '#fff', bg: 'rgba(251,113,133,0.9)' },
    ],
    title: 'Vật lý 12 — Kết nối tri thức', meta: 'GV Trần Hoàng · 96 bài học · 24 quiz',
    pct: 38, bar: 'linear-gradient(90deg,#8b5cf6,#a855f7)', pctColor: C.violet,
  },
  {
    emoji: '💻', grad: 'linear-gradient(135deg,rgba(245,158,11,0.4),rgba(249,115,22,0.3))',
    topBadges: [{ text: '8 module', fg: '#fcd34d', bg: 'rgba(0,0,0,0.4)', left: true }],
    title: 'Python Course — Cơ bản đến OOP', meta: 'AeroEdu · 64 bài học · 18 bài lab',
    pct: 62, bar: 'linear-gradient(90deg,#f59e0b,#f97316)', pctColor: C.amber,
  },
  {
    emoji: '🧪', grad: 'linear-gradient(135deg,rgba(16,185,129,0.4),rgba(20,184,166,0.3))',
    topBadges: [{ text: '7 chương', fg: '#6ee7b7', bg: 'rgba(0,0,0,0.4)', left: true }],
    title: 'Hóa học 12 — Chân trời sáng tạo', meta: 'GV Lê Thu · 72 bài học · 30 quiz',
    pct: 20, bar: 'linear-gradient(90deg,#10b981,#14b8a6)', pctColor: C.green,
  },
  {
    emoji: '🤖', grad: 'linear-gradient(135deg,rgba(236,72,153,0.4),rgba(244,63,94,0.3))',
    topBadges: [
      { text: '6 module', fg: '#f9a8d4', bg: 'rgba(0,0,0,0.4)', left: true },
      { text: 'AI', fg: '#fff', bg: 'rgba(124,58,237,0.9)' },
    ],
    title: 'AI & LLM — Kỹ năng thời đại mới', meta: 'AeroEdu · 42 bài học · 12 dự án',
    pct: 45, bar: 'linear-gradient(90deg,#ec4899,#f43f5e)', pctColor: '#f472b6',
  },
  {
    emoji: '🔢', grad: 'linear-gradient(135deg,rgba(96,165,250,0.35),rgba(99,102,241,0.25))',
    topBadges: [{ text: '✓ Hoàn thành', fg: '#fff', bg: 'rgba(52,211,153,0.9)' }],
    title: 'Toán 12 — Giải tích nâng cao', meta: 'GV Ngô Minh · điểm cuối khóa 9.2',
    pct: 100, bar: 'linear-gradient(90deg,#34d399,#14b8a6)', pctColor: C.green, faded: true,
  },
]

export default function DesktopStudentCourses() {
  return (
    <DesktopWindow sidebar={studentSidebar('courses')}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>Khóa học của tôi</span>
            <span style={{ flex: 1 }} />
            <span style={{ width: 260, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'inline-flex', alignItems: 'center', padding: '0 10px', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.t35, flex: 1 }}>Tìm khóa học…</span>
              <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: C.t45 }}>⌘K</span>
            </span>
            <PrimaryBtn>Khám phá thêm</PrimaryBtn>
          </>
        }
      >
        <div style={{ flex: 1, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tab active>Đang học · 4</Tab>
            <Tab>Hoàn thành · 7</Tab>
            <Tab>Yêu thích · 3</Tab>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: C.t40 }}>Sắp xếp: Hoạt động gần nhất ▾</span>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '1fr 1fr', gap: 16, minHeight: 0 }}>
            {courses.map((c, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: c.faded ? 0.75 : 1 }}>
                <div style={{ flex: 1, background: c.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, position: 'relative' }}>
                  {c.emoji}
                  {c.topBadges?.map((b, bi) => (
                    <span key={bi} style={{ position: 'absolute', top: 10, [b.left ? 'left' : 'right']: 10, fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: b.bg, color: b.fg } as React.CSSProperties}>{b.text}</span>
                  ))}
                </div>
                <div style={{ padding: '15px 16px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t92, marginBottom: 3 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: C.t40, marginBottom: 10 }}>{c.meta}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', width: `${c.pct}%`, height: '100%', background: c.bar }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.pctColor }}>{c.pct}%</span>
                  </div>
                </div>
              </div>
            ))}

            {/* discover card */}
            <div style={{ border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.violet, fontSize: 22 }}>+</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.t60 }}>Khám phá khóa học mới</span>
              <span style={{ fontSize: 10.5, color: C.t35 }}>AI gợi ý theo lộ trình của bạn</span>
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function Tab({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span style={{ height: 32, padding: '0 16px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', fontSize: 12, ...(active ? { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: C.violetLt, fontWeight: 600 } : { border: '1px solid rgba(255,255,255,0.08)', color: C.t50 }) }}>{children}</span>
  )
}
