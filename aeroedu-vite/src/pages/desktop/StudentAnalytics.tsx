/** 2d — Học sinh · Phân tích học tập */
import { CSSProperties } from 'react'
import { C, ContentColumn, DesktopWindow, GhostBtn } from './ui'
import { studentSidebar } from './sidebars'

const cardBox: CSSProperties = { border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12 }

const subjects = [
  { icon: '💻', name: 'Programming', w: 90, bar: 'linear-gradient(90deg,#f59e0b,#f97316)', h: '12.4h' },
  { icon: '🔢', name: 'Toán', w: 74, bar: 'linear-gradient(90deg,#3b82f6,#6366f1)', h: '10.2h' },
  { icon: '⚛️', name: 'Vật lý', w: 60, bar: 'linear-gradient(90deg,#8b5cf6,#a855f7)', h: '8.3h' },
  { icon: '🧪', name: 'Hóa học', w: 44, bar: 'linear-gradient(90deg,#10b981,#14b8a6)', h: '6.1h' },
  { icon: '🤖', name: 'AI/ML', w: 40, bar: 'linear-gradient(90deg,#ec4899,#f43f5e)', h: '5.5h' },
]

// heatmap: 14 cột × 7 hàng, mã màu a/b/c/d/e (đúng mockup)
const HM: Record<string, string> = {
  a: 'rgba(124,58,237,0.12)', b: 'rgba(124,58,237,0.3)', c: 'rgba(124,58,237,0.55)', d: '#7c3aed', e: 'rgba(255,255,255,0.04)',
}
const heatmap =
  'bacbecd abbecac cbdabcb ecbcdba bdabcec cbcdabd acbcbdc badbcba dbcabcb cdbcabd bcadcbc abdcbdb cbcbdcd dcbcbdc'.split(' ')

export default function DesktopStudentAnalytics() {
  return (
    <DesktopWindow sidebar={studentSidebar('analytics')}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>Phân tích học tập</span>
            <span style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
              <span style={{ padding: '6px 14px', fontSize: 11.5, color: C.t50 }}>7 ngày</span>
              <span style={{ padding: '6px 14px', fontSize: 11.5, background: 'rgba(124,58,237,0.15)', color: C.violetLt, fontWeight: 600 }}>30 ngày</span>
              <span style={{ padding: '6px 14px', fontSize: 11.5, color: C.t50 }}>Học kỳ</span>
            </span>
            <GhostBtn>↓ Xuất báo cáo</GhostBtn>
          </>
        }
      >
        <div style={{ flex: 1, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            <Kpi label="Tổng giờ học" value="42.5h" delta="↑ 18% so tháng trước" deltaColor={C.green} />
            <Kpi label="Bài tập hoàn thành" value="67" delta="↑ 9 bài" deltaColor={C.green} />
            <Kpi label="Điểm quiz trung bình" value="8.2" valueColor={C.violet} delta="↓ 0.3" deltaColor={C.pink} />
            <Kpi label="Độ tập trung (AI)" value="86%" valueColor={C.green} delta="camera + hành vi" deltaColor={C.t35} />
          </div>

          {/* charts */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, minHeight: 0 }}>
            <div style={{ ...cardBox, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', flex: 1 }}>XP tích lũy — 30 ngày</span>
                <span style={{ fontSize: 10.5, color: C.t35 }}>tổng +4,820 XP</span>
              </div>
              <svg viewBox="0 0 600 200" style={{ flex: 1, width: '100%' }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="xpFill2d" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(124,58,237,0.35)" />
                    <stop offset="100%" stopColor="rgba(124,58,237,0)" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <path d="M0 170 L40 165 L80 150 L120 155 L160 138 L200 142 L240 120 L280 126 L320 105 L360 112 L400 88 L440 95 L480 70 L520 62 L560 48 L600 40 L600 200 L0 200 Z" fill="url(#xpFill2d)" />
                <path d="M0 170 L40 165 L80 150 L120 155 L160 138 L200 142 L240 120 L280 126 L320 105 L360 112 L400 88 L440 95 L480 70 L520 62 L560 48 L600 40" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="600" cy="40" r="4" fill="#a78bfa" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.t30, marginTop: 6 }}>
                <span>5/6</span><span>12/6</span><span>19/6</span><span>26/6</span><span>4/7</span>
              </div>
            </div>

            <div style={{ ...cardBox, padding: '18px 20px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>Giờ học theo môn</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {subjects.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, minWidth: 18 }}>{s.icon}</span>
                    <span style={{ fontSize: 11, color: C.t65, minWidth: 78 }}>{s.name}</span>
                    <span style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', width: `${s.w}%`, height: '100%', background: s.bar }} />
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.t60 }}>{s.h}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: C.t45, lineHeight: 1.6 }}>✦ AI nhận xét: bạn học đều nhưng <span style={{ color: C.pink }}>quiz Vật lý giảm nhẹ</span> — nên ưu tiên ôn Giao thoa sóng tuần này.</div>
              </div>
            </div>
          </div>

          {/* heatmap */}
          <div style={{ ...cardBox, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', flex: 1 }}>Bản đồ hoạt động — 20 tuần</span>
              <span style={{ fontSize: 10, color: C.t35, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                Ít
                <LegendSq c={HM.a} /><LegendSq c={HM.b} /><LegendSq c={HM.c} /><LegendSq c={HM.d} />
                Nhiều
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7,10px)', gridAutoFlow: 'column', gridAutoColumns: '10px', gap: 3 }}>
              {heatmap.map((colStr, ci) =>
                colStr.split('').map((k, ri) => (
                  <span key={`${ci}-${ri}`} style={{ borderRadius: 2, background: HM[k] }} />
                ))
              )}
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function Kpi({ label, value, valueColor = C.t92, delta, deltaColor }: { label: string; value: string; valueColor?: string; delta: string; deltaColor: string }) {
  return (
    <div style={{ ...cardBox, padding: 16 }}>
      <span style={{ display: 'block', fontSize: 11, color: C.t40, marginBottom: 6 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: valueColor }}>{value}</span>
      <span style={{ fontSize: 10.5, color: deltaColor, marginLeft: 8 }}>{delta}</span>
    </div>
  )
}

function LegendSq({ c }: { c: string }) {
  return <span style={{ width: 9, height: 9, borderRadius: 2, background: c }} />
}
